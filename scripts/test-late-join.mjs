import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');
const Life = require('../public/assets/life-preserver-logic.js');

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

function crowns(extraRound) {
  const players = ['Ann', 'Bea', 'Cal', 'Dee', 'Eve'];
  const rounds = [1, 2, 3, 4].map(round => ({
    round,
    scores: { Ann: round === 1 ? 10 : 0, Bea: 100, Cal: 125, Dee: 150 }
  }));
  const game = {
    name: 'Five Crowns',
    game: 'Five Crowns',
    ruleset: Scorebook.LIFE_PRESERVER_WIN_RULE,
    originalRoster: players.slice(),
    rounds,
    currentRound: 5,
    maxRounds: 11,
    hailMaryUsed: [],
    retired: [],
    totals: {}
  };
  const seated = ['Ann', 'Bea', 'Cal', 'Dee'].map(player => (
    rounds.reduce((sum, round) => sum + (Number(round.scores[player]) || 0), 0)
  ));
  Scorebook.recordLateJoin(game, 'Eve', seated, 5);
  if (extraRound) {
    extraRound.scores.Eve = extraRound.scores.Eve || 0;
    rounds.push(extraRound);
    game.currentRound = 6;
  }
  Scorebook.recomputeTotals(game);
  return game;
}

test('a fractional average start rounds up, and an even average stays put', () => {
  assert.equal(Scorebook.ceilingAverage([100, 100, 100, 100, 100, 100, 100, 100]), 100);
  assert.equal(Scorebook.ceilingAverage([97, 98]), 98);
  assert.equal(Scorebook.ceilingAverage([97.5]), 98);
  assert.equal(Scorebook.ceilingAverage([97.1]), 98);
  assert.equal(Scorebook.ceilingAverage([40, 60]), 50);
  assert.equal(Scorebook.ceilingAverage([-5, 0]), -2);
});

test('the start is one adjustment, missed rounds say Did not play, and the total includes it', () => {
  const game = crowns();
  assert.deepEqual(game.lateJoins.Eve, { start: 378, joinedRound: 5 });
  assert.equal(Scorebook.lateJoinInfo(game, 'Eve').label, 'Joined R5 · start 378');
  assert.equal(game.rounds.some(round => Object.prototype.hasOwnProperty.call(round.scores, 'Eve')), false);
  assert.equal(game.rounds.some(round => round.joinBonus && round.joinBonus.Eve), false);
  [1, 2, 3, 4].forEach(round => {
    assert.equal(Scorebook.missedRoundText(game, 'Ann', round), '');
    assert.equal(Scorebook.missedRoundText(game, 'Eve', round), 'Did not play');
  });
  assert.equal(Scorebook.missedRoundText(game, 'Eve', 5), '');
  assert.equal(game.totals.Ann, 10);
  assert.equal(game.totals.Eve, 378);
  const standing = Scorebook.matchStandings(game);
  assert.equal(standing.places.Ann, 1);
  assert.ok(standing.places.Eve > 1);
  assert.equal(standing.rows.find(row => row.player === 'Eve').score, 378);
});

test('a late joiner with no helpful spin can win, including after a zero or a setback', () => {
  const plain = crowns({ round: 5, scores: { Ann: 500, Bea: 0, Cal: 0, Dee: 0, Eve: 0 } });
  assert.equal(plain.totals.Eve, 378);
  assert.deepEqual(Scorebook.matchStandings(plain).champion, ['Eve']);
  assert.equal(Scorebook.playerEligibleToWin(plain, 'Eve'), true);

  const zero = crowns({ round: 5, scores: { Ann: 500, Bea: 0, Cal: 0, Dee: 0, Eve: 0 } });
  Scorebook.recordLifePreserverSpin(zero, 'Eve', 0);
  assert.equal(Scorebook.classifySpinOutcome(zero, 0), 'zero');
  assert.equal(Scorebook.playerEligibleToWin(zero, 'Eve'), true);
  assert.deepEqual(Scorebook.matchStandings(zero).champion, ['Eve']);

  const setback = crowns({ round: 5, scores: { Ann: 500, Bea: 0, Cal: 0, Dee: 0, Eve: 0 } });
  Scorebook.recordLifePreserverSpin(setback, 'Eve', 10);
  assert.equal(Scorebook.classifySpinOutcome(setback, 10), 'setback');
  assert.equal(setback.totals.Eve, 388);
  assert.equal(Scorebook.playerEligibleToWin(setback, 'Eve'), true);
  assert.deepEqual(Scorebook.matchStandings(setback).champion, ['Eve']);
});

test('a helpful Life Preserver keeps the late joiner from winning', () => {
  const game = crowns({ round: 5, scores: { Ann: 500, Bea: 0, Cal: 0, Dee: 0, Eve: 0 } });
  Scorebook.recordLifePreserverSpin(game, 'Eve', -20);
  assert.equal(Scorebook.classifySpinOutcome(game, -20), 'helpful');
  assert.equal(game.totals.Eve, 358);
  assert.equal(Scorebook.playerEligibleToWin(game, 'Eve'), false);
  const standing = Scorebook.matchStandings(game);
  assert.equal(standing.champion.includes('Eve'), false);
  assert.equal(standing.places.Eve, 2);
  assert.equal(standing.rows.find(row => row.player === 'Eve').lpCap, Scorebook.LP_FINISH_CAP);
});

test('a late joiner uses the same Life Preserver offer as anyone else that far back', () => {
  const game = crowns();
  const players = game.originalRoster;
  const offer = Life.getLifePreserverOffer(game, 'Eve', players);
  assert.equal(offer.eligible, true, offer.reason || '');
  const leader = Life.getLifePreserverOffer(game, 'Ann', players);
  assert.equal(leader.eligible, false);
  assert.equal(leader.reason, 'leading');
});

test('Wizard and 818 use the same ceiling start, and the page does not invent a bid', () => {
  assert.equal(Scorebook.ceilingAverage([50, 50, 50, 50]), 50);
  const wizard = {
    name: 'Wizard',
    originalRoster: ['Ann', 'Bea', 'Cal'],
    rounds: [{ round: 1, scores: { Ann: 40, Bea: 60 } }],
    totals: {}
  };
  const joined = Scorebook.recordLateJoin(wizard, 'Cal', [40, 60], 2);
  Scorebook.recomputeTotals(wizard);
  assert.equal(joined.start, 50);
  assert.equal(wizard.totals.Cal, 50);
  assert.equal(Scorebook.missedRoundText(wizard, 'Cal', 1), 'Did not play');
  const fn = html.slice(html.indexOf('function submitAddPlayerMidGame'), html.indexOf('/* ═══ END GAME'));
  assert.match(fn, /recordLateJoin/);
  assert.doesNotMatch(fn, /currentBids\[name\]\s*=\s*0/);
  assert.match(fn, /wizardPhase='bidding'/);
  assert.match(fn, /eight18Phase='bidding'/);
  assert.match(html, /missedRoundText/);
  assert.match(html, /Hand and Foot keeps the same sides/);
});
