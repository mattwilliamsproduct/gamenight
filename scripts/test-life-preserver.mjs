import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import { QA_SCENARIOS } from '../public/qa/fixtures.mjs';

const require = createRequire(import.meta.url);
const LP = require('../public/assets/life-preserver-logic.js');

const EIGHT = ['Ann', 'Bea', 'Cal', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal'];
const FOUR = ['Ann', 'Bea', 'Cal', 'Dee'];

function scoringRounds(count, players, spread, lastRoundNumber = count) {
  return Array.from({ length: count }, (_, index) => {
    const round = lastRoundNumber - count + index + 1;
    const scores = Object.fromEntries(players.map((player, playerIndex) => [player, playerIndex === 0 ? spread : 0]));
    return { round, scores };
  });
}

function game({
  name,
  players,
  totals,
  roundCount,
  spread,
  currentRound,
  hailMaryUsed = [],
  retired = [],
  extraRounds = [],
  lifePreserverHeld,
  lifePreserverHeldRound
}) {
  const lastRound = (currentRound || roundCount + 1) - 1;
  const data = {
    name,
    originalRoster: [...players],
    totals: { ...totals },
    rounds: [...scoringRounds(roundCount, players, spread, lastRound), ...extraRounds],
    currentRound: currentRound || roundCount + 1,
    hailMaryUsed: [...hailMaryUsed],
    retired: [...retired]
  };
  if (lifePreserverHeld) data.lifePreserverHeld = [...lifePreserverHeld];
  if (lifePreserverHeldRound != null) data.lifePreserverHeldRound = lifePreserverHeldRound;
  return data;
}

function offer(name, totals, options = {}) {
  const players = Object.keys(totals);
  return LP.getLifePreserverOffer(
    game({ name, players, totals, ...options }),
    options.player || players[players.length - 1],
    players,
    options.extra || {}
  );
}

function remaining818(completed) {
  let sum = 0;
  for (let round = completed + 1; round <= 15; round++) sum += 10 + LP.EIGHT18_ROUND_TRICKS[round - 1];
  return sum;
}

function assertNoPodium(result, players, totals) {
  assert.equal(result.eligible, true);
  const first = result.winLow
    ? Math.min(...players.map(player => Number(totals[player]) || 0))
    : Math.max(...players.map(player => Number(totals[player]) || 0));
  for (const slice of result.slices) {
    const next = (totals[result.player] || 0) + slice.adjustment;
    const rank = LP.rankWithScore(result.player, next, players, totals, result.winLow);
    const helpful = (Number(slice.adjustment) || 0) * (result.winLow ? -1 : 1) > 0;
    assert.ok(rank > 1, `slice ${slice.label} landed rank ${rank}`);
    assert.ok(rank >= result.bestAllowedRank, `slice ${slice.label} beat allowed rank ${result.bestAllowedRank}`);
    if (helpful) {
      assert.ok(result.winLow ? next > first : next < first, `slice ${slice.label} matched or passed 1st (${first} → ${next})`);
    }
    assert.ok(!/half|wipe|double|×2|dbl/i.test(slice.label), slice.label);
  }
}

function sliceKind(slice, winLow) {
  const helpful = (Number(slice.adjustment) || 0) * (winLow ? -1 : 1);
  if (helpful > 0) return 'good';
  if (helpful < 0) return 'bad';
  return 'zero';
}

function circularRuns(kinds) {
  const n = kinds.length;
  if (!n) return [];
  if (kinds.every(kind => kind === kinds[0])) return [{ kind: kinds[0], length: n }];
  let start = 0;
  while (start < n && kinds[start] === kinds[(start - 1 + n) % n]) start++;
  const runs = [];
  let index = start;
  do {
    const kind = kinds[index];
    let length = 1;
    index = (index + 1) % n;
    while (index !== start && kinds[index] === kind) {
      length++;
      index = (index + 1) % n;
    }
    runs.push({ kind, length });
  } while (index !== start);
  return runs;
}

function assertMixedWheel(result, label) {
  assert.ok(result.slices.length >= 8, `${label}: expected a full wheel`);
  const kinds = result.slices.map(slice => sliceKind(slice, result.winLow));
  const runs = circularRuns(kinds);
  const sequence = kinds.join(',');
  const maxGood = Math.max(0, ...runs.filter(run => run.kind === 'good').map(run => run.length));
  assert.ok(maxGood <= 2, `${label}: helpful slices still clustered (${sequence})`);
  assert.ok(runs.filter(run => run.kind === 'bad').every(run => run.length === 1), `${label}: setbacks clustered (${sequence})`);
  assert.ok(runs.filter(run => run.kind === 'zero').every(run => run.length === 1), `${label}: zeros clustered (${sequence})`);
  assert.ok(kinds.filter(kind => kind === 'bad').length >= 2, `${label}: expected split setbacks`);
  assert.ok(kinds.filter(kind => kind === 'zero').length >= 2, `${label}: expected split zeros`);
  const helpfulWeights = result.slices
    .filter(slice => sliceKind(slice, result.winLow) === 'good')
    .reduce((sum, slice) => sum + slice.weight, 0);
  const totalWeight = result.slices.reduce((sum, slice) => sum + slice.weight, 0);
  assert.ok(helpfulWeights / totalWeight >= 0.65, `${label}: helpful odds should stay in the majority`);
}

test('818 remaining opportunity uses each upcoming trick count', () => {
  assert.equal(remaining818(4), 155);
  assert.equal(remaining818(14), 18);
  assert.equal(remaining818(13), 35);
  assert.equal(LP.ruleUnitForRound('818', 15), 18);
  assert.equal(LP.ruleUnitForRound('818', 8), 11);
});

test('close 818 player with many rounds left does not qualify', () => {
  const totals = { Ann: 50, Bea: 48, Cal: 47, Dee: 46, Eve: 45, Fay: 44, Gus: 40, Hal: 21 };
  const result = offer('818', totals, { roundCount: 4, spread: 15, player: 'Hal' });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'recovery-load');
  assert.equal(result.leaderGap, 29);
});

