import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {validateGameFixture, validateScenario, wizardScore} from '../public/qa/fixture-rules.mjs';
import {buildDemoBook} from '../public/demo/try-demo-cast.mjs';
import {buildDemoRecordNights} from '../public/demo/try-demo-records.mjs';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');
const Records = require('../public/assets/records-logic.js');

test('demo record nights stay out of QA fixtures', () => {
  const qa = QA_SCENARIOS['demo-seed'].data.history || [];
  assert.equal(qa.some((row) => row && row.id === 1786100000001), false);
  const issues = validateScenario('demo-seed', QA_SCENARIOS['demo-seed']);
  assert.deepEqual(issues, [], issues.join('\n'));
});

test('seeded demo nights are legal and have no planted record fields', () => {
  const nights = buildDemoRecordNights();
  nights.forEach((night) => {
    const blob = JSON.stringify(night);
    assert.equal(Object.hasOwn(night, 'bestScore'), false, `${night.id} planted bestScore`);
    assert.equal(Object.hasOwn(night, 'winRate'), false, `${night.id} planted winRate`);
    assert.doesNotMatch(blob, /mostWins|bestWinRate|longestWinningStreak/);
    const issues = validateGameFixture(night, `demo-night ${night.id} ${night.game}`);
    assert.deepEqual(issues, [], issues.join('\n'));
  });
});

test('incomplete demo nights do not count until finished', () => {
  const book = buildDemoBook(QA_SCENARIOS);
  const interrupted = (book.history || []).find((row) => row && row.id === 1786100000007);
  assert.ok(interrupted);
  assert.equal(interrupted.completed, false);
  assert.equal(Scorebook.isCompletedHistoryMatch(interrupted), false);
  assert.equal(Scorebook.isFullGame(interrupted), false);
  const completed = (book.history || []).filter((row) => Scorebook.isCompletedHistoryMatch(row));
  assert.equal(completed.some((row) => row.id === 1786100000007), false);
});

test('assisted demo nights count per existing records rules', () => {
  const book = buildDemoBook(QA_SCENARIOS);
  const assisted = (book.history || []).find((row) => row && row.id === 1786100000008);
  assert.ok(assisted);
  assert.equal(Scorebook.isAssistedMatch(assisted), true);
  assert.equal(Scorebook.isCompletedHistoryMatch(assisted), true);
  assert.equal(Scorebook.isFullGame(assisted), false);
  const full = (book.history || []).find((row) => row && row.id === 1786100000001);
  assert.ok(full);
  assert.equal(Scorebook.isFullGame(full), true);
  assert.equal(Scorebook.isAssistedMatch(full), false);
});

test('demo book exposes honest full nights for the real records functions', () => {
  const book = buildDemoBook(QA_SCENARIOS);
  const ids = (book.history || []).map((row) => row && row.id);
  assert.ok(ids.includes(1786100000001));
  assert.ok(ids.includes(1786100000002));
  assert.ok(ids.includes(1786100000003));
  assert.ok(ids.includes(1786100000004));
  assert.ok(ids.includes(1786100000005));
  assert.ok(ids.includes(1786100000006));
  const five = book.history.find((row) => row.id === 1786100000001);
  const fromRounds = {};
  five.originalRoster.forEach((name) => { fromRounds[name] = 0; });
  five.rounds.forEach((round) => {
    Object.entries(round.scores || {}).forEach(([name, score]) => {
      fromRounds[name] += Number(score) || 0;
    });
  });
  assert.deepEqual(five.totals, fromRounds);
  assert.deepEqual(five.winners, ['Nora']);
  const painted = {classList: {contains: () => false}, className: '', dataset: {}, innerHTML: ''};
  Records.paint({
    view: painted,
    table: book,
    pane: 'overview',
    hall: {},
    data: {
      completed: book.history.filter((row) => Scorebook.isCompletedHistoryMatch(row)),
      allTime: {mostWins: [], bestWinRate: [], mostGames: []},
      games: {},
      rivalries: {top: [], all: []},
      shameAwards: []
    },
    scorebook: Scorebook,
    configs: Object.fromEntries(Records.GAMES.map((game) => [game.id, {winLow: game.winLow}])),
    getDisplayPlayers(match) { return match.originalRoster || []; },
    sortPlayersByTotal(players, totals, cfg) {
      return [...players].sort((a, b) => (cfg.winLow ? (totals[a] || 0) - (totals[b] || 0) : (totals[b] || 0) - (totals[a] || 0)));
    },
    competitionPlaces: Scorebook.competitionPlaces,
    escapeHtml(value) { return String(value == null ? '' : value); },
    getAvatarImg() { return ''; }
  });
  assert.match(painted.innerHTML, /In progress/);
  assert.match(painted.innerHTML, /Finished nights/);
  const assistedCard = Records.nightCardHtml(Records.nightCardModel(book.history.find((row) => row.id === 1786100000008), {
    configs: Object.fromEntries(Records.GAMES.map((game) => [game.id, {winLow: game.winLow}])),
    getDisplayPlayers(match) { return match.originalRoster || []; },
    sortPlayersByTotal(players, totals, cfg) {
      return [...players].sort((a, b) => (cfg.winLow ? (totals[a] || 0) - (totals[b] || 0) : (totals[b] || 0) - (totals[a] || 0)));
    },
    competitionPlaces: Scorebook.competitionPlaces,
    scorebook: Scorebook
  }), {
    escapeHtml(value) { return String(value == null ? '' : value); },
    getAvatarImg() { return ''; }
  });
  assert.match(assistedCard, /The wheel was used/);
  assert.match(assistedCard, /Best-score records skip this night/);
});

test('demo Flip 7 has a tight finish and a multi-zero night', () => {
  const nights = buildDemoRecordNights().filter((night) => night.game === 'Flip 7 Vengeance' && night.completed);
  assert.ok(nights.length >= 1);
  const margins = nights.map((night) => {
    const values = Object.values(night.totals || {}).map(Number).sort((a, b) => b - a);
    return values[0] - values[1];
  });
  assert.ok(Math.min(...margins) <= 12, `closest Flip 7 margin ${Math.min(...margins)}`);
  const zeros = nights.map((night) => Math.max(...(night.originalRoster || []).map((player) => (
    (night.rounds || []).filter((round) => !round.hailMaryBonus && Number(round.scores?.[player]) === 0).length
  ))));
  assert.ok(Math.max(...zeros) >= 3, `most Flip 7 zeros ${Math.max(...zeros)}`);
});

test('demo Wizard nights use real scoring and plausible finals', () => {
  const nights = buildDemoRecordNights().filter((night) => night.game === 'Wizard');
  assert.equal(nights.length, 2);
  nights.forEach((night) => {
    const expectedRounds = Math.floor(60 / night.originalRoster.length);
    assert.equal(night.rounds.length, expectedRounds, `${night.id} round count`);
    night.rounds.forEach((round) => {
      const tricks = round.round;
      const actualSum = night.originalRoster.reduce((sum, player) => sum + Number(round.actuals?.[player] || 0), 0);
      assert.equal(actualSum, tricks, `${night.id} R${tricks} actuals`);
      night.originalRoster.forEach((player) => {
        assert.equal(round.scores[player], wizardScore(round.bids[player], round.actuals[player]), `${night.id} ${player} R${tricks}`);
      });
    });
    const max = Math.max(...Object.values(night.totals).map(Number));
    const min = Math.min(...Object.values(night.totals).map(Number));
    assert.ok(max >= 80 && max <= 400, `${night.id} winner ${max}`);
    assert.ok(min >= -80 && min <= 350, `${night.id} low ${min}`);
  });
});
