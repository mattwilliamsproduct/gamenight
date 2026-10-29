import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';

const require = createRequire(import.meta.url);
const Records = require('../public/assets/records-logic.js');
const Scorebook = require('../public/assets/scorebook.js');

const helpers = {
  configs: Object.fromEntries(Records.GAMES.map((game) => [game.id, {winLow: game.winLow}])),
  getDisplayPlayers(match) {
    return (match.originalRoster || Object.keys(match.totals || {})).filter(Boolean);
  },
  sortPlayersByTotal(players, totals, cfg) {
    return [...players].sort((a, b) => {
      const diff = cfg.winLow ? (totals[a] || 0) - (totals[b] || 0) : (totals[b] || 0) - (totals[a] || 0);
      return diff || String(a).localeCompare(String(b));
    });
  },
  competitionPlaces: Scorebook.competitionPlaces,
  scorebook: Scorebook
};

function paintHtml(history, pane = 'overview', extra = {}) {
  const view = {classList: {contains: () => false}, className: '', dataset: {}, innerHTML: ''};
  const completed = (history || []).filter((match) => Scorebook.isCompletedHistoryMatch(match));
  Records.paint({
    view,
    table: {history: history || []},
    pane,
    hall: extra.hall || {},
    data: {
      completed,
      allTime: {mostWins: [], bestWinRate: [], mostGames: [], mostLasts: [], longestWinningStreak: null, longestLosingStreak: null, longestNoLastStreak: null},
      games: Object.fromEntries(Records.GAMES.map((game) => [game.id, {}])),
      playerCards: [],
      rivalries: {top: [], lopsided: []},
      shameAwards: [],
      ...extra
    },
    scorebook: Scorebook,
    configs: helpers.configs,
    getDisplayPlayers: helpers.getDisplayPlayers,
    sortPlayersByTotal: helpers.sortPlayersByTotal,
    competitionPlaces: helpers.competitionPlaces,
    escapeHtml(value) { return String(value == null ? '' : value); },
    getAvatarImg() { return ''; },
    compact: false
  });
  return view.innerHTML;
}

test('ledger night count is singular for one night', () => {
  assert.equal(Records.formatNightCount(1), '1 night');
  assert.equal(Records.formatNightCount(0), '0 nights');
  assert.equal(Records.formatNightCount(2), '2 nights');
  assert.equal(Records.formatNightCount(11), '11 nights');
  assert.equal(Records.formatCompletedMatches(1), '1 completed match');
  assert.equal(Records.formatCompletedMatches(2), '2 completed matches');
  assert.equal(Records.SINGLE_MATCH_BID_RATE_MIN, 5);
  assert.equal(Records.singleMatchBidRateEligible(1), false);
  assert.equal(Records.singleMatchBidRateEligible(4), false);
  assert.equal(Records.singleMatchBidRateEligible(5), true);
});

test('records copy uses singular nouns for a count of one', () => {
  assert.equal(Records.formatPlural(1, 'win'), '1 win');
  assert.equal(Records.formatPlural(2, 'win'), '2 wins');
  assert.equal(Records.formatWinsGames(1, 1), '1 win · 1 game');
  assert.equal(Records.formatWinsGames(2, 3), '2 wins · 3 games');
  assert.equal(Records.formatPlural(1, 'game'), '1 game');
  assert.equal(Records.formatPlural(1, 'straight last-place finish', 'straight last-place finishes'), '1 straight last-place finish');
  assert.equal(Records.formatPlural(2, 'straight last-place finish', 'straight last-place finishes'), '2 straight last-place finishes');
});

test('hidden Rook stays off the championship ledger', () => {
  const ids = Records.visibleRecordGames().map((game) => game.id);
  assert.ok(!ids.includes('Rook'));
  assert.ok(ids.includes('Five Crowns'));
  assert.ok(ids.includes('Beat the Heat'));
  assert.ok(ids.includes('Hand and Foot'));
});

