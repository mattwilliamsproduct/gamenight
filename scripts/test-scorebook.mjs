import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');

test('tied totals share a place and the next total skips', () => {
  const sorted = ['Alexis', 'Diana', 'Ethan', 'Megan', 'Matt', 'Linda', 'Mike'];
  const totals = { Alexis: 200, Diana: 180, Ethan: 160, Megan: 140, Matt: 140, Linda: 100, Mike: 100 };
  const places = Scorebook.competitionPlaces(sorted, totals);
  assert.deepEqual(places, {
    Alexis: 1,
    Diana: 2,
    Ethan: 3,
    Megan: 4,
    Matt: 4,
    Linda: 6,
    Mike: 6
  });
});

test('low-score ties use the same place loop', () => {
  const sorted = ['Megan', 'Matt', 'Linda', 'Mike'];
  const places = Scorebook.competitionPlaces(sorted, { Megan: 12, Matt: 20, Linda: 20, Mike: 44 });
  assert.deepEqual(places, { Megan: 1, Matt: 2, Linda: 2, Mike: 4 });
});

test('a Life Preserver paints on the hand it followed and stays out of the hand count', () => {
  const rounds = [
    { round: 1, scores: { Linda: 10, Mike: 15 } },
    { round: 0, hailMaryBonus: true, scores: { Linda: 15 } },
    { round: 2, scores: { Linda: 10, Mike: 15 } },
    { round: 3, scores: { Linda: 0, Mike: 0 } },
    { round: 0, hailMaryBonus: true, scores: { Mike: 40 } }
  ];
  assert.equal(Scorebook.scoringRoundCount(rounds), 3);
  assert.equal(Scorebook.lifePreserverFollowing(rounds, 0, 'Linda'), 15);
  assert.equal(Scorebook.lifePreserverFollowing(rounds, 0, 'Mike'), 0);
  assert.equal(Scorebook.lifePreserverFollowing(rounds, 3, 'Mike'), 40);
  assert.equal(Scorebook.lifePreserverHidden(rounds, [0, 2, 4], 'Linda'), 0);
  assert.equal(Scorebook.lifePreserverHidden(rounds, [2, 4], 'Linda'), 15);
  assert.equal(Scorebook.lifePreserverHidden(rounds, [0, 2], 'Mike'), 40);
});

test('a Life Preserver before the first hand sits beside Total', () => {
  const rounds = [
    { round: 0, hailMaryBonus: true, scores: { Matt: 20 } },
    { round: 1, scores: { Matt: 10 } }
  ];
  assert.equal(Scorebook.lifePreserverLeading(rounds, 'Matt'), 20);
  assert.equal(Scorebook.lifePreserverFollowing(rounds, 1, 'Matt'), 0);
  assert.equal(Scorebook.lifePreserverHidden(rounds, [1], 'Matt'), 20);
});

test('merging a Wizard name keeps bids, tricks, and the Life Preserver with the points', () => {
  const game = {
    name: 'Wizard',
    originalRoster: ['Matt', 'Linda'],
    retired: ['Linda'],
    hailMaryUsed: ['Linda'],
    lifePreserverHeld: ['Linda'],
    winners: ['Linda'],
    totals: { Matt: 20, Linda: 50 },
    currentBids: { Matt: 1, Linda: 3 },
    currentScoreDrafts: { Linda: 2 },
    rounds: [
      {
        round: 1,
        scores: { Matt: 20, Linda: 10 },
        bids: { Matt: 1, Linda: 2 },
        actuals: { Matt: 1, Linda: 0 }
      },
      { round: 0, hailMaryBonus: true, scores: { Linda: 40 } }
    ]
  };

  Scorebook.applyPlayerNameOnGame(game, 'Linda', 'Matt', true);

  assert.equal(game.totals.Matt, 70);
  assert.equal(game.totals.Linda, undefined);
  assert.equal(game.rounds[0].scores.Matt, 30);
  assert.equal(game.rounds[0].scores.Linda, undefined);
  assert.equal(game.rounds[0].bids.Matt, 3);
  assert.equal(game.rounds[0].bids.Linda, undefined);
  assert.equal(game.rounds[0].actuals.Matt, 1);
  assert.equal(game.rounds[0].actuals.Linda, undefined);
  assert.equal(game.rounds[1].scores.Matt, 40);
  assert.equal(game.rounds[1].scores.Linda, undefined);
  assert.deepEqual(game.hailMaryUsed, ['Matt']);
  assert.deepEqual(game.lifePreserverHeld, ['Matt']);
  assert.deepEqual(game.originalRoster, ['Matt']);
  assert.deepEqual(game.retired, ['Matt']);
  assert.deepEqual(game.winners, ['Matt']);
  assert.equal(game.currentBids.Matt, 4);
  assert.equal(game.currentBids.Linda, undefined);
  assert.equal(game.currentScoreDrafts.Matt, 2);
});

