import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  assert.deepEqual(HF.scoringKeys(six), ['A & B', 'C & D', 'E & F']);
  assert.equal(six.length, 3);
  assert.equal(six[0].members.length, 2);
  assert.equal(six.every(side => side.members.length === 2), true);

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
  assert.deepEqual(HF.scoringKeys(sixTeams), ['Ann & Bo', 'Cy & Dee', 'Eve & Fay']);
  assert.equal(sixTeams.length, 3);
  assert.deepEqual(sixTeams[0].members, ['Ann', 'Bo']);
  assert.deepEqual(sixTeams[2].members, ['Eve', 'Fay']);
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

test('two players each enter canastas, red threes, a foot penalty, and card points', () => {
  const ann = { canastas: 2, redThrees: 1, footPenalty: 0, cardPoints: 80 };
  const bo = { canastas: 0, redThrees: 3, footPenalty: 100, cardPoints: -20 };
  assert.equal(HF.roundScore(ann), 1180);
  assert.equal(HF.roundScore(bo), 180);
  const keys = HF.scoringKeys(HF.buildSides(['Ann', 'Bo'], 'singles'));
  assert.deepEqual(keys, ['Ann', 'Bo']);
  assert.deepEqual(HF.totalForSides([
    { scores: { Ann: HF.roundScore(ann), Bo: HF.roundScore(bo) } }
  ], keys), { Ann: 1180, Bo: 180 });
});

test('a team side uses that same five-input score once', () => {
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const keys = HF.scoringKeys(sides);
  const annBo = HF.roundScore({ canastas: 2, redThrees: 1, footPenalty: 0, cardPoints: 80 });
  const cyDee = HF.roundScore({ canastas: 0, redThrees: 0, footPenalty: 100, cardPoints: 40 });
  assert.equal(annBo, 1180);
  assert.equal(cyDee, -60);
  assert.deepEqual(HF.totalForSides([
    { scores: { 'Ann & Bo': annBo, 'Cy & Dee': cyDee } }
  ], keys), { 'Ann & Bo': 1180, 'Cy & Dee': -60 });
  assert.equal(keys.includes('Ann'), false);
});

// Assumed point values, because Matt named the inputs and not the amounts.
// One canasta is 500 (not split into clean 500 / dirty 300 / wild 1000).
// One red three is 100, so four red threes are 400, not a special 800.
// The foot penalty is not applied until that side types it. 100 is the
// suggested amount, kept on SCORE_DEFAULTS.footPenalty for the table to edit.
// Both rates are editable per round. Card points are the typed total and
// are not reduced by a second cards-left field.
test('the round is canastas times 500, plus red threes times 100, plus card points, minus the foot penalty', () => {
  assert.deepEqual(HF.SCORE_DEFAULTS, { canastaEach: 500, redThreeEach: 100, footPenalty: 100 });
  assert.equal(HF.roundScore({ canastas: 1, redThrees: 1, footPenalty: 0, cardPoints: 0 }), 600);
  assert.equal(HF.roundScore({ canastas: 2, redThrees: 0, footPenalty: 0, cardPoints: 35 }), 1035);
  assert.equal(HF.roundScore({ canastas: '1', redThrees: '', footPenalty: '-', cardPoints: '15' }), 515);
  assert.equal(HF.roundScore({ canastas: 0, redThrees: 4, footPenalty: 0, cardPoints: 0 }), 400);
});

test('a blank foot penalty subtracts nothing, and 100 applies only when that side enters it', () => {
  assert.equal(HF.roundScore({ canastas: 1, redThrees: 0, footPenalty: '', cardPoints: 20 }), 520);
  assert.equal(HF.roundScore({ canastas: 1, redThrees: 0, footPenalty: 0, cardPoints: 20 }), 520);
  assert.equal(HF.roundScore({ canastas: 1, redThrees: 0, footPenalty: 100, cardPoints: 20 }), 420);
  assert.equal(HF.roundScore({ canastas: 0, redThrees: 0, footPenalty: -100, cardPoints: 50 }), -50);
});