test('completed Hand and Foot nights appear as Canasta on Records', () => {
  const canasta = Records.GAMES.find((game) => game.id === 'Hand and Foot');
  assert.ok(canasta);
  assert.equal(canasta.title, 'Canasta');
  assert.equal(Records.gameTitle('Hand and Foot'), 'Canasta');
  const book = QA_SCENARIOS['records-book'].data.history.filter((row) => row.game === 'Hand and Foot' && row.completed !== false);
  assert.ok(book.length >= 1);
  const html = paintHtml(QA_SCENARIOS['records-book'].data.history, 'overview');
  assert.match(html, /Canasta/);
  assert.match(html, /Hall of Fame/);
  assert.match(html, /16 completed matches/);
  assert.doesNotMatch(html, /Game Championship Ledger/);
  assert.doesNotMatch(html, /Unassisted matches only on best final/);
  assert.match(paintHtml(QA_SCENARIOS['records-book'].data.history, 'explore'), /Unassisted matches only/);
  const nights = paintHtml(QA_SCENARIOS['records-book'].data.history, 'nights');
  assert.match(nights, /Canasta/);
  assert.match(nights, /Left early/);
  assert.doesNotMatch(nights, /Retired/);
});

test('completed Rook history appears on Records without unhiding the start card', () => {
  const rook = {
    id: 2,
    game: 'Rook',
    date: '10/20/2026',
    completed: true,
    totals: {Ann: 110, Bo: 90},
    winners: ['Ann'],
    originalRoster: ['Ann', 'Bo'],
    rounds: [{round: 1, scores: {Ann: 110, Bo: 90}}]
  };
  assert.ok(Records.visibleRecordGames([rook]).some((game) => game.id === 'Rook'));
  assert.ok(!Records.visibleRecordGames([{...rook, completed: false}]).some((game) => game.id === 'Rook'));
  const html = paintHtml([rook], 'overview');
  assert.match(html, />Rook</);
});

test('win rate always prints the denominator and hides thin samples from the lead', () => {
  assert.equal(Records.formatWinRate(9, 20), '45% · 9 of 20');
  assert.equal(Records.formatWinRateDenom(9, 20), '9 of 20');
  assert.equal(Records.formatWinRate(1, 1), '100% · 1 of 1');
  assert.equal(Records.winRateEligible(1), false);
  assert.equal(Records.winRateEligible(5), true);
  assert.equal(Records.WIN_RATE_MIN_GAMES, 5);
  const ranked = Records.rankWinRates([
    {name: 'One-game', wins: 1, games: 1},
    {name: 'Solid', wins: 9, games: 20},
    {name: 'Also solid', wins: 9, games: 20}
  ]);
  assert.equal(ranked.ties.length, 2);
  assert.deepEqual(ranked.ties.map((row) => row.name).sort(), ['Also solid', 'Solid']);
  assert.equal(ranked.label, '45% · 9 of 20');
  assert.ok(!ranked.ties.some((row) => row.name === 'One-game'));
});

test('tied records keep every name', () => {
  const first = Records.keepBestWithTies(null, {player: 'Matt', value: 42}, (a, b) => a.value > b.value);
  const tied = Records.keepBestWithTies(first, {player: 'Cat', value: 42}, (a, b) => a.value > b.value);
  assert.equal(tied.ties.length, 2);
  assert.equal(Records.formatTiedNames(tied.ties), 'Matt and Cat');
  const again = Records.keepBestWithTies(tied, {player: 'Matt', value: 42}, (a, b) => a.value > b.value);
  assert.equal(again.ties.length, 2);
  const three = Records.keepBestWithTies(tied, {player: 'Megan', value: 42}, (a, b) => a.value > b.value);
  assert.equal(three.ties.length, 3);
  assert.equal(Records.recordHolderText(three, true), 'Matt and Cat + 1 more');
  assert.equal(Records.recordHolderText(three), 'Matt, Cat, and Megan');
  const better = Records.keepBestWithTies(tied, {player: 'Megan', value: 50}, (a, b) => a.value > b.value);
  assert.equal(better.player, 'Megan');
  assert.equal(better.ties.length, 1);
});