test('a unique rename moves the Wizard round and Life Preserver together', () => {
  const game = {
    name: 'Wizard',
    originalRoster: ['Linda', 'Matt'],
    hailMaryUsed: ['Linda'],
    lifePreserverHeld: ['Matt', 'Linda'],
    totals: { Linda: 40, Matt: 20 },
    rounds: [
      { round: 1, scores: { Linda: 0, Matt: 20 }, bids: { Linda: 2, Matt: 1 }, actuals: { Linda: 0, Matt: 1 } },
      { round: 0, hailMaryBonus: true, scores: { Linda: 40 } }
    ]
  };

  Scorebook.applyPlayerNameOnGame(game, 'Linda', 'Lindy', false);

  assert.equal(game.totals.Lindy, 40);
  assert.equal(game.totals.Linda, undefined);
  assert.equal(game.rounds[0].scores.Lindy, 0);
  assert.equal(game.rounds[0].bids.Lindy, 2);
  assert.equal(game.rounds[0].actuals.Lindy, 0);
  assert.equal(game.rounds[1].scores.Lindy, 40);
  assert.deepEqual(game.hailMaryUsed, ['Lindy']);
  assert.deepEqual(game.lifePreserverHeld, ['Matt', 'Lindy']);
  assert.deepEqual(game.originalRoster, ['Lindy', 'Matt']);
});

test('empty standings and a three-way tie still skip the next place', () => {
  assert.deepEqual(Scorebook.competitionPlaces([], {}), {});
  const places = Scorebook.competitionPlaces(
    ['Ann', 'Bea', 'Cal', 'Dee'],
    { Ann: 10, Bea: 10, Cal: 10, Dee: 4 }
  );
  assert.deepEqual(places, { Ann: 1, Bea: 1, Cal: 1, Dee: 4 });
});

test('a numeric string ties with the same number instead of taking the next place', () => {
  const places = Scorebook.competitionPlaces(
    ['Megan', 'Matt', 'Linda'],
    { Megan: '140', Matt: 140, Linda: 100 }
  );
  assert.deepEqual(places, { Megan: 1, Matt: 1, Linda: 3 });
});

test('a Life Preserver does not leak onto the next hand, and a zero spin adds nothing', () => {
  const rounds = [
    { round: 1, scores: { Linda: 10 } },
    { round: 0, hailMaryBonus: true, scores: { Linda: -30 } },
    { round: 2, scores: { Linda: 0 } },
    { round: 0, hailMaryBonus: true, scores: { Mike: 0 } }
  ];
  assert.equal(Scorebook.scoringRoundCount(null), 0);
  assert.equal(Scorebook.scoringRoundCount([]), 0);
  assert.equal(Scorebook.lifePreserverFollowing(rounds, 0, 'Linda'), -30);
  assert.equal(Scorebook.lifePreserverFollowing(rounds, 2, 'Linda'), 0);
  assert.equal(Scorebook.lifePreserverFollowing(rounds, 2, 'Mike'), 0);
  assert.equal(Scorebook.lifePreserverHidden(rounds, [0, 2], 'Linda'), 0);
  assert.equal(Scorebook.lifePreserverHidden(rounds, [2], 'Linda'), -30);
});

test('merging numeric strings keeps the bid with the points', () => {
  const game = {
    totals: { Sam: '40', Alex: 10 },
    hailMaryUsed: ['Sam'],
    rounds: [
      { round: 1, scores: { Sam: '40', Alex: '10' }, bids: { Sam: '2', Alex: '1' }, actuals: { Sam: 2, Alex: 1 } }
    ]
  };
  Scorebook.applyPlayerNameOnGame(game, 'Sam', 'Alex', true);
  assert.equal(game.totals.Alex, 50);
  assert.equal(game.rounds[0].scores.Alex, 50);
  assert.equal(game.rounds[0].bids.Alex, 3);
  assert.equal(game.rounds[0].actuals.Alex, 3);
  assert.equal(game.rounds[0].bids.Sam, undefined);
  assert.deepEqual(game.hailMaryUsed, ['Alex']);
});

test('a name with no rounds still keeps the Life Preserver flag', () => {
  const game = { rounds: [], hailMaryUsed: ['Linda'], totals: {} };
  Scorebook.applyPlayerNameOnGame(game, 'Linda', 'Lindy', false);
  assert.deepEqual(game.hailMaryUsed, ['Lindy']);
  assert.deepEqual(game.rounds, []);
});