test('negative card points stay in the automatic round', () => {
  assert.equal(HF.roundScore({ canastas: 1, redThrees: 0, footPenalty: 0, cardPoints: -40 }), 460);
  assert.equal(HF.roundScore({ canastas: 0, redThrees: 0, footPenalty: 100, cardPoints: -25 }), -125);
});

test('canasta and red-three rates stay editable', () => {
  assert.equal(HF.roundScore({ canastas: 2, redThrees: 1, footPenalty: 0, cardPoints: 0, canastaEach: 300, redThreeEach: 100 }), 700);
  assert.equal(HF.roundScore({ canastas: 0, redThrees: 4, footPenalty: 0, cardPoints: 0, redThreeEach: 200 }), 800);
  assert.equal(HF.roundScore({ canastas: 1, redThrees: 0, footPenalty: 0, cardPoints: 0, canastaEach: '' }), 500);
});

test('a team total is recorded for both teammates', () => {
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const totals = { 'Ann & Bo': -15, 'Cy & Dee': 0 };
  assert.deepEqual(HF.recordedKeys(sides, totals), ['Ann', 'Bo', 'Cy', 'Dee']);
  assert.deepEqual(HF.scoringKeys(sides), ['Ann & Bo', 'Cy & Dee']);

  const six = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], 'teams');
  const sixTotals = { 'Ann & Bo': 40 };
  assert.deepEqual(HF.recordedKeys(six, sixTotals), ['Ann', 'Bo']);
  assert.equal(HF.recordedKeys(six, sixTotals).includes('Cy'), false);

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