test('past nights sort by real date, newest first, and group one evening', () => {
  const nights = [
    {id: 1, date: '7/7/2026', game: '818'},
    {id: 2, date: '7/18/2026', game: 'Wizard'},
    {id: 3, date: '7/18/2026', game: 'Five Crowns'}
  ];
  const sorted = Records.sortNights(nights);
  assert.deepEqual(sorted.map((row) => row.date), ['7/18/2026', '7/18/2026', '7/7/2026']);
  assert.ok(sorted[0].id > sorted[2].id);
  const groups = Records.groupNightsByEvening(nights);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].matches.length, 2);
  assert.match(groups[0].label, /July 18, 2026/);
  assert.equal(groups[1].matches[0].date, '7/7/2026');
});

test('completed matches do not get Resume', () => {
  const done = {completed: true, winners: ['Matt'], totals: {Matt: 10, Cat: 4}, game: 'Wizard', originalRoster: ['Matt', 'Cat'], rounds: []};
  const open = {completed: false, winners: [], totals: {Matt: 10, Cat: 4}, game: 'Wizard', originalRoster: ['Matt', 'Cat'], rounds: [{round: 1, scores: {Matt: 10, Cat: 4}}], currentRound: 2};
  assert.equal(Records.shouldShowResume(done, Scorebook), false);
  assert.equal(Records.shouldShowResume(open, Scorebook), true);
  const doneCard = Records.nightCardModel(done, helpers);
  const openCard = Records.nightCardModel(open, helpers);
  assert.equal(doneCard.showResume, false);
  assert.equal(doneCard.showFinal, true);
  assert.equal(doneCard.winnerText, 'Matt won');
  assert.equal(openCard.showResume, true);
  assert.equal(openCard.showFinal, false);
  assert.equal(openCard.winnerText, '');
  assert.match(String(openCard.throughRound), /1/);
});

test('joint winners stay joint on the night card', () => {
  const match = QA_SCENARIOS['demo-seed'].data.history.find((row) => (row.winners || []).length > 1);
  assert.ok(match, 'demo-seed needs a joint win');
  const card = Records.nightCardModel(match, helpers);
  assert.ok(card.winners.length > 1);
  assert.match(card.winnerText, / and /);
  assert.match(card.winnerText, /won$/);
  const listed = card.standings.filter((row) => row.isWinner).map((row) => row.name);
  assert.ok(listed.length > 1);
  assert.equal(card.winnerText, `${listed[0]} and ${listed[1]} won`);
});

test('demo-seed past nights include an incomplete match', () => {
  const history = QA_SCENARIOS['demo-seed'].data.history;
  const incomplete = history.filter((row) => row.completed === false);
  assert.ok(incomplete.length >= 1);
  const card = Records.nightCardModel(incomplete[0], helpers);
  assert.equal(card.incomplete, true);
  assert.equal(card.showResume, true);
  assert.equal(card.winnerText, '');
});

function pairLead(history, a, b) {
  const map = Records.collectPairFinishes(history, {isCompleted: (match) => Scorebook.isCompletedHistoryMatch(match)});
  const pair = map[Records.pairKey(a, b)];
  return pair ? Records.headToHeadLead(pair) : null;
}

test('head-to-head uses who finished ahead, and Matt leads Cat in the demo book', () => {
  const demo = pairLead(QA_SCENARIOS['demo-seed'].data.history, 'Matt', 'Cat');
  const porch = pairLead(QA_SCENARIOS['home-party'].data.history, 'Matt', 'Cat');
  assert.ok(demo);
  assert.ok(porch);
  // Pair names stay alphabetical (Cat, Matt). aWins is Cat. Matt has 11.
  // An audit that prints `${a} leads ${max}-${min}` would wrongly say Cat leads.
  assert.equal(demo.leader, 'Matt');
  assert.equal(demo.text, 'Matt leads 11-4');
  assert.equal(porch.leader, 'Matt');
  assert.equal(porch.text, 'Matt leads 11-5');
  const swapped = Records.headToHeadLead({a: 'Cat', b: 'Matt', aWins: 11, bWins: 7, together: 18});
  assert.equal(swapped.text, 'Cat leads 11-7');
  const mattLeads = Records.headToHeadLead({a: 'Cat', b: 'Matt', aWins: 7, bWins: 11, together: 18});
  assert.equal(mattLeads.text, 'Matt leads 11-7');
});

