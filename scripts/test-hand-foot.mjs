import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const HF = require('../public/assets/hand-foot-logic.js');

test('four rounds use the usual minimum melds', () => {
  assert.deepEqual(HF.MELDS, [50, 90, 120, 150]);
  assert.equal(HF.ROUNDS, 4);
  assert.equal(HF.meldForRound(1), 50);
  assert.equal(HF.meldForRound(2), 90);
  assert.equal(HF.meldForRound(3), 120);
  assert.equal(HF.meldForRound(4), 150);
  assert.equal(HF.meldForRound(5), null);
});

test('player counts pick the locked default format', () => {
  assert.equal(HF.defaultFormat(2), 'singles');
  assert.equal(HF.defaultFormat(3), 'singles');
  assert.equal(HF.defaultFormat(4), 'teams');
  assert.equal(HF.defaultFormat(5), 'singles');
  assert.equal(HF.defaultFormat(6), 'teams');
  assert.equal(HF.canSwitchToSingles(2), false);
  assert.equal(HF.canSwitchToSingles(3), false);
  assert.equal(HF.canSwitchToSingles(4), true);
  assert.equal(HF.canSwitchToSingles(5), false);
  assert.equal(HF.canSwitchToSingles(6), true);
});

test('teams are one score column and singles stay one per player', () => {
  const four = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  assert.deepEqual(HF.scoringKeys(four), ['Ann & Bo', 'Cy & Dee']);
  assert.deepEqual(four[0].members, ['Ann', 'Bo']);
  assert.equal(HF.scoringKeys(four).includes('Ann'), false);

  const six = HF.buildSides(['A', 'B', 'C', 'D', 'E', 'F'], 'teams');
  assert.deepEqual(HF.scoringKeys(six), ['A, B & C', 'D, E & F']);
  assert.equal(six[0].members.length, 3);

  const singles = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'singles');
  assert.deepEqual(HF.scoringKeys(singles), ['Ann', 'Bo', 'Cy', 'Dee']);

  const headsUp = HF.buildSides(['Ann', 'Bo'], 'singles');
  assert.deepEqual(HF.scoringKeys(headsUp), ['Ann', 'Bo']);
});

test('round score adds the first two inputs and subtracts cards left', () => {
  assert.equal(HF.roundScore({ cardPoints: 100, bonuses: 50, cardsLeft: 30 }), 120);
  assert.equal(HF.roundScore({ cardPoints: 20, bonuses: 0, cardsLeft: 50 }), -30);
  assert.equal(HF.roundScore({ cardPoints: 0, bonuses: -100, cardsLeft: 15 }), -115);
  assert.equal(HF.roundScore({ cardPoints: '80', bonuses: '', cardsLeft: '-' }), 80);
  assert.equal(HF.roundScore({ cardPoints: 40, bonuses: 10, cardsLeft: -25 }), 25);
  assert.equal(HF.parsePart(-25, true), 25);
});