test('tight late 818 table unlocks at about a made-bid deficit', () => {
  const six = { Ann: 100, Bea: 98, Cal: 94, Dee: 93, Eve: 91, Fay: 83 };
  const late = offer('818', six, { roundCount: 13, spread: 16, currentRound: 14, player: 'Fay' });
  assert.equal(late.rank, 6);
  assert.equal(late.leaderGap, 17);
  assert.equal(late.eligible, true, '17 behind 1st in late 818 with two rounds left should get a Life Preserver');
  assert.ok(late.upcomingOpportunity <= 12, `818 catch-up should be a made bid, got ${late.upcomingOpportunity}`);

  const lastRound = offer('818', six, { roundCount: 14, spread: 17, currentRound: 15, player: 'Fay' });
  assert.equal(lastRound.eligible, true);

  const stillEarly = offer('818', six, { roundCount: 8, spread: 12, currentRound: 9, player: 'Fay' });
  assert.equal(stillEarly.eligible, false);
  assert.equal(stillEarly.reason, 'recovery-load');
});

test('818 12-point gap on the final 8-trick round qualifies', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 85 };
  const result = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(result.eligible, true);
  assert.equal(result.leaderGap, 15);
  assert.ok(result.upcomingOpportunity <= 12);
});

test('818 8-point last-round gap vs 1st stays in ordinary range', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 94, Hal: 92 };
  const result = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(result.leaderGap, 8);
  assert.equal(result.eligible, false);
  assert.ok(result.reason === 'leader-gap' || result.reason === 'recovery-load');
});

test('818 20-point gap with 1-2 rounds left can qualify with a conservative wheel', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 77 };
  const lastRound = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(lastRound.eligible, true);
  assert.ok(lastRound.maxSafeAdjustment <= 15);
  assert.ok(lastRound.slices.every(slice => slice.adjustment <= 15));
  assertNoPodium(lastRound, EIGHT, totals);

  const twoLeft = offer('818', totals, { roundCount: 13, spread: 16, currentRound: 14, player: 'Hal' });
  assert.equal(twoLeft.eligible, true);
  assert.ok(twoLeft.maxSafeAdjustment <= 15);
});

