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

test('818 Brick is retired as a primary Shame label', () => {
  const brick = Records.SHAME_CATALOG.find((row) => row.oldName === 'The 818 Brick');
  assert.ok(brick);
  assert.equal(brick.name, 'Worst final score · 818');
  assert.equal(brick.subtitle, '');
  const crash = Records.SHAME_CATALOG.find((row) => row.id === 'fc-worst-round');
  assert.equal(crash.name, 'Highest single-round score');
  assert.equal(crash.subtitle, 'Crash and Burn');
});