test('Life Preserver places gained stop at the spin', () => {
  const match = {
    game: '818',
    date: '10/19/2026',
    originalRoster: ['Matt', 'Cat', 'Mike', 'Duke'],
    totals: {Matt: 40, Cat: 20, Mike: 10, Duke: 32},
    rounds: [
      {round: 1, scores: {Matt: 20, Cat: 20, Mike: 10, Duke: 8}},
      {round: 0, hailMaryBonus: true, scores: {Duke: 12}},
      {round: 2, scores: {Matt: 20, Cat: 0, Mike: 0, Duke: 12}}
    ]
  };
  const events = Records.lifePreserverEvents([match], helpers);
  assert.equal(events.length, 1);
  assert.equal(events[0].player, 'Duke');
  assert.equal(events[0].adjustment, 12);
  assert.ok(events[0].placesGained >= 0);
  assert.ok(events[0].placeAfter <= events[0].placeBefore);
});

test('comeback stats stay off without stored round.comeback data', () => {
  const demo = QA_SCENARIOS['demo-seed'].data.history;
  assert.equal(Records.shouldShowComebackStats(demo), false);
  assert.equal(Records.shouldShowComebackStats([{rounds: [{comeback: {Matt: 8}}]}]), true);
});

test('exact-bid rates print a percent sign', () => {
  assert.equal(Records.formatStatValue(100, 'Best career exact-bid rate'), '100%');
  assert.equal(Records.formatStatValue(67, 'Best single-match exact rate'), '67%');
  assert.equal(Records.formatStatValue(4, 'Most exact bids · Wizard'), '4');
  assert.equal(Records.scoreLabel(100, '%'), '100%');
});

test('818 Brick is retired as a primary Shame label', () => {
  const brick = Records.SHAME_CATALOG.find((row) => row.oldName === 'The 818 Brick');
  assert.ok(brick);
  assert.equal(brick.name, 'Worst final score · 818');
  assert.equal(brick.subtitle, '');
  const crash = Records.SHAME_CATALOG.find((row) => row.id === 'fc-worst-round');
  assert.equal(crash.name, 'Highest single-round score');
  assert.equal(crash.subtitle, 'Crash and Burn');
});

test('Explore copy hides catch-alls and moves positive records out of Shame', () => {
  const awards = Records.buildShameAwards({
    games: {},
    allTime: {longestWinningStreak: {player: 'Matt', value: 4}}
  }, [{name: 'Cat', wins: 0, games: 9, longestLast: 2}], {Cat: {busted: 3}});
  const ids = awards.map((row) => row.id);
  assert.ok(!ids.includes('no-wins'));
  assert.ok(!ids.includes('wizard-exact'));
  assert.ok(!ids.includes('comeback-wins'));
  assert.ok(!ids.includes('win-streak'));
  const html = paintHtml(QA_SCENARIOS['records-book'].data.history, 'explore', {
    rivalries: {
      top: [{a: 'Cat', b: 'Matt', aWins: 4, bWins: 11, together: 16}],
      lopsided: [{a: 'Cat', b: 'Matt', aWins: 2, bWins: 8, together: 10}]
    },
    playerCards: [{player: 'Matt', wins: 8, games: 15, currentStreak: 'W2'}]
  });
  assert.match(html, /Bid accuracy/);
  assert.match(html, /Longest stretch without a win/);
  assert.match(html, /Highest head-to-head win rate/);
  assert.match(html, /View player profiles/);
  assert.match(html, /Highest final-round score|Best 4-player final score|Best career exact-bid rate/);
  assert.doesNotMatch(html, /More from the book/);
  assert.doesNotMatch(html, /Longest losing streak/);
  assert.doesNotMatch(html, /Most games without a win/);
  assert.doesNotMatch(html, /Rook bids won/);
  assert.doesNotMatch(html, /stored-halftime/);
  assert.doesNotMatch(html, /stored Turbo/);
  assert.doesNotMatch(html, /This is not a second dashboard/);
  assert.doesNotMatch(html, /Biggest final-round swing/);
  assert.doesNotMatch(html, />career</);
  assert.doesNotMatch(html, /busts/);
});