test('818 18-point hole with a few rounds left needs a Life Preserver; Wizard does not', () => {
  const totals = { Ann: 100, Bea: 98, Cal: 96, Dee: 93, Eve: 91, Fay: 88, Gus: 85, Hal: 75 };
  const eight18 = offer('818', totals, { roundCount: 11, spread: 14, currentRound: 12, player: 'Hal' });
  assert.equal(eight18.leaderGap, 25);
  assert.equal(eight18.eligible, true);

  const wizardTotals = { Ann: 200, Bea: 190, Cal: 180, Dee: 170, Eve: 160, Fay: 150, Gus: 140, Hal: 120 };
  const wizard = offer('Wizard', wizardTotals, { roundCount: 3, spread: 50, currentRound: 4, player: 'Hal' });
  assert.equal(wizard.leaderGap, 80);
  assert.equal(wizard.eligible, false);
});

test('the same 20-point gap can qualify in 818 but not late Wizard', () => {
  const totals = { Ann: 200, Bea: 198, Cal: 196, Dee: 194, Eve: 190, Fay: 188, Gus: 180, Hal: 174 };
  const eight18 = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  const wizard = offer('Wizard', totals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assert.equal(eight18.leaderGap, 26);
  assert.equal(wizard.leaderGap, 26);
  assert.equal(eight18.eligible, true);
  assert.equal(wizard.eligible, false);
});

test('Wizard 50-point last-round hole vs 1st is still ordinary play', () => {
  const totals = { Ann: 220, Bea: 215, Cal: 210, Dee: 205, Eve: 200, Fay: 190, Gus: 180, Hal: 170 };
  const result = offer('Wizard', totals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assert.equal(result.leaderGap, 50);
  assert.equal(result.eligible, false);
  assert.ok(result.reason === 'leader-gap' || result.reason === 'recovery-load');
  assert.ok(result.upcomingOpportunity >= 50);
});

test('Wizard upcoming opportunity grows in later rounds', () => {
  const totals = { Ann: 80, Bea: 78, Cal: 76, Dee: 74, Eve: 40, Fay: 38, Gus: 20, Hal: 10 };
  const early = offer('Wizard', totals, { roundCount: 3, spread: 50, currentRound: 4, player: 'Hal' });
  const late = offer('Wizard', totals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assert.ok(late.upcomingOpportunity > early.upcomingOpportunity);
  assert.equal(LP.ruleUnitForRound('Wizard', 3), 50);
  assert.equal(LP.ruleUnitForRound('Wizard', 7), 90);
});

test('Wizard rescue never exceeds 60 even when the rule unit is huge', () => {
  const totals = { Ann: 400, Bea: 390, Cal: 380, Dee: 370, Eve: 200, Fay: 180, Gus: 120, Hal: 40 };
  const result = offer('Wizard', totals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assert.equal(result.eligible, true);
  assert.ok(result.upcomingOpportunity >= 90);
  assert.ok(result.maxSafeAdjustment <= 60);
  assert.ok(result.slices.every(slice => Math.abs(slice.adjustment) <= 60));
  assertNoPodium(result, EIGHT, totals);
});

test('Five Crowns treats score reductions as helpful', () => {
  const totals = { Ann: 20, Bea: 24, Cal: 28, Dee: 32, Eve: 48, Fay: 60, Gus: 150, Hal: 165 };
  const result = offer('Five Crowns', totals, { roundCount: 7, spread: 22, currentRound: 8, player: 'Gus' });
  assert.equal(result.eligible, true);
  assert.equal(result.winLow, true);
  const helpful = result.slices.filter(slice => slice.adjustment < 0);
  const setbacks = result.slices.filter(slice => slice.adjustment > 0);
  assert.ok(helpful.length >= 4);
  assert.ok(setbacks.length >= 2);
  assert.ok(result.maxSafeAdjustment <= 60);
  assert.ok(result.maxSafeAdjustment > 20);
  assertNoPodium(result, EIGHT, totals);
});

test('Flip 7 uses a 2.5-unit test and ignores one extreme round', () => {
  const players = EIGHT;
  const totals = { Ann: 140, Bea: 130, Cal: 128, Dee: 126, Eve: 80, Fay: 70, Gus: 40, Hal: 20 };
  const rounds = [
    { round: 1, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 22 : 0])) },
    { round: 2, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 22 : 0])) },
    { round: 3, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 22 : 0])) },
    { round: 4, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 200 : 0])) }
  ];
  const close = LP.getLifePreserverOffer(game({
    name: 'Flip 7 Vengeance',
    players,
    totals: { ...totals, Hal: 100 },
    roundCount: 0,
    spread: 22,
    extraRounds: rounds
  }), 'Hal', players);
  const stranded = LP.getLifePreserverOffer(game({
    name: 'Flip 7 Vengeance',
    players,
    totals,
    roundCount: 0,
    spread: 22,
    extraRounds: rounds
  }), 'Hal', players);
  assert.equal(close.eligible, false);
  assert.equal(stranded.eligible, true);
  assert.ok(stranded.comebackUnit <= 40);
  assert.ok(stranded.maxSafeAdjustment <= 40);
});