test('each scoring input is its own field and survives a history save', () => {
  const round = HF.persistRound(1, {
    Ann: { canastas: 2, redThrees: 1, footPenalty: 0, cardPoints: 80 },
    Bo: { canastas: 0, redThrees: 3, footPenalty: 100, cardPoints: -20 }
  });
  assert.deepEqual(round.handFootParts.Ann, {
    canastas: 2,
    canastaPoints: 1000,
    redThrees: 1,
    footPenalty: 0,
    cardPoints: 80,
    canastaEach: 500,
    redThreeEach: 100,
    roundScore: 1180
  });
  assert.equal(round.scores.Ann, 1180);
  assert.equal(round.scores.Ann, round.handFootParts.Ann.roundScore);
  assert.equal(round.handFootParts.Bo.redThrees, 3);
  assert.equal(round.handFootParts.Bo.footPenalty, 100);
  assert.equal(round.handFootParts.Bo.cardPoints, -20);
  assert.equal(round.handFootParts.Bo.roundScore, 180);
  assert.equal(Object.prototype.hasOwnProperty.call(round.handFootParts.Ann, 'bonuses'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(round.handFootParts.Ann, 'cardsLeft'), false);

  const match = {
    id: 1,
    game: 'Hand and Foot',
    handFoot: { format: 'singles', sides: HF.buildSides(['Ann', 'Bo'], 'singles') },
    totals: { Ann: 1180, Bo: 180 },
    rounds: [round]
  };
  const saved = JSON.parse(JSON.stringify(HF.normalizeMatch(match)));
  assert.equal(saved.rounds[0].handFootParts.Ann.canastas, 2);
  assert.equal(saved.rounds[0].handFootParts.Ann.redThrees, 1);
  assert.equal(saved.rounds[0].handFootParts.Ann.footPenalty, 0);
  assert.equal(saved.rounds[0].handFootParts.Ann.cardPoints, 80);
  assert.equal(saved.rounds[0].handFootParts.Ann.roundScore, 1180);
  assert.equal(saved.rounds[0].scores.Ann, 1180);
  assert.equal(saved.rounds[0].scores.Bo, 180);
  assert.deepEqual(HF.sumFieldForPlayer([saved], 'Ann', 'redThrees'), {
    total: 1, roundsRecorded: 1, roundsUnknown: 0
  });
  assert.deepEqual(HF.sumFieldForMatch(saved, 'canastas'), {
    total: 2, roundsRecorded: 2, roundsUnknown: 0
  });
});

test('one team entry is copied onto both teammates and a match total counts the pair once', () => {
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const round = HF.persistTeamRound(2, {
    'Ann & Bo': { canastas: 1, redThrees: 4, footPenalty: 0, cardPoints: 10 },
    'Cy & Dee': { canastas: 0, redThrees: 1, footPenalty: 100, cardPoints: 0 }
  }, sides);
  const match = HF.normalizeMatch({
    game: 'Hand and Foot',
    handFoot: { format: 'teams', sides },
    totals: { Ann: 910, Bo: 910, Cy: 0, Dee: 0 },
    rounds: [round]
  });
  assert.equal(match.rounds[0].handFootParts.Ann.redThrees, 4);
  assert.equal(match.rounds[0].handFootParts.Bo.redThrees, 4);
  assert.equal(match.rounds[0].handFootParts.Ann.canastaPoints, 500);
  assert.equal(match.rounds[0].handFootParts.Ann.roundScore, 500 + 400 + 10);
  assert.equal(match.rounds[0].scores.Ann, 910);
  assert.equal(match.rounds[0].scores.Bo, 910);
  assert.equal(match.rounds[0].scores.Cy, 0);
  assert.equal(match.rounds[0].scores.Dee, 0);
  assert.notEqual(match.rounds[0].handFootParts.Ann, match.rounds[0].handFootParts.Bo);
  assert.deepEqual(match.rounds[0].handFootParts.Ann, match.rounds[0].handFootParts.Bo);
  assert.equal(Object.prototype.hasOwnProperty.call(match.rounds[0].handFootParts, 'Ann & Bo'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(match.rounds[0].scores, 'Ann & Bo'), false);
  assert.equal(HF.sumFieldForPlayer([match], 'Ann', 'redThrees').total, 4);
  assert.equal(HF.sumFieldForPlayer([match], 'Bo', 'redThrees').total, 4);
  assert.equal(HF.sumFieldForPlayer([match], 'Ann', 'roundScore').total, 910);
  assert.equal(HF.sumFieldForPlayer([match], 'Bo', 'roundScore').total, 910);
  assert.equal(HF.sumFieldForMatch(match, 'redThrees').total, 5);
  assert.equal(HF.sumFieldForMatch(match, 'roundScore').total, 910);
});

test('red threes add across saved Hand and Foot matches and skip other games', () => {
  const first = {
    game: 'Hand and Foot',
    handFoot: { format: 'singles', sides: HF.buildSides(['Ann', 'Bo'], 'singles') },
    rounds: [HF.persistRound(1, {
      Ann: { canastas: 0, redThrees: 2, footPenalty: 0, cardPoints: 0 },
      Bo: { canastas: 0, redThrees: 1, footPenalty: 0, cardPoints: 0 }
    })]
  };
  const second = {
    game: 'Hand and Foot',
    handFoot: { format: 'singles', sides: HF.buildSides(['Ann', 'Cy'], 'singles') },
    rounds: [HF.persistRound(1, {
      Ann: { canastas: 1, redThrees: 3, footPenalty: 0, cardPoints: 0 },
      Cy: { canastas: 0, redThrees: 0, footPenalty: 0, cardPoints: 0 }
    })]
  };
  const wizard = { game: 'Wizard', rounds: [{ round: 1, scores: { Ann: 20 } }] };
  const history = [first, wizard, second];
  assert.deepEqual(HF.sumFieldForPlayer(history, 'Ann', 'redThrees'), {
    total: 5, roundsRecorded: 2, roundsUnknown: 0
  });
  assert.equal(HF.sumFieldForPlayer(history, 'Ann', 'canastas').total, 1);
  assert.equal(HF.sumFieldForMatch(wizard, 'redThrees').total, 0);
});

test('an older three-field save keeps its score and does not invent canasta or red-three counts', () => {
  const oldRound = {
    round: 1,
    scores: { Ann: -30, Bo: 120 },
    handFootParts: {
      Ann: { cardPoints: 20, bonuses: 0, cardsLeft: 50 },
      Bo: { cardPoints: 100, bonuses: 50, cardsLeft: 30 }
    }
  };
  const mapped = HF.normalizeMatch({
    game: 'Hand and Foot',
    handFoot: { format: 'singles', sides: HF.buildSides(['Ann', 'Bo'], 'singles') },
    rounds: [oldRound]
  });
  const ann = mapped.rounds[0].handFootParts.Ann;
  assert.equal(mapped.rounds[0].scores.Ann, -30);
  assert.equal(ann.roundScore, -30);
  assert.equal(ann.cardPoints, 20);
  assert.equal(ann.bonuses, 0);
  assert.equal(ann.cardsLeft, 50);
  assert.equal(ann.legacy, true);
  assert.equal(HF.roundScore(ann), -30);
  assert.equal(Object.prototype.hasOwnProperty.call(ann, 'canastas'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ann, 'redThrees'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ann, 'footPenalty'), false);
  assert.deepEqual(HF.sumFieldForPlayer([mapped], 'Ann', 'redThrees'), {
    total: 0, roundsRecorded: 0, roundsUnknown: 1
  });
  assert.equal(HF.sumFieldForPlayer([mapped], 'Bo', 'cardPoints').total, 100);
  assert.equal(HF.sumFieldForMatch(mapped, 'roundScore').total, 90);
});

test('four players are two pairs and six players are three pairs you can re-seat', () => {
  assert.deepEqual(HF.defaultPairs(['Ann', 'Bo', 'Cy', 'Dee']), [['Ann', 'Bo'], ['Cy', 'Dee']]);
  assert.deepEqual(
    HF.defaultPairs(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay']),
    [['Ann', 'Bo'], ['Cy', 'Dee'], ['Eve', 'Fay']]
  );
  const swapped = HF.swapPairMember(
    HF.defaultPairs(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay']),
    0,
    1,
    'Eve'
  );
  assert.deepEqual(swapped, [['Ann', 'Eve'], ['Cy', 'Dee'], ['Bo', 'Fay']]);
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], 'teams', swapped);
  assert.deepEqual(HF.scoringKeys(sides), ['Ann & Eve', 'Cy & Dee', 'Bo & Fay']);
  assert.equal(new Set(sides.flatMap(side => side.members)).size, 6);
  assert.equal(sides.every(side => side.members.length === 2), true);
  const broken = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams', [['Ann', 'Bo']]);
  assert.deepEqual(HF.scoringKeys(broken), ['Ann & Bo', 'Cy & Dee']);
  assert.deepEqual(
    HF.scoringKeys(HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams', [['Ann', 'Cy'], ['Bo', 'Dee']])),
    ['Ann & Cy', 'Bo & Dee']
  );
});

test('typed canasta points are the round amount and are not added on top of count times 500', () => {
  const example = { canastas: 3, canastaPoints: 900, redThrees: 0, footPenalty: 95, cardPoints: 450 };
  assert.equal(HF.roundScore(example), 1255);
  assert.equal(HF.roundScore({ canastas: 3, canastaPoints: 900, redThrees: 1, footPenalty: 95, cardPoints: 450 }), 1355);
  assert.equal(HF.roundScore({ canastas: 2, canastaPoints: 0, redThrees: 0, footPenalty: 0, cardPoints: 80 }), 80);
  assert.equal(HF.roundScore({ canastas: 2, canastaPoints: '', redThrees: 0, footPenalty: 0, cardPoints: 80 }), 80);
  assert.equal(HF.roundScore({ canastas: 2, redThrees: 1, footPenalty: 0, cardPoints: 80 }), 1180);
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const round = HF.persistTeamRound(1, {
    'Ann & Bo': example,
    'Cy & Dee': { canastas: 2, canastaPoints: 2000, redThrees: 0, footPenalty: 0, cardPoints: 0 }
  }, sides);
  assert.equal(round.scores.Ann, 1255);
  assert.equal(round.scores.Bo, 1255);
  assert.equal(round.handFootParts.Ann.canastas, 3);
  assert.equal(round.handFootParts.Bo.canastaPoints, 900);
  assert.equal(round.handFootParts.Ann.footPenalty, 95);
  assert.equal(round.handFootParts.Bo.cardPoints, 450);
  assert.equal(round.scores.Cy, 2000);
  assert.equal(round.scores.Dee, 2000);
  assert.equal(round.handFootParts.Ann.roundScore, round.scores.Ann);
  const saved = JSON.parse(JSON.stringify(HF.normalizeMatch({
    game: 'Hand and Foot',
    handFoot: { format: 'teams', sides },
    totals: { Ann: 1255, Bo: 1255, Cy: 2000, Dee: 2000 },
    rounds: [round]
  })));
  assert.equal(saved.rounds[0].handFootParts.Ann.canastaPoints, 900);
  assert.equal(saved.rounds[0].handFootParts.Bo.canastaPoints, 900);
  assert.equal(saved.rounds[0].scores.Ann, 1255);
  assert.equal(saved.rounds[0].scores.Bo, 1255);
  assert.equal(HF.sumFieldForPlayer([saved], 'Ann', 'canastas').total, 3);
  assert.equal(HF.sumFieldForPlayer([saved], 'Bo', 'canastas').total, 3);
  assert.equal(HF.sumFieldForPlayer([saved], 'Ann', 'cardPoints').total, 450);
  assert.equal(HF.sumFieldForPlayer([saved], 'Ann', 'footPenalty').total, 95);
  assert.equal(HF.sumFieldForMatch(saved, 'canastas').total, 5);
});

test('an older team save stored on the side name is copied onto both players without inventing counts', () => {
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const mapped = HF.normalizeMatch({
    game: 'Hand and Foot',
    handFoot: { format: 'teams', sides },
    totals: { 'Ann & Bo': 910, 'Cy & Dee': -30 },
    winners: ['Ann & Bo'],
    rounds: [{
      round: 1,
      scores: { 'Ann & Bo': 910, 'Cy & Dee': -30 },
      handFootParts: {
        'Ann & Bo': { canastas: 1, redThrees: 4, footPenalty: 0, cardPoints: 10 },
        'Cy & Dee': { cardPoints: 20, bonuses: 0, cardsLeft: 50 }
      }
    }]
  });
  assert.equal(mapped.rounds[0].handFootParts.Ann.redThrees, 4);
  assert.equal(mapped.rounds[0].handFootParts.Bo.canastas, 1);
  assert.equal(mapped.rounds[0].scores.Ann, 910);
  assert.equal(mapped.rounds[0].scores.Bo, 910);
  assert.equal(mapped.totals.Ann, 910);
  assert.equal(mapped.totals.Bo, 910);
  assert.deepEqual(mapped.winners, ['Ann', 'Bo']);
  assert.equal(Object.prototype.hasOwnProperty.call(mapped.rounds[0].scores, 'Ann & Bo'), false);
  const cy = mapped.rounds[0].handFootParts.Cy;
  const dee = mapped.rounds[0].handFootParts.Dee;
  assert.equal(cy.legacy, true);
  assert.equal(dee.legacy, true);
  assert.equal(mapped.rounds[0].scores.Cy, -30);
  assert.equal(mapped.rounds[0].scores.Dee, -30);
  assert.equal(Object.prototype.hasOwnProperty.call(cy, 'canastas'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(dee, 'redThrees'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cy, 'footPenalty'), false);
  assert.deepEqual(HF.sumFieldForPlayer([mapped], 'Cy', 'redThrees'), {
    total: 0, roundsRecorded: 0, roundsUnknown: 1
  });
  assert.equal(HF.sumFieldForPlayer([mapped], 'Ann', 'redThrees').total, 4);
  assert.equal(HF.sumFieldForMatch(mapped, 'redThrees').total, 4);
});

test('an older saved round still adds card points and bonuses and subtracts cards left', () => {
  assert.equal(HF.roundScore({ cardPoints: 100, bonuses: 50, cardsLeft: 30 }), 120);
  assert.equal(HF.roundScore({ cardPoints: 20, bonuses: 0, cardsLeft: 50 }), -30);
  assert.equal(HF.roundScore({ cardPoints: 0, bonuses: -100, cardsLeft: 15 }), -115);
  assert.equal(HF.roundScore({ cardPoints: '80', bonuses: '', cardsLeft: '-' }), 80);
  assert.equal(HF.roundScore({ cardPoints: 40, bonuses: 10, cardsLeft: -25 }), 25);
  assert.equal(HF.parsePart(-25, true), 25);
});

// The entry form sends a canasta count, not a separate points box.
// 3 canastas at the documented rate of 500 is 1500. Matt's 900 example
// stays valid only when a save already has canastaPoints. Dropping that
// key, which a re-edit of the four fields does, uses the rate instead.
test('prove-it: auto-total sums the four inputs under the documented rates', () => {
  const entered = { canastas: 3, redThrees: 0, footPenalty: 95, cardPoints: 450 };
  assert.equal(Object.prototype.hasOwnProperty.call(entered, 'canastaPoints'), false);
  assert.equal(HF.roundScore(entered), (3 * 500) + 450 - 95);
  assert.equal(HF.roundScore(entered), 1855);

  assert.equal(HF.roundScore({ canastas: 1, redThrees: 1, cardPoints: 20 }), 620);
  assert.equal(HF.roundScore({ canastas: 1, redThrees: 0, footPenalty: 100, cardPoints: 20 }), 420);
  assert.equal(HF.roundScore({ canastas: 0, redThrees: 0, footPenalty: 0, cardPoints: -40 }), -40);
  assert.equal(HF.roundScore({ canastas: 0, redThrees: 0, footPenalty: -50, cardPoints: 0 }), -50);

  const typed = { canastas: 3, canastaPoints: 900, redThrees: 0, footPenalty: 95, cardPoints: 450 };
  assert.equal(HF.roundScore(typed), 1255);
  assert.notEqual(HF.roundScore(typed), 1255 + (3 * 500));
  assert.equal(HF.roundScore({ canastas: 3, redThrees: 0, footPenalty: 95, cardPoints: 450, canastaEach: 300 }), 1255);

  const mixed = { canastas: 1, redThrees: 0, footPenalty: 0, cardPoints: 10, bonuses: 999, cardsLeft: 999 };
  assert.equal(HF.roundScore(mixed), 510);
});

test('prove-it: each input and the computed round score persist per side', () => {
  const sides = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const round = HF.persistTeamRound(1, {
    'Ann & Bo': { canastas: 3, redThrees: 2, footPenalty: 95, cardPoints: 450 },
    'Cy & Dee': { canastas: 1, redThrees: 0, footPenalty: 0, cardPoints: -10 }
  }, sides);
  const ann = round.handFootParts.Ann;
  assert.equal(ann.canastas, 3);
  assert.equal(ann.redThrees, 2);
  assert.equal(ann.footPenalty, 95);
  assert.equal(ann.cardPoints, 450);
  assert.equal(ann.canastaPoints, 1500);
  assert.equal(ann.roundScore, 2055);
  assert.equal(HF.roundScore(ann), 2055);
  assert.notEqual(HF.roundScore(ann), 2055 + 1500);
  assert.equal(round.scores.Ann, 2055);
  assert.equal(round.scores.Bo, 2055);
  assert.deepEqual(round.handFootParts.Ann, round.handFootParts.Bo);
  assert.notEqual(round.handFootParts.Ann, round.handFootParts.Bo);
  assert.equal(round.handFootParts.Cy.roundScore, 490);
  assert.equal(round.scores.Cy, 490);
  assert.equal(round.scores.Dee, 490);
  assert.equal(Object.prototype.hasOwnProperty.call(round.scores, 'Ann & Bo'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(round.handFootParts, 'Ann & Bo'), false);

  const saved = JSON.parse(JSON.stringify(HF.normalizeMatch({
    game: 'Hand and Foot',
    handFoot: { format: 'teams', sides },
    rounds: [round],
    totals: { Ann: 2055, Bo: 2055, Cy: 490, Dee: 490 }
  })));
  assert.equal(saved.rounds[0].handFootParts.Ann.redThrees, 2);
  assert.equal(saved.rounds[0].handFootParts.Bo.footPenalty, 95);
  assert.equal(saved.rounds[0].handFootParts.Ann.cardPoints, 450);
  assert.equal(saved.rounds[0].scores.Ann, saved.rounds[0].handFootParts.Ann.roundScore);
  assert.equal(HF.sumFieldForPlayer([saved], 'Ann', 'redThrees').total, 2);
  assert.equal(HF.sumFieldForPlayer([saved], 'Bo', 'redThrees').total, 2);
  assert.equal(HF.sumFieldForMatch(saved, 'redThrees').total, 2);
  assert.equal(HF.sumFieldForMatch(saved, 'roundScore').total, 2055 + 490);
  assert.equal(
    HF.sumFieldForPlayer([saved], 'Ann', 'roundScore').total
      + HF.sumFieldForPlayer([saved], 'Bo', 'roundScore').total,
    2055 * 2
  );
});

test('prove-it: four players are two lineup pairs and six players are three', () => {
  const four = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  assert.equal(four.length, 2);
  assert.deepEqual(four.map(side => side.members), [['Ann', 'Bo'], ['Cy', 'Dee']]);
  const six = HF.buildSides(['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], 'teams');
  assert.equal(six.length, 3);
  assert.deepEqual(six.map(side => side.members), [['Ann', 'Bo'], ['Cy', 'Dee'], ['Eve', 'Fay']]);
  assert.equal(six.every(side => side.members.length === 2), true);

  const singles = HF.persistRound(1, {
    Ann: { canastas: 1, redThrees: 0, footPenalty: 0, cardPoints: 0 },
    Bo: { canastas: 0, redThrees: 1, footPenalty: 0, cardPoints: 0 }
  });
  assert.deepEqual(Object.keys(singles.scores).sort(), ['Ann', 'Bo']);
  assert.equal(Object.prototype.hasOwnProperty.call(singles.scores, 'Ann & Bo'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(singles.handFootParts, 'Ann & Bo'), false);
  assert.equal(singles.scores.Ann, 500);
  assert.equal(singles.scores.Bo, 100);
});

test('prove-it: the entry form is four inputs plus a computed total', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /const HAND_FOOT_FIELDS=\['canastas','redThrees','footPenalty','cardPoints'\]/);
  assert.doesNotMatch(html, /HAND_FOOT_FIELDS=\[[^\]]*canastaPoints/);
  assert.match(html, /footPenalty:'Foot in hand'/);
  assert.match(html, /redThrees:'Red threes'/);
  assert.match(html, /legacy\?'Older round':'Total'/);
  assert.match(html, /class="hf-round"/);
  assert.doesNotMatch(html, /<input[^>]*hf-round/);
  assert.match(html, /Canastas \+ red threes \+ card points − foot/);
});
