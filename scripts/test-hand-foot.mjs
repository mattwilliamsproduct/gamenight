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

test('two, four, and six players use the locked columns', () => {
  assert.deepEqual(HF.scoringKeys(HF.buildSides(['Ann', 'Bo'], 'teams')), ['Ann', 'Bo']);
  assert.deepEqual(HF.scoringKeys(HF.buildSides(['Ann', 'Bo'], 'singles')), ['Ann', 'Bo']);

  const fourTeams = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  assert.deepEqual(HF.scoringKeys(fourTeams), ['Ann & Bo', 'Cy & Dee']);
  assert.deepEqual(HF.scoringKeys(HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'singles')), ['Ann', 'Bo', 'Cy', 'Dee']);

  const sixTeams = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], 'teams');
  assert.deepEqual(HF.scoringKeys(sixTeams), ['Ann, Bo & Cy', 'Dee, Eve & Fay']);
  assert.equal(sixTeams[0].members.length, 3);
  assert.equal(sixTeams[1].members.length, 3);
  assert.deepEqual(
    HF.scoringKeys(HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], 'singles')),
    ['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay']
  );

  assert.deepEqual(HF.scoringKeys(HF.buildSides(['Ann', 'Bo', 'Cy'], 'teams')), ['Ann', 'Bo', 'Cy']);
  assert.deepEqual(HF.scoringKeys(HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee', 'Eve'], 'teams')), ['Ann', 'Bo', 'Cy', 'Dee', 'Eve']);
});

test('negative rounds stay negative when the match total is added up', () => {
  const keys = ['Ann & Bo', 'Cy & Dee'];
  const totals = HF.totalForSides([
    { scores: { 'Ann & Bo': -30, 'Cy & Dee': 110 } },
    { scores: { 'Ann & Bo': 20, 'Cy & Dee': -15 } }
  ], keys);
  assert.deepEqual(totals, { 'Ann & Bo': -10, 'Cy & Dee': 95 });
  assert.equal(HF.roundScore({ cardPoints: 20, bonuses: 0, cardsLeft: 50 }), -30);
});

test('a team score is recorded once on the side, not on each teammate', () => {
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const totals = { 'Ann & Bo': -15, 'Cy & Dee': 0 };
  assert.deepEqual(HF.recordedKeys(sides, totals), ['Ann & Bo', 'Cy & Dee']);
  assert.equal(HF.recordedKeys(sides, totals).includes('Ann'), false);
  assert.equal(HF.recordedKeys(sides, totals).includes('Bo'), false);

  const six = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], 'teams');
  const sixTotals = { 'Ann, Bo & Cy': 40 };
  assert.deepEqual(HF.recordedKeys(six, sixTotals), ['Ann, Bo & Cy']);

  const headsUp = HF.buildSides(['Ann', 'Bo'], 'singles');
  assert.deepEqual(HF.recordedKeys(headsUp, { Ann: -5, Bo: 12 }), ['Ann', 'Bo']);
});

test('renaming a player rewrites the side key and a partner merge collapses that side', () => {
  const teams = { format: 'teams', sides: HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams') };
  const renamed = HF.renameMember(teams, 'Ann', 'Annie');
  assert.equal(renamed.config.sides[0].key, 'Annie & Bo');
  assert.deepEqual(renamed.config.sides[0].members, ['Annie', 'Bo']);
  assert.equal(renamed.config.sides[1].key, 'Cy & Dee');
  assert.deepEqual(renamed.keyMap, { 'Ann & Bo': 'Annie & Bo' });

  const merged = HF.renameMember(teams, 'Ann', 'Bo');
  assert.deepEqual(merged.config.sides[0].members, ['Bo']);
  assert.equal(merged.config.sides[0].key, 'Bo');
  assert.equal(merged.keyMap['Ann & Bo'], 'Bo');

  const singles = { format: 'singles', sides: HF.buildSides(['Ann', 'Bo'], 'singles') };
  const headsUp = HF.renameMember(singles, 'Ann', 'Annie');
  assert.equal(headsUp.config.sides[0].key, 'Annie');
  assert.deepEqual(headsUp.keyMap, { Ann: 'Annie' });

  const three = { format: 'singles', sides: HF.buildSides(['Ann', 'Bo', 'Cy'], 'singles') };
  const collapsed = HF.renameMember(three, 'Ann', 'Bo');
  assert.deepEqual(HF.scoringKeys(collapsed.config.sides), ['Bo', 'Cy']);
  assert.deepEqual(HF.recordedKeys(collapsed.config.sides, { Bo: 10, Cy: -4 }), ['Bo', 'Cy']);
  assert.equal(collapsed.keyMap.Ann, 'Bo');
});

test('a repeated side key is recorded once', () => {
  const dup = [{ key: 'Bo', members: ['Bo'] }, { key: 'Bo', members: ['Bo'] }, { key: 'Cy', members: ['Cy'] }];
  assert.deepEqual(HF.scoringKeys(dup), ['Bo', 'Cy']);
  assert.deepEqual(HF.recordedKeys(dup, { Bo: -8, Cy: 0 }), ['Bo', 'Cy']);
});

test('round score adds the first two inputs and subtracts cards left', () => {
  assert.equal(HF.roundScore({ cardPoints: 100, bonuses: 50, cardsLeft: 30 }), 120);
  assert.equal(HF.roundScore({ cardPoints: 20, bonuses: 0, cardsLeft: 50 }), -30);
  assert.equal(HF.roundScore({ cardPoints: 0, bonuses: -100, cardsLeft: 15 }), -115);
  assert.equal(HF.roundScore({ cardPoints: '80', bonuses: '', cardsLeft: '-' }), 80);
  assert.equal(HF.roundScore({ cardPoints: 40, bonuses: 10, cardsLeft: -25 }), 25);
  assert.equal(HF.parsePart(-25, true), 25);
});