test('runaway 1st unlocks everyone who cannot catch them, including 2nd', () => {
  const totals = { Ann: 200, Bea: 50, Cal: 49, Dee: 48, Eve: 47, Fay: 46, Gus: 45, Hal: 44 };
  const second = offer('818', totals, { roundCount: 10, spread: 15, currentRound: 11, player: 'Bea' });
  const last = offer('818', totals, { roundCount: 10, spread: 15, currentRound: 11, player: 'Hal' });
  const leader = offer('818', totals, { roundCount: 10, spread: 15, currentRound: 11, player: 'Ann' });
  assert.equal(second.eligible, true);
  assert.equal(second.rank, 2);
  assert.equal(last.eligible, true);
  assert.equal(leader.eligible, false);
  assert.equal(leader.reason, 'leading');
});

test('2nd close to 1st does not get a Life Preserver', () => {
  const totals = { Ann: 100, Bea: 96, Cal: 70, Dee: 68, Eve: 66, Fay: 64, Gus: 62, Hal: 40 };
  const second = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Bea' });
  const last = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(second.leaderGap, 4);
  assert.equal(second.eligible, false);
  assert.equal(last.eligible, true);
});

test('multiple genuinely stranded players can qualify', () => {
  const totals = { Ann: 120, Bea: 118, Cal: 116, Dee: 114, Eve: 30, Fay: 24, Gus: 18, Hal: 10 };
  const eve = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Eve' });
  const hal = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(eve.eligible, true);
  assert.equal(hal.eligible, true);
});

test('818 last-round explanation names the one-round cap', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 77 };
  const result = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  const explained = LP.explainLifePreserverOffer(result);
  assert.equal(result.eligible, true);
  assert.equal(result.bindingLimit, 'one-round');
  assert.match(explained.summary, /8th of 8/);
  assert.ok(explained.bullets.some(bullet => /one strong remaining round/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /\+15/.test(bullet)));
});

test('used and retired players cannot qualify', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 70 };
  const used = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal', hailMaryUsed: ['Hal'] });
  const retired = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal', retired: ['Hal'] });
  assert.equal(used.reason, 'used');
  assert.equal(retired.reason, 'retired');
});

test('hailMaryBonus rounds are excluded from volatility and round counts', () => {
  const totals = { Ann: 50, Bea: 48, Cal: 47, Dee: 46, Eve: 45, Fay: 44, Gus: 40, Hal: 21 };
  const bonus = { round: 0, hailMaryBonus: true, scores: { Ann: 400, Hal: 0 } };
  const withBonus = offer('818', totals, { roundCount: 3, spread: 15, extraRounds: [bonus], player: 'Hal' });
  const without = offer('818', totals, { roundCount: 3, spread: 15, player: 'Hal' });
  assert.equal(withBonus.reason, 'too-early');
  assert.equal(without.reason, 'too-early');
});