test('head-to-head scoreline names ties and the rate denominator', () => {
  const lead = Records.headToHeadLead({a: 'Linda', b: 'Matt', aWins: 2, bWins: 4, together: 7});
  assert.equal(lead.scoreline, 'Linda 2 · Matt 4 · Tied 1');
  assert.equal(lead.leader, 'Matt');
  assert.equal(lead.ties, 1);
  assert.equal(lead.text, 'Matt leads 4-2');
});

test('addendum labels stay relabel-only', () => {
  const book = QA_SCENARIOS['records-book'].data.history;
  const overview = paintHtml(book, 'overview');
  const explore = paintHtml(book, 'explore', {
    rivalries: {
      top: [{a: 'Linda', b: 'Matt', aWins: 2, bWins: 4, together: 7}],
      lopsided: [{a: 'Linda', b: 'Matt', aWins: 2, bWins: 4, together: 7}]
    },
    playerCards: [{player: 'Matt', wins: 8, games: 15, currentStreak: 'W2'}],
    games: {
      ...Object.fromEntries(Records.GAMES.map((game) => [game.id, {}])),
      Wizard: {
        bestExactRateSingleGame: {player: 'Cat', value: 80, label: '8 of 10 bids', date: '10/19/2026'}
      },
      'Hand and Foot': {
        closestMargin: {player: 'Matt', value: 0, label: 'Matt by 0 over Megan'},
        bestGame: {player: 'Matt', value: 4577}
      },
      Rook: {
        closestMargin: {player: 'Matt', value: 0, label: 'Matt by 0 over Megan'},
        bestGame: {player: 'Matt', value: 110}
      }
    }
  });
  assert.match(overview, />Overview</);
  assert.match(overview, /Explore<span class="s2-tab-rest"> records<\/span>/);
  assert.match(overview, />Past nights</);
  assert.doesNotMatch(overview, /Unassisted matches only on best final/);
  assert.match(explore, /Unassisted matches only/);
  assert.match(explore, /8 of 10 bids/);
  assert.match(explore, /Best single-match exact rate/);
  assert.match(explore, /Linda 2 · Matt 4 · Tied 1/);
  assert.match(explore, /Places gained are measured immediately after each spin/);
  assert.doesNotMatch(explore, /won because of the wheel|the wheel caused/);
  assert.match(explore, /View player profiles/);
  assert.doesNotMatch(explore, /This is not a second dashboard/);
  assert.doesNotMatch(explore, /Matt by 0 over Megan/);
  const nights = paintHtml(book, 'nights');
  assert.match(nights, /Left early/);
  assert.doesNotMatch(nights, /Retired/);
  assert.match(nights, /Resume/);
});

test('Life Preserver totals skip incomplete matches and stay per game', () => {
  const done = {
    game: '818',
    date: '10/19/2026',
    completed: true,
    originalRoster: ['Matt', 'Cat', 'Mike', 'Duke'],
    totals: {Matt: 40, Cat: 20, Mike: 10, Duke: 32},
    rounds: [
      {round: 1, scores: {Matt: 20, Cat: 20, Mike: 10, Duke: 8}},
      {round: 0, hailMaryBonus: true, scores: {Duke: 12}}
    ]
  };
  const open = {...done, completed: false, game: 'Wizard'};
  const events = Records.lifePreserverEvents([done, open], helpers);
  assert.equal(events.length, 1);
  assert.equal(events[0].game, '818');
  const summary = Records.lifePreserverSummary([
    {player: 'Duke', game: '818', adjustment: 12, placesGained: 1},
    {player: 'Duke', game: 'Wizard', adjustment: 8, placesGained: 1}
  ]);
  assert.equal(summary.length, 2);
  assert.ok(summary.every((row) => row.game === '818' || row.game === 'Wizard'));
  assert.equal(summary.find((row) => row.game === '818').adjustment, 12);
});
