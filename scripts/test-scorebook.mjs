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

test('a same-match Wizard merge is refused and leaves bids, tricks, and the Life Preserver alone', () => {
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
  const before = JSON.parse(JSON.stringify(game));
  const shared = Scorebook.findSharedMatch([game], 'Linda', 'Matt');
  assert.equal(shared, game);
  Scorebook.applyPlayerNameOnGame(game, 'Linda', 'Matt', true);
  assert.deepEqual(game, before);
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

test('numeric strings in the same match are not added together', () => {
  const game = {
    totals: { Sam: '40', Alex: 10 },
    hailMaryUsed: ['Sam'],
    rounds: [
      { round: 1, scores: { Sam: '40', Alex: '10' }, bids: { Sam: '2', Alex: '1' }, actuals: { Sam: 2, Alex: 1 } }
    ]
  };
  const before = JSON.parse(JSON.stringify(game));
  Scorebook.applyPlayerNameOnGame(game, 'Sam', 'Alex', true);
  assert.deepEqual(game, before);
});

test('a name with no rounds still keeps the Life Preserver flag', () => {
  const game = { rounds: [], hailMaryUsed: ['Linda'], totals: {} };
  Scorebook.applyPlayerNameOnGame(game, 'Linda', 'Lindy', false);
  assert.deepEqual(game.hailMaryUsed, ['Lindy']);
  assert.deepEqual(game.rounds, []);
});

test('Wizard exact bid is 20 plus 10 per trick; a miss is -10 per trick off', () => {
  assert.equal(Scorebook.wizardRoundScore(0, 0), 20);
  assert.equal(Scorebook.wizardRoundScore(1, 1), 30);
  assert.equal(Scorebook.wizardRoundScore(3, 3), 50);
  assert.equal(Scorebook.wizardRoundScore(3, 1), -20);
  assert.equal(Scorebook.wizardRoundScore(0, 2), -20);
  assert.equal(Scorebook.wizardRoundScore('4', '2'), -20);
});

test('818 scores tricks taken, plus 10 only on an exact bid', () => {
  assert.equal(Scorebook.eight18RoundScore(2, 3), 3);
  assert.equal(Scorebook.eight18RoundScore(0, 0), 10);
  assert.equal(Scorebook.eight18RoundScore(2, 2), 12);
  assert.equal(Scorebook.eight18RoundScore(8, 8), 18);
  assert.equal(Scorebook.eight18RoundScore('3', '1'), 1);
});

test('Rook made and set split the hand the same way the table does', () => {
  const players = ['Ann', 'Bea', 'Cal', 'Dee'];
  const made = Scorebook.rookHandScores({
    bidder: 'Ann',
    partner: 'Cal',
    bid: 80,
    bidderTeamPoints: 90,
    handTotal: 180,
    players
  });
  assert.equal(made.made, true);
  assert.equal(made.otherTeamPoints, 90);
  assert.deepEqual(made.scores, { Ann: 90, Bea: 90, Cal: 90, Dee: 90 });

  const set = Scorebook.rookHandScores({
    bidder: 'Ann',
    partner: 'Cal',
    bid: 80,
    bidderTeamPoints: 70,
    handTotal: 180,
    players
  });
  assert.equal(set.made, false);
  assert.equal(set.otherTeamPoints, 110);
  assert.deepEqual(set.scores, { Ann: -80, Bea: 110, Cal: -80, Dee: 110 });
});

test('renaming a Hand and Foot player moves the round parts; a same-match merge is refused', () => {
  const game = {
    name: 'Hand and Foot',
    originalRoster: ['Ann', 'Bo'],
    totals: { Ann: 500, Bo: 100 },
    rounds: [{
      round: 1,
      scores: { Ann: 500, Bo: 100 },
      handFootParts: {
        Ann: { cleanCanastas: 1, dirtyCanastas: 0, sevensCanastas: 0, redThrees: 0, goingOut: 0, cardPoints: 0, cardsLeft: 0, roundScore: 500 },
        Bo: { cleanCanastas: 0, dirtyCanastas: 0, sevensCanastas: 0, redThrees: 1, goingOut: 0, cardPoints: 0, cardsLeft: 0, roundScore: 100 }
      }
    }]
  };
  Scorebook.applyPlayerNameOnGame(game, 'Ann', 'Annie', false);
  assert.equal(game.rounds[0].handFootParts.Annie.cleanCanastas, 1);
  assert.equal(game.rounds[0].handFootParts.Ann, undefined);
  assert.equal(game.rounds[0].scores.Annie, 500);
  assert.deepEqual(game.originalRoster, ['Annie', 'Bo']);

  const beforeMerge = JSON.parse(JSON.stringify(game));
  Scorebook.applyPlayerNameOnGame(game, 'Annie', 'Bo', true);
  assert.deepEqual(game, beforeMerge);
  assert.equal(game.totals.Annie, 500);
  assert.equal(game.totals.Bo, 100);
});

test('merging Hand and Foot history from a different night adds the points once', () => {
  const night = {
    name: 'Hand and Foot',
    originalRoster: ['Annie'],
    totals: { Annie: 500 },
    rounds: [{
      round: 1,
      scores: { Annie: 500 },
      handFootParts: {
        Annie: { cleanCanastas: 1, dirtyCanastas: 0, sevensCanastas: 0, redThrees: 0, goingOut: 0, cardPoints: 0, cardsLeft: 0, roundScore: 500 }
      }
    }]
  };
  Scorebook.applyPlayerNameOnGame(night, 'Annie', 'Bo', true);
  assert.equal(night.totals.Bo, 500);
  assert.equal(night.totals.Annie, undefined);
  assert.equal(night.rounds[0].scores.Bo, 500);
  assert.equal(night.rounds[0].handFootParts.Bo.cleanCanastas, 1);
  assert.equal(night.rounds[0].handFootParts.Annie, undefined);
  assert.deepEqual(night.originalRoster, ['Bo']);
});

test('Add Player suggestions spread profile names and drop comma ghosts', () => {
  const allPlayers = ['Megan', 'Matt', 'Mike', 'Michelle'];
  const profiles = {
    Megan: {},
    Matt: {},
    Mike: {},
    Cat: {},
    Michelle: {},
    'MEGAN,MATT,CAT,MIKE': {}
  };
  const mid = Scorebook.playerSuggestionMatches(allPlayers, profiles, 'm', ['Megan', 'Matt', 'Mike']);
  assert.deepEqual(mid, ['Michelle']);
  assert.equal(mid.some((name) => name.includes(',')), false);
  const home = Scorebook.playerSuggestionMatches(allPlayers, profiles, 'm', ['Megan', 'Matt']);
  assert.deepEqual(home, ['Michelle', 'Mike']);
  assert.equal(home.some((name) => name.includes(',')), false);
  assert.equal(Scorebook.isUsablePlayerName('MEGAN,MATT,CAT,MIKE'), false);
  assert.equal(Scorebook.isUsablePlayerName('Michelle'), true);
  assert.equal(Scorebook.isUsablePlayerName('🔥June'), true);
  assert.equal(Scorebook.isUsablePlayerName('June June'), true);
  assert.equal(Scorebook.isUsablePlayerName(''), false);
});

test('comma-joined ghost cleanup is idempotent and leaves history alone', () => {
  const history = [{ id: 1, originalRoster: ['Megan', 'Matt'], totals: { Megan: 10, Matt: 12 } }];
  const first = Scorebook.cleanupCommaJoinedGhosts({
    allPlayers: ['Megan', 'Matt', 'Mike', 'Cat', 'MEGAN,MATT,CAT,MIKE'],
    players: ['Megan', 'Matt', 'MEGAN,MATT,CAT,MIKE'],
    playerProfiles: { Megan: {}, Matt: {}, Mike: {}, Cat: {}, 'MEGAN,MATT,CAT,MIKE': { avatar: 'x' } }
  });
  assert.equal(first.changed, true);
  assert.deepEqual(first.allPlayers, ['Megan', 'Matt', 'Mike', 'Cat']);
  assert.deepEqual(first.players, ['Megan', 'Matt']);
  assert.equal(first.playerProfiles['MEGAN,MATT,CAT,MIKE'], undefined);
  assert.equal(history[0].originalRoster.includes('MEGAN,MATT,CAT,MIKE'), false);
  const second = Scorebook.cleanupCommaJoinedGhosts(first);
  assert.equal(second.changed, false);
  assert.deepEqual(second.allPlayers, first.allPlayers);
  const odd = Scorebook.cleanupCommaJoinedGhosts({
    allPlayers: ['Smith, John'],
    players: [],
    playerProfiles: { 'Smith, John': {} }
  });
  assert.equal(odd.changed, false);
  assert.deepEqual(odd.kept, ['Smith, John']);
});

test('the live page still uses the same Wizard, 818, and Rook formulas', async () => {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const html = await readFile(join(process.cwd(), 'public', 'index.html'), 'utf8');
  assert.match(html, /scores\[p\]=\(bid===act\)\?20\+\(10\*act\):-10\*Math\.abs\(bid-act\)/);
  assert.match(html, /function calculate818Score\(bid, actual\)\{[\s\S]*?return a\+\(a===b\?10:0\);/);
  assert.match(html, /if\(madeIt\)\{\s*scores\[bidder\]=bidderTeamPts;\s*scores\[partner\]=bidderTeamPts;\s*opponents\.forEach\(p=>scores\[p\]=oppCounters\);/);
  assert.match(html, /scores\[bidder\]=-bid;\s*scores\[partner\]=-bid;\s*opponents\.forEach\(p=>scores\[p\]=oppCounters\);/);
});

test('Wizard bid blanks are missing, not range errors', () => {
  const result = Scorebook.validateEntries({
    game: 'Wizard',
    kind: 'bids',
    roundNumber: 1,
    players: ['Matt', 'Cat', 'Mike'],
    values: { Matt: '', Cat: 1, Mike: '0' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing');
  assert.deepEqual(result.missingPlayers, ['Matt']);
  assert.match(result.message, /Still need a bid from Matt/);
});

test('Wizard bid out-of-range stays a range error', () => {
  const result = Scorebook.validateEntries({
    game: 'Wizard',
    kind: 'bids',
    roundNumber: 1,
    players: ['Matt', 'Cat'],
    values: { Matt: 2, Cat: 0 }
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid');
  assert.deepEqual(result.invalidPlayers, ['Matt']);
  assert.match(result.message, /bids must be from 0 to 1/);
});

test('backspace to blank clears acknowledged', () => {
  let next = Scorebook.applyScoreEntryKey({ value: '1', acknowledged: true }, 'backspace');
  assert.equal(next.value, '');
  assert.equal(next.acknowledged, false);
  next = Scorebook.applyScoreEntryKey({ value: '', acknowledged: false }, '0');
  assert.equal(next.value, '0');
  assert.equal(next.acknowledged, true);
  next = Scorebook.applyScoreEntryKey({ value: '', acknowledged: false, mode: 'bids' }, '0');
  assert.equal(next.value, '0');
  assert.equal(next.acknowledged, false);
});

test('score entry status distinguishes not entered, entered 0, and confirmed', () => {
  assert.equal(Scorebook.scoreEntryStatus({ value: '', acknowledged: false, mode: 'bids' }).label, 'Not entered');
  assert.equal(Scorebook.scoreEntryStatus({ value: '0', acknowledged: false, mode: 'bids' }).label, 'Entered 0');
  assert.equal(Scorebook.scoreEntryStatus({ value: '0', acknowledged: true, mode: 'bids' }).label, '✓ Confirmed: 0');
  assert.equal(Scorebook.scoreEntryStatus({ value: '1', acknowledged: true, mode: 'bids' }).label, '✓ Confirmed: 1');
});

test('isFullGame derives from stored rounds and does not guess Rook targets', () => {
  const five = {
    game: 'Five Crowns',
    completed: true,
    maxRounds: 11,
    rounds: Array.from({ length: 3 }, (_, i) => ({ round: i + 1, scores: { Matt: 5 } })),
    totals: { Matt: 15 }
  };
  assert.equal(Scorebook.isFullGame(five), false);
  assert.equal(Scorebook.isEndedEarlyMatch({ ...five, endedEarly: true }), true);

  const full = {
    ...five,
    endedEarly: false,
    rounds: Array.from({ length: 11 }, (_, i) => ({ round: i + 1, scores: { Matt: 5 } })),
    totals: { Matt: 55 }
  };
  assert.equal(Scorebook.isFullGame(full), true);
  assert.equal(Scorebook.isEndedEarlyMatch(full), false);

  const rookNoTarget = {
    game: 'Rook',
    completed: true,
    totals: { Matt: 400, Cat: 200 },
    rounds: [{ round: 1, scores: { Matt: 400, Cat: 200 } }]
  };
  assert.equal(Scorebook.isFullGame(rookNoTarget), false);

  const rookHit = {
    ...rookNoTarget,
    rookConfig: { winTarget: 300 },
    totals: { Matt: 320, Cat: 180 }
  };
  assert.equal(Scorebook.isFullGame(rookHit), true);

  const flipMissing = {
    game: 'Flip 7 Vengeance',
    totals: { Matt: 40 },
    rounds: [{ round: 1, scores: { Matt: 40 } }]
  };
  assert.equal(Scorebook.isFullGame(flipMissing), false);
  assert.equal(Scorebook.isEndedEarlyMatch(flipMissing), false);

  const flipUnder = {
    game: 'Flip 7 Vengeance',
    completed: true,
    endedEarly: false,
    totals: { Matt: 180, Cat: 150 },
    rounds: [{ round: 1, scores: { Matt: 180, Cat: 150 } }],
    originalRoster: ['Matt', 'Cat']
  };
  assert.equal(Scorebook.isFullGame(flipUnder), false, 'everyone under 200 is not a full Flip 7');
  assert.equal(Scorebook.isEndedEarlyMatch(flipUnder), true);

  const flipHit = {
    game: 'Flip 7 Vengeance',
    completed: true,
    endedEarly: false,
    totals: { Matt: 210, Cat: 150 },
    rounds: [{ round: 1, scores: { Matt: 210, Cat: 150 } }],
    originalRoster: ['Matt', 'Cat']
  };
  assert.equal(Scorebook.isFullGame(flipHit), true, '200+ total qualifies as a full Flip 7');
  assert.equal(Scorebook.isEndedEarlyMatch(flipHit), false);

  const flipRetiredOnly = {
    game: 'Flip 7 Vengeance',
    completed: true,
    totals: { Matt: 50, Cat: 220 },
    retired: ['Cat'],
    rounds: [{ round: 1, scores: { Matt: 50, Cat: 220 } }],
    originalRoster: ['Matt', 'Cat']
  };
  assert.equal(Scorebook.isFullGame(flipRetiredOnly), false, 'retired 200+ does not qualify');
});

test('score entry pending minus then digit keeps the sign on scores', () => {
  let next = Scorebook.applyScoreEntryKey({ value: '', acknowledged: false, mode: 'scores' }, '-');
  assert.equal(next.value, '-');
  next = Scorebook.applyScoreEntryKey({ value: next.value, acknowledged: next.acknowledged, mode: 'scores' }, '5');
  assert.equal(next.value, '-5');
});

test('bid/trick deferAck still appends digits after the first entry', () => {
  let next = Scorebook.applyScoreEntryKey({ value: '3', acknowledged: false, mode: 'tricks', dirty: false }, '3');
  assert.equal(next.value, '3');
  assert.equal(next.acknowledged, false);
  assert.equal(next.dirty, true);
  next = Scorebook.applyScoreEntryKey({ value: next.value, acknowledged: next.acknowledged, mode: 'tricks', dirty: next.dirty }, '3');
  assert.equal(next.value, '33');
  assert.equal(next.acknowledged, false);
});

test('score entry pending minus then digit keeps the sign when dirty', () => {
  let next = Scorebook.applyScoreEntryKey({ value: '', acknowledged: false, mode: 'scores' }, '-');
  assert.equal(next.value, '-');
  next = Scorebook.applyScoreEntryKey({ value: next.value, acknowledged: next.acknowledged, mode: 'scores', dirty: next.dirty }, '5');
  assert.equal(next.value, '-5');
});