test('8-player and 4-player ceilings are second; never first', () => {
  const eightTotals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 40, Fay: 30, Gus: 20, Hal: 10 };
  const eight = offer('818', eightTotals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(eight.bestAllowedRank, 2);
  assertNoPodium(eight, EIGHT, eightTotals);

  const fourTotals = { Ann: 80, Bea: 78, Cal: 40, Dee: 20 };
  const four = offer('818', fourTotals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Dee' });
  assert.equal(four.eligible, true);
  assert.equal(four.bestAllowedRank, 2);
  assertNoPodium(four, FOUR, fourTotals);
});

test('a huge helpful extra stops at least one step behind first', () => {
  const totals = { Ann: 20, Bea: 25, Cal: 52, Dee: 90 };
  const result = offer('Five Crowns', totals, { roundCount: 10, spread: 20, currentRound: 11, player: 'Cal' });
  assert.equal(result.eligible, true);
  assert.equal(result.bestAllowedRank, 2);
  const jackpot = result.slices.reduce((best, slice) => {
    const help = -(Number(slice.adjustment) || 0);
    return help > best ? help : best;
  }, 0);
  const after = totals.Cal - jackpot;
  assert.ok(after > totals.Ann, `jackpot landed ${after}, which is not behind 1st (${totals.Ann})`);
  assertNoPodium(result, FOUR, totals);
});

test('last-hand Five Crowns sizes Megan under a leftover, and caps Duke at 60', () => {
  const totals = { Matt: 0, Cat: 0, Michelle: 0, Mike: 0, Linda: 18, Vikki: 20, Megan: 49, Duke: 102 };
  const players = Object.keys(totals);
  const g = game({
    name: 'Five Crowns',
    players,
    totals,
    roundCount: 10,
    spread: 37,
    currentRound: 11,
    lifePreserverHeld: ['Megan', 'Duke'],
    lifePreserverHeldRound: 11
  });
  const megan = LP.getLifePreserverOffer(g, 'Megan', players);
  const duke = LP.getLifePreserverOffer(g, 'Duke', players);
  assert.equal(megan.eligible, true);
  assert.equal(megan.leaderGap, 49);
  assert.equal(megan.remainingRounds, 1);
  assert.equal(megan.bindingLimit, 'hole');
  assert.equal(megan.maxSafeAdjustment, 30);
  assert.ok(49 - megan.maxSafeAdjustment > 10, 'a 10-point leftover by 1st should not hand Megan the win');
  assert.equal(duke.eligible, true);
  assert.equal(duke.leaderGap, 102);
  assert.equal(duke.maxSafeAdjustment, 60);
  assert.equal(duke.gameSafetyCap, 60);
  assert.equal(duke.bindingLimit, 'game-cap');
  assertNoPodium(megan, players, totals);
  assertNoPodium(duke, players, totals);
  const explained = LP.explainLifePreserverOffer(megan);
  assert.match(explained.wheelLine, /Best help −30/);
  assert.ok(explained.bullets.some(bullet => /remaining 1 hand still has to do some of the work/.test(bullet)));
});

test('Rook and Beat the Heat stay ineligible', () => {
  const totals = { Ann: 100, Bea: 90, Cal: 20, Dee: 10 };
  assert.equal(offer('Rook', totals, { roundCount: 6, spread: 20, player: 'Dee' }).reason, 'unsupported-game');
  assert.equal(offer('Beat the Heat', totals, { roundCount: 6, spread: 8, player: 'Dee' }).reason, 'unsupported-game');
});

test('crushed Five Crowns Brick gets a real rescue without reaching the podium', () => {
  const currentGame = QA_SCENARIOS['five-crowns-preservers'].data.currentGame;
  const players = currentGame.originalRoster;
  const result = LP.getLifePreserverOffer(currentGame, 'Brick', players);
  const totals = currentGame.totals;
  assert.equal(result.eligible, true);
  assert.equal(totals.Brick, 150);
  assert.equal(result.rank, 7);
  assert.ok(result.leaderGap >= 100);
  assert.ok(result.maxSafeAdjustment > 20, `expected a rescue above 20, got ${result.maxSafeAdjustment}`);
  assert.ok(result.maxSafeAdjustment >= 50, `expected Brick's jackpot around 50-60, got ${result.maxSafeAdjustment}`);
  assert.ok(result.maxSafeAdjustment <= 60);
  const helpfulWeights = result.slices.filter(slice => slice.adjustment < 0).reduce((sum, slice) => sum + slice.weight, 0);
  const totalWeight = result.slices.reduce((sum, slice) => sum + slice.weight, 0);
  assert.ok(helpfulWeights / totalWeight >= 0.8);
  assertNoPodium(result, players, totals);
  const afterJackpot = totals.Brick - result.maxSafeAdjustment;
  const firstScore = Math.min(...players.map(player => Number(totals[player]) || 0));
  assert.ok(afterJackpot > firstScore, 'jackpot must not match or pass 1st');
  const explained = LP.explainLifePreserverOffer(result);
  assert.equal(result.remainingRounds, 3);
  assert.equal(result.bindingLimit, 'game-cap');
  assert.match(explained.wheelLine, /behind 1st/);
  assert.match(explained.wheelLine, /−60/);
  assert.match(explained.summary, /7th of 8/);
  assert.match(explained.summary, /1st/);
  assert.ok(explained.bullets.some(bullet => /Five Crowns scores low/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /3 hands left/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /will not give more than that/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /−15/.test(bullet) && /−30/.test(bullet) && /−45/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /red slices are modest setbacks/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /\+10/.test(bullet)));
});

test('Five Crowns QA fixture still has one available and one used Life Preserver', () => {
  const currentGame = QA_SCENARIOS['five-crowns-preservers'].data.currentGame;
  const players = currentGame.originalRoster.filter(player => !(currentGame.retired || []).includes(player));
  const available = players.filter(player => LP.getLifePreserverOffer(currentGame, player, players).eligible);
  const used = players.filter(player => (currentGame.hailMaryUsed || []).includes(player));
  assert.ok(available.length >= 1, `expected an available Life Preserver, got ${available.join(',') || 'none'}`);
  assert.ok(used.length >= 1, 'expected a used Life Preserver');
  assert.ok(!available.includes('Linda'));
});

test('capping a result cannot place the player first after standings change', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 40, Fay: 30, Gus: 20, Hal: 10 };
  const live = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  const capped = LP.capLifePreserverAdjustment(80, live);
  const rank = LP.rankWithScore('Hal', totals.Hal + capped, EIGHT, totals, false);
  assert.ok(capped <= live.maxSafeAdjustment);
  assert.ok(rank > 1);
  assert.ok(rank >= live.bestAllowedRank);
  assert.ok(totals.Hal + capped < totals.Ann);
});

test('undo only frees Life Preservers whose bonus rounds were removed', () => {
  const used = ['Linda', 'Brick'];
  const kept = LP.releaseRemovedLifePreservers(used, [{ round: 8, scores: { Megan: 22 } }]);
  assert.deepEqual(kept, ['Linda', 'Brick']);
  const released = LP.releaseRemovedLifePreservers(used, [
    { round: 8, scores: { Megan: 22 } },
    { round: 0, hailMaryBonus: true, scores: { Brick: -75 } }
  ]);
  assert.deepEqual(released, ['Linda']);
});

test('a mid-game joiner on a bonus round is not treated as the spinner', () => {
  const used = ['Brick'];
  const bonus = {
    round: 0,
    hailMaryBonus: true,
    scores: { Brick: -75, Alexis: 0 },
    joinBonus: { Alexis: true }
  };
  assert.deepEqual(LP.lifePreserverPlayersFromRound(bonus, used), ['Brick']);
  assert.deepEqual(LP.releaseRemovedLifePreservers(['Linda', 'Brick'], [bonus]), ['Linda']);
  const leftover = {
    round: 0,
    hailMaryBonus: true,
    scores: { Brick: -75, Alexis: 0 }
  };
  assert.deepEqual(LP.lifePreserverPlayersFromRound(leftover, used), ['Brick']);
});

test('Wizard max rounds stay frozen when the active table shrinks', () => {
  const totals = { Ann: 80, Bea: 78, Cal: 76, Dee: 74, Eve: 40, Fay: 38, Gus: 20, Hal: 10 };
  const g = game({ name: 'Wizard', players: EIGHT, totals, roundCount: 6, spread: 80, currentRound: 7 });
  assert.equal(LP.getMaxRounds(g, EIGHT), 7);
  g.maxRounds = 7;
  g.retired = ['Ann'];
  const seven = EIGHT.filter(player => player !== 'Ann');
  assert.equal(LP.getMaxRounds(g, seven), 7);
  delete g.maxRounds;
  g.originalRoster = [...EIGHT];
  assert.equal(LP.getMaxRounds(g, seven), 7);
});

test('Life Preserver slices mix greens with reds and zeros instead of clustering', () => {
  const lastRoundTotals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 77 };
  const lastRound = offer('818', lastRoundTotals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assertMixedWheel(lastRound, '818 last round');

  const wizardTotals = { Ann: 400, Bea: 390, Cal: 380, Dee: 370, Eve: 200, Fay: 180, Gus: 120, Hal: 40 };
  const wizard = offer('Wizard', wizardTotals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assertMixedWheel(wizard, 'Wizard');

  const fiveCrowns = LP.getLifePreserverOffer(
    QA_SCENARIOS['five-crowns-preservers'].data.currentGame,
    'Brick',
    QA_SCENARIOS['five-crowns-preservers'].data.currentGame.originalRoster
  );
  assertMixedWheel(fiveCrowns, 'Five Crowns Brick');

  const adjacentSameValue = fiveCrowns.slices.some((slice, index) => {
    const next = fiveCrowns.slices[(index + 1) % fiveCrowns.slices.length];
    return slice.adjustment === next.adjustment && slice.color === next.color;
  });
  assert.equal(adjacentSameValue, false, `identical slices should not sit next to each other: ${fiveCrowns.slices.map(slice => slice.label).join(' | ')}`);
});

test('Life Preserver rules copy is plain language and game-specific', () => {
  const eight18 = LP.explainLifePreserverRules('818');
  assert.equal(eight18.supported, true);
  assert.match(eight18.lead, /818/);
  assert.ok(eight18.how.some(line => /4 rounds/.test(line)));
  assert.ok(eight18.how.some(line => /not in 1st/.test(line)));
  assert.ok(eight18.how.some(line => /made bids/.test(line)));
  assert.ok(eight18.how.some(line => /stays for this scoring period/.test(line)));
  assert.ok(eight18.wheel.some(line => /cannot match or pass 1st/.test(line)));

  const wizard = LP.explainLifePreserverRules('Wizard');
  assert.ok(wizard.how.some(line => /50 to 90/.test(line)));
  assert.ok(wizard.how.some(line => /20 or even 50 down/.test(line)));

  const crowns = LP.explainLifePreserverRules('Five Crowns');
  assert.ok(crowns.how.some(line => /4 hands/.test(line)));
  assert.ok(crowns.how.some(line => /Low score wins/.test(line)));
  assert.ok(crowns.wheel.some(line => /subtracts/.test(line)));

  const flip7 = LP.explainLifePreserverRules('Flip 7 Vengeance');
  assert.match(flip7.lead, /Flip 7/);
  assert.ok(flip7.how.some(line => /two and a half strong banks/.test(line)));

  const rook = LP.explainLifePreserverRules('Rook');
  assert.equal(rook.supported, false);
  assert.match(rook.lead, /does not use Life Preservers/);
});

test('threshold QA fixtures unlock only Duke at the first legal hole', () => {
  const cases = [
    ['eight18-life-preserver-threshold', '818', 123],
    ['wizard-life-preserver-threshold', 'Wizard', 190],
    ['five-crowns-life-preserver-threshold', 'Five Crowns', 54],
    ['flip7-life-preserver-threshold', 'Flip 7 Vengeance', 112]
  ];
  for (const [id, gameName, dukeTotal] of cases) {
    const currentGame = QA_SCENARIOS[id].data.currentGame;
    assert.equal(currentGame.name, gameName);
    assert.equal(currentGame.totals.Duke, dukeTotal);
    const players = currentGame.originalRoster;
    const ready = players.filter(player => LP.getLifePreserverOffer(currentGame, player, players).eligible);
    assert.deepEqual(ready, ['Duke'], `${id} should unlock only Duke, got ${ready.join(',')||'none'}`);
  }
});

test('Life Preserver table summary names who is ready, used, or not there yet', () => {
  const currentGame = QA_SCENARIOS['five-crowns-preservers'].data.currentGame;
  const summary = LP.summarizeLifePreserverTable(currentGame, currentGame.originalRoster);
  assert.equal(summary.rules.supported, true);
  assert.equal(summary.live.timingOpen, true);
  assert.ok(summary.live.ready.includes('Brick'));
  assert.ok(summary.live.used.includes('Linda'));
  assert.match(summary.live.roundLine, /scored/);
  assert.ok(summary.live.catchUp > 0);
  assert.ok(summary.live.leaderPlayer);
});

test('unused Life Preserver holds stay after someone else takes theirs, then re-evaluate next scoring period', () => {
  const totals = { Ann: 140, Bea: 138, Cal: 137, Dee: 136, Eve: 135, Fay: 134, Gus: 111, Hal: 100 };
  const g = game({ name: '818', players: EIGHT, totals, roundCount: 12, spread: 17, currentRound: 13 });
  const firstHold = LP.syncLifePreserverHolds(g, EIGHT);
  assert.deepEqual([...firstHold].sort(), ['Gus', 'Hal']);

  LP.markLifePreserverUsed(g, 'Hal');
  g.totals.Gus = 130;
  const stillHeld = LP.syncLifePreserverHolds(g, EIGHT);
  assert.deepEqual([...stillHeld].sort(), ['Gus']);
  const heldOffer = LP.getLifePreserverOffer(g, 'Gus', EIGHT);
  assert.equal(heldOffer.eligible, true);
  assert.equal(heldOffer.held, true);
  assert.equal(LP.getLifePreserverOffer(g, 'Gus', EIGHT, { honorHold: false }).eligible, false);
  assert.equal(LP.getLifePreserverOffer(g, 'Hal', EIGHT).reason, 'used');

  g.rounds.push({
    round: 13,
    scores: { Ann: 0, Bea: 0, Cal: 0, Dee: 0, Eve: 0, Fay: 0, Gus: 9, Hal: 0 }
  });
  g.totals.Gus = 139;
  g.currentRound = 14;
  const afterScores = LP.syncLifePreserverHolds(g, EIGHT, { reset: true });
  assert.equal(afterScores.includes('Gus'), false);
  assert.equal(LP.getLifePreserverOffer(g, 'Gus', EIGHT).eligible, false);

  g.totals.Gus = 100;
  g.rounds.push({
    round: 14,
    scores: { Ann: 0, Bea: 0, Cal: 0, Dee: 0, Eve: 0, Fay: 0, Gus: -39, Hal: 0 }
  });
  g.currentRound = 15;
  const later = LP.syncLifePreserverHolds(g, EIGHT, { reset: true });
  assert.ok(later.includes('Gus'), `expected Gus to unlock again, got ${later.join(',') || 'none'}`);
  assert.equal(LP.getLifePreserverOffer(g, 'Gus', EIGHT).eligible, true);
  assert.equal(LP.getLifePreserverOffer(g, 'Hal', EIGHT).reason, 'used');
});

test('a held Life Preserver disappears when no helpful result can stay behind first', () => {
  const totals = { Ann: 140, Bea: 138, Cal: 137, Dee: 136, Eve: 135, Fay: 134, Gus: 111, Hal: 100 };
  const g = game({ name: '818', players: EIGHT, totals, roundCount: 12, spread: 17, currentRound: 13 });
  assert.ok(LP.syncLifePreserverHolds(g, EIGHT).includes('Gus'));

  g.totals.Gus = 139;
  const holds = LP.syncLifePreserverHolds(g, EIGHT);
  const offer = LP.getLifePreserverOffer(g, 'Gus', EIGHT);
  assert.equal(holds.includes('Gus'), false);
  assert.equal(offer.eligible, false);
  assert.equal(offer.slices.length, 0);
});
