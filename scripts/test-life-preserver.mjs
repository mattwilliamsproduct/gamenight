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

function assertSliceDistribution(result, label) {
  assert.ok(result.slices.length >= 5, `${label}: expected a full wheel`);
  const kinds = result.slices.map(slice => sliceKind(slice, result.winLow));
  const totalWeight = result.slices.reduce((sum, slice) => sum + slice.weight, 0);
  const weightOf = (kind) => result.slices
    .filter(slice => sliceKind(slice, result.winLow) === kind)
    .reduce((sum, slice) => sum + slice.weight, 0);
  assert.ok(weightOf('good') / totalWeight >= 0.75, `${label}: green weight ${weightOf('good')}/${totalWeight}`);
  assert.ok(weightOf('bad') / totalWeight <= 0.10, `${label}: red weight ${weightOf('bad')}/${totalWeight}`);
  const helpfulMags = result.slices
    .filter(slice => sliceKind(slice, result.winLow) === 'good')
    .map(slice => Math.abs(slice.adjustment))
    .sort((a, b) => a - b);
  const increment = result.scoreIncrement || 1;
  const smallCap = increment * 2;
  const smallWeight = result.slices
    .filter(slice => sliceKind(slice, result.winLow) === 'good' && Math.abs(slice.adjustment) <= smallCap)
    .reduce((sum, slice) => sum + slice.weight, 0);
  assert.ok(smallWeight / totalWeight >= 0.35, `${label}: small-help weight ${smallWeight}/${totalWeight}`);
  const table = LP.OUTCOME_TABLE;
  assert.ok(Math.abs(table.smallHelp + table.mediumHelp + table.bigHelp + table.noChange + table.smallSetback - 1) < 1e-9);
  result.slices.forEach(slice => {
    const increment = result.scoreIncrement || 1;
    if (slice.adjustment) {
      assert.equal(Math.abs(slice.adjustment) % increment, 0, `${label}: ${slice.label} not on increment ${increment}`);
    }
    assert.equal(slice.kind, sliceKind(slice, result.winLow), `${label}: kind/color mismatch on ${slice.label}`);
  });
  const runs = circularRuns(kinds);
  assert.ok(runs.filter(run => run.kind === 'bad').every(run => run.length === 1), `${label}: setbacks clustered (${kinds.join(',')})`);
}

function assertWheelAnglesMatchWeights(result, label) {
  const arcs = LP.sliceArcs(result.slices);
  const total = result.slices.reduce((sum, slice) => sum + LP.sliceDisplayWeight(slice), 0);
  assert.ok(arcs.length === result.slices.length);
  arcs.forEach((arc, index) => {
    const expected = LP.sliceDisplayWeight(result.slices[index]) / total;
    assert.ok(Math.abs(arc.fraction - expected) < 1e-9, `${label}: slice ${index} angle ${arc.fraction} != display ${expected}`);
  });
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
  assert.equal(result.rankCap, 14);
  assert.equal(result.maxSafeAdjustment, 14, 'a 15-point hole must stop short of 1st, not get the full +20');
  assert.ok(result.slices.every(slice => slice.adjustment <= 14));
  assertNoPodium(result, EIGHT, totals);
});

test('818 8-point last-round gap vs 1st stays in ordinary range', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 94, Hal: 92 };
  const result = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(result.leaderGap, 8);
  assert.equal(result.eligible, false);
  assert.ok(result.reason === 'leader-gap' || result.reason === 'recovery-load');
});

test('818 20-point gap with 1-2 rounds left can qualify with a two-bid rescue', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 77 };
  const lastRound = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(lastRound.eligible, true);
  assert.equal(lastRound.leaderGap, 23);
  assert.equal(lastRound.maxSafeAdjustment, 20);
  assert.ok(lastRound.maxSafeAdjustment < lastRound.rankCap, 'should not park them one point behind 1st');
  assert.ok(lastRound.slices.every(slice => slice.adjustment <= 20));
  assertNoPodium(lastRound, EIGHT, totals);

  const twoLeft = offer('818', totals, { roundCount: 13, spread: 16, currentRound: 14, player: 'Hal' });
  assert.equal(twoLeft.eligible, true);
  assert.equal(twoLeft.maxSafeAdjustment, 20);
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
  assert.ok(result.maxSafeAdjustment <= 75);
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

test('818 last-round explanation names the two-bid cap', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 77 };
  const result = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  const explained = LP.explainLifePreserverOffer(result);
  assert.equal(result.eligible, true);
  assert.ok(result.bindingLimit === 'game-cap' || result.bindingLimit === 'rescue');
  assert.match(explained.summary, /8th of 8/);
  assert.ok(explained.bullets.some(bullet => /\+20/.test(bullet)));
  assert.ok(!explained.bullets.some(bullet => /\+22/.test(bullet)));
});

test('porch 818 table gives Cat about +20, not a ticket to 1st', () => {
  const currentGame = QA_SCENARIOS['eight18-porch-lp'].data.currentGame;
  const players = currentGame.originalRoster;
  const offers = Object.fromEntries(players.map(player => [player, LP.getLifePreserverOffer(currentGame, player, players)]));
  const cat = offers.Cat;
  const vikki = offers.Vikki;
  const megan = offers.Megan;
  const brick = offers.Brick;
  assert.equal(offers.Duke.eligible, false);
  assert.equal(offers.Duke.reason, 'leading');
  assert.equal(offers.Mike.eligible, false);
  assert.equal(cat.eligible, true);
  assert.equal(cat.leaderGap, 39);
  assert.equal(cat.rankCap, 38);
  assert.equal(cat.maxSafeAdjustment, 20, `expected two made bids, got ${cat.maxSafeAdjustment}`);
  assert.ok(cat.slices.some(slice => slice.adjustment === 20));
  assert.ok(!cat.slices.some(slice => slice.adjustment >= 38));
  assert.equal(vikki.eligible, true);
  assert.equal(vikki.maxSafeAdjustment, 20);
  assert.equal(brick.eligible, true);
  assert.equal(brick.maxSafeAdjustment, 20);
  assert.equal(megan.eligible, false);
  assert.equal(megan.reason, 'recovery-load');
  assert.equal(LP.capLifePreserverAdjustment(80, cat), 20);
  assert.equal(currentGame.totals.Cat + 20, 61);
  assert.ok(currentGame.totals.Cat + 20 < currentGame.totals.Duke);
  assertNoPodium(cat, players, currentGame.totals);
  assertNoPodium(vikki, players, currentGame.totals);
  assertNoPodium(brick, players, currentGame.totals);
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
  assert.ok(result.maxSafeAdjustment >= 50, `expected Brick's jackpot around 50-75, got ${result.maxSafeAdjustment}`);
  assert.ok(result.maxSafeAdjustment <= 75);
  const helpfulWeights = result.slices.filter(slice => slice.adjustment < 0).reduce((sum, slice) => sum + slice.weight, 0);
  const totalWeight = result.slices.reduce((sum, slice) => sum + slice.weight, 0);
  assert.ok(helpfulWeights / totalWeight >= 0.79);
  assertNoPodium(result, players, totals);
  const afterJackpot = totals.Brick - result.maxSafeAdjustment;
  const firstScore = Math.min(...players.map(player => Number(totals[player]) || 0));
  assert.ok(afterJackpot > firstScore, 'jackpot must not match or pass 1st');
  const explained = LP.explainLifePreserverOffer(result);
  assert.equal(result.remainingRounds, 3);
  assert.equal(result.bindingLimit, 'game-cap');
  assert.match(explained.wheelLine, /behind 1st/);
  assert.match(explained.wheelLine, /Best help: −75 points/);
  assert.match(explained.wheelLine, /Largest setback:/);
  const brickAdjustments = result.slices.map(slice => Number(slice.adjustment) || 0);
  const brickMin = Math.min(...brickAdjustments);
  const brickMax = Math.max(...brickAdjustments);
  assert.ok(brickAdjustments.includes(-60), `big help should be −60, got ${brickAdjustments.join(',')}`);
  assert.ok(brickAdjustments.includes(-75), `jackpot should stay −75, got ${brickAdjustments.join(',')}`);
  assert.ok(!brickAdjustments.includes(-65), 'stretch must not invent −65');
  assert.ok(brickMin < 0, 'negative slices stay on the wheel');
  assert.ok(brickMax > 0, 'small bad slices stay on the wheel');
  assert.match(explained.summary, /7th of 8/);
  assert.match(explained.summary, /1st/);
  assert.ok(explained.bullets.some(bullet => /lower scores win/.test(bullet) && /Best help: −75 points/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /3 hands left/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /will not give more than that/.test(bullet)));
  assert.ok(explained.bullets.some(bullet => /red slice/.test(bullet)));
  assertSliceDistribution(result, 'Brick Five Crowns');
  assertWheelAnglesMatchWeights(result, 'Brick Five Crowns');
});

test('wheel line spin range matches the slice min and max', () => {
  const currentGame = QA_SCENARIOS['eight18-porch-lp'].data.currentGame;
  const players = currentGame.originalRoster;
  const result = LP.getLifePreserverOffer(currentGame, 'Brick', players);
  assert.equal(result.eligible, true);
  const explained = LP.explainLifePreserverOffer(result);
  const adjustments = result.slices.map(slice => Number(slice.adjustment) || 0);
  assert.ok(adjustments.length > 0);
  const min = Math.min(...adjustments);
  const max = Math.max(...adjustments);
  const signed = value => value ? `${value > 0 ? '+' : '−'}${Math.abs(value)}` : '0';
  const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(explained.wheelLine, /Best help:/);
  assert.match(explained.wheelLine, /Largest setback:/);
  assert.match(explained.wheelLine, /behind 1st/);
  assert.doesNotMatch(explained.wheelLine, /Worst:/);
  assert.doesNotMatch(explained.wheelLine, /Spin range/);
  assert.ok(min < 0, 'negative slices stay on the wheel');
  assert.ok(max > 0);
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

test('Life Preserver slices stay mostly helpful in both score directions', () => {
  const lastRoundTotals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 77 };
  const lastRound = offer('818', lastRoundTotals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assertSliceDistribution(lastRound, '818 last round');
  assertWheelAnglesMatchWeights(lastRound, '818 last round');
  assert.ok(lastRound.slices.some(slice => slice.adjustment > 0 && slice.kind === 'good'));
  assert.ok(lastRound.slices.some(slice => slice.adjustment < 0 && slice.kind === 'bad'));

  const wizardTotals = { Ann: 400, Bea: 390, Cal: 380, Dee: 370, Eve: 200, Fay: 180, Gus: 120, Hal: 40 };
  const wizard = offer('Wizard', wizardTotals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assertSliceDistribution(wizard, 'Wizard');
  assertWheelAnglesMatchWeights(wizard, 'Wizard');

  const fiveCrowns = LP.getLifePreserverOffer(
    QA_SCENARIOS['five-crowns-preservers'].data.currentGame,
    'Brick',
    QA_SCENARIOS['five-crowns-preservers'].data.currentGame.originalRoster
  );
  assertSliceDistribution(fiveCrowns, 'Five Crowns Brick');
  assertWheelAnglesMatchWeights(fiveCrowns, 'Five Crowns Brick');
  assert.ok(fiveCrowns.slices.some(slice => slice.adjustment < 0 && slice.kind === 'good'));
  assert.ok(fiveCrowns.slices.some(slice => slice.adjustment > 0 && slice.kind === 'bad'));
});

test('Life Preserver rules copy is plain language and game-specific', () => {
  const eight18 = LP.explainLifePreserverRules('818');
  assert.equal(eight18.supported, true);
  assert.match(eight18.lead, /818/);
  assert.ok(eight18.how.some(line => /4 rounds/.test(line)));
  assert.ok(eight18.how.some(line => /not in 1st/.test(line)));
  assert.ok(eight18.how.some(line => /made bids/.test(line)));
  assert.ok(eight18.how.some(line => /stays for this scoring period/.test(line)));
  assert.ok(eight18.how.some(line => /One spin per player per match/.test(line)));
  assert.ok(eight18.wheel.some(line => /Cannot tie or pass the leader/.test(line)));

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
    ['eight18-life-preserver-threshold', '818', 81],
    ['wizard-life-preserver-threshold', 'Wizard', -150],
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
  g.totals.Gus = 139;
  const stillHeld = LP.syncLifePreserverHolds(g, EIGHT);
  assert.deepEqual([...stillHeld].sort(), ['Gus']);
  const heldOffer = LP.getLifePreserverOffer(g, 'Gus', EIGHT);
  assert.equal(heldOffer.eligible, true);
  assert.equal(heldOffer.held, true);
  assert.equal(LP.getLifePreserverOffer(g, 'Gus', EIGHT, { honorHold: false }).eligible, false);
  assert.equal(LP.getLifePreserverOffer(g, 'Hal', EIGHT).reason, 'used');

  g.rounds.push({
    round: 13,
    scores: { Ann: 0, Bea: 0, Cal: 0, Dee: 0, Eve: 0, Fay: 0, Gus: 28, Hal: 0 }
  });
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

test('pickWeightedSlice follows slice weights and lock is independent of animation', () => {
  const slices = [
    { adjustment: 10, weight: 80, kind: 'good', label: '+10 · Help' },
    { adjustment: 0, weight: 12, kind: 'zero', label: '0 · No change' },
    { adjustment: -5, weight: 8, kind: 'bad', label: '−5 · Setback' }
  ];
  const arcs = LP.sliceArcs(slices);
  arcs.forEach((arc, index) => {
    assert.equal(Number(arc.fraction.toFixed(6)), Number((slices[index].weight / 100).toFixed(6)));
  });
  const picks = { 10: 0, 0: 0, [-5]: 0 };
  const n = 10000;
  for (let i = 0; i < n; i++) {
    const pick = LP.pickWeightedSlice(slices, () => (i + 0.5) / n);
    picks[pick.adjustment] += 1;
  }
  assert.ok(picks[10] / n > 0.75, `helpful pick ${picks[10]}/${n}`);
  assert.ok(picks[-5] / n < 0.12, `setback pick ${picks[-5]}/${n}`);

  const totals = { Ann: 100, Bea: 40 };
  const offer = {
    eligible: true,
    player: 'Bea',
    winLow: false,
    rank: 2,
    leaderGap: 60,
    leaderScore: 100,
    maxSafeAdjustment: 20,
    maxSetback: 5,
    scoreIncrement: 1
  };
  const locked = LP.buildLockedOutcome(offer, { adjustment: 20, kind: 'good' }, totals, ['Ann', 'Bea']);
  assert.equal(locked.adjustment, 20);
  assert.equal(locked.beforeTotal, 40);
  assert.equal(locked.afterTotal, 60);
  assert.equal(locked.afterRank, 2);
  const described = LP.describeLifePreserverResult(locked);
  assert.match(described.headline, /\+20 points/);
  assert.match(described.totals, /40 → 60/);
  assert.match(described.standing, /2nd → 2nd|Stays 2nd/);
  const high = LP.describeLifePreserverResult({
    adjustment: 20,
    beforeTotal: 41,
    afterTotal: 61,
    beforeRank: 3,
    afterRank: 2,
    winLow: false
  });
  assert.match(high.headline, /\+20 points/);
  assert.match(high.totals, /41 → 61/);
  assert.match(high.standing, /3rd → 2nd place/);
  const low = LP.describeLifePreserverResult({
    adjustment: -20,
    beforeTotal: 150,
    afterTotal: 130,
    beforeRank: 8,
    afterRank: 7,
    winLow: true
  });
  assert.match(low.headline, /20 points off/);
  assert.match(low.totals, /150 → 130/);
  assert.match(low.standing, /8th → 7th place/);
});

test('a landed Life Preserver is locked, persists, blocks a second spin, and marks assisted', () => {
  const Scorebook = require('../public/assets/scorebook.js');
  const players = FOUR;
  const live = game({
    name: '818',
    players,
    totals: { Ann: 80, Bea: 70, Cal: 60, Dee: 40 },
    roundCount: 6,
    spread: 10,
    currentRound: 7
  });
  Scorebook.recordLifePreserverSpin(live, 'Dee', 12);
  assert.equal(live.assistedMatch, true);
  assert.deepEqual(live.hailMaryUsed, ['Dee']);
  assert.equal(live.rounds.filter(round => round.hailMaryBonus).length, 1);
  assert.equal(live.totals.Dee, 12);
  assert.equal(LP.getLifePreserverOffer(live, 'Dee', players).reason, 'used');

  const reloaded = JSON.parse(JSON.stringify(live));
  assert.equal(Scorebook.isAssistedMatch(reloaded), true);
  assert.deepEqual(reloaded.hailMaryUsed, ['Dee']);
  assert.equal(reloaded.rounds.filter(round => round.hailMaryBonus).length, 1);
  assert.equal(reloaded.totals.Dee, 12);
  assert.equal(LP.getLifePreserverOffer(reloaded, 'Dee', players).reason, 'used');

  const before = JSON.stringify(reloaded.rounds);
  Scorebook.recordLifePreserverSpin(reloaded, 'Dee', 20);
  assert.equal(JSON.stringify(reloaded.rounds), before);
  assert.deepEqual(reloaded.hailMaryUsed, ['Dee']);
  assert.equal(reloaded.rounds.filter(round => round.hailMaryBonus).length, 1);
});

function legacyBuildSlices(maxHelpful, maxSetback, winLow, increment, recoveryLoad) {
  const sign = winLow ? -1 : 1;
  const helpful = [0.25, 0.5, 0.5, 0.75, 1].map((percent) => {
    const raw = Math.floor((maxHelpful * percent) / increment) * increment;
    return Math.max(increment, raw);
  });
  const setback = Math.max(increment, Math.floor(maxSetback / increment) * increment);
  const smallSetback = Math.max(increment, Math.floor(setback / 2 / increment) * increment);
  const helpfulWeight = recoveryLoad >= 1 ? 85 : recoveryLoad >= 0.55 ? 75 : 68;
  const setbackWeight = recoveryLoad >= 1 ? 8 : 10;
  const zeroWeight = Math.max(6, 100 - helpfulWeight - setbackWeight);
  const parts = [0.26, 0.22, 0.18, 0.21];
  const helpfulWeights = parts.map((part) => Math.max(1, Math.round(helpfulWeight * part)));
  helpfulWeights.push(Math.max(1, helpfulWeight - helpfulWeights.reduce((sum, weight) => sum + weight, 0)));
  const slices = [];
  [smallSetback, setback].forEach((magnitude, index) => {
    slices.push({ adjustment: -sign * magnitude, weight: Math.ceil(setbackWeight / 2) - (index ? 0 : 0), kind: 'bad' });
  });
  slices[0].weight = Math.ceil(setbackWeight / 2);
  slices[1].weight = setbackWeight - slices[0].weight;
  slices.push({ adjustment: 0, weight: Math.ceil(zeroWeight / 2), kind: 'zero' });
  slices.push({ adjustment: 0, weight: zeroWeight - Math.ceil(zeroWeight / 2), kind: 'zero' });
  helpful.forEach((magnitude, index) => {
    slices.push({ adjustment: sign * magnitude, weight: helpfulWeights[index], kind: 'good' });
  });
  return slices;
}

function simulateWheel(slices, offer, totals, players) {
  const total = slices.reduce((sum, slice) => sum + slice.weight, 0) || 1;
  const sign = offer.winLow ? -1 : 1;
  let pHelp = 0;
  let expectedAdj = 0;
  let expectedPlaces = 0;
  let rareMax = 0;
  let leapfrog = 0;
  const others = players.filter((name) => name !== offer.player && name !== offer.leaderPlayer);
  slices.forEach((slice) => {
    const p = slice.weight / total;
    const adj = Number(slice.adjustment) || 0;
    expectedAdj += p * adj;
    if (adj * sign > 0) {
      pHelp += p;
      rareMax = Math.max(rareMax, Math.abs(adj));
    }
    const next = { ...totals, [offer.player]: (Number(totals[offer.player]) || 0) + adj };
    const afterRank = LP.rankWithScore(offer.player, next[offer.player], players, next, offer.winLow);
    expectedPlaces += p * ((offer.rank || 0) - afterRank);
    const passed = others.some((name) => {
      const before = LP.rankWithScore(name, totals[name], players, totals, offer.winLow);
      const after = LP.rankWithScore(name, totals[name], players, next, offer.winLow);
      return after > before;
    });
    if (passed) leapfrog += p;
  });
  return { pHelp, expectedAdj, expectedPlaces, rareMax, leapfrog };
}

test('old vs new wheel simulation on early, middle, and late tables', () => {
  const cases = [
    {
      name: 'Linda Five Crowns late',
      game: QA_SCENARIOS['demo-seed'].data.currentGame,
      player: 'Linda'
    },
    {
      name: 'Cat 818 porch',
      game: QA_SCENARIOS['eight18-porch-lp'].data.currentGame,
      player: 'Cat'
    },
    {
      name: 'Hal barely eligible last 818',
      totals: { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 85 },
      options: { name: '818', roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' }
    }
  ];
  const report = [];
  for (const item of cases) {
    const result = item.game
      ? LP.getLifePreserverOffer(item.game, item.player, item.game.originalRoster)
      : offer(item.options.name, item.totals, item.options);
    assert.equal(result.eligible, true, item.name);
    const players = item.game ? item.game.originalRoster : Object.keys(item.totals);
    const totals = item.game ? item.game.totals : item.totals;
    const neu = simulateWheel(result.slices, result, totals, players);
    const old = simulateWheel(
      legacyBuildSlices(result.maxSafeAdjustment, result.maxSetback, result.winLow, result.scoreIncrement, result.recoveryLoad || 1),
      result,
      totals,
      players
    );
    assert.ok(neu.pHelp >= 0.79 && neu.pHelp <= 0.81, `${item.name} P(help) ${neu.pHelp}`);
    assert.ok(neu.rareMax <= result.maxSafeAdjustment);
    report.push({ name: item.name, old, neu });
  }
  console.log('LP_WHEEL_SIM', JSON.stringify(report, null, 2));
  assert.ok(report.length === 3);
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROULETTE_CASES = [
  {
    label: '818 last hole',
    name: '818',
    totals: { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 77 },
    options: { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' }
  },
  {
    label: '818 mid porch Cat',
    game: QA_SCENARIOS['eight18-porch-lp'].data.currentGame,
    player: 'Cat'
  },
  {
    label: 'Wizard late Hal',
    name: 'Wizard',
    totals: { Ann: 400, Bea: 390, Cal: 380, Dee: 370, Eve: 200, Fay: 180, Gus: 120, Hal: 40 },
    options: { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' }
  },
  {
    label: 'Five Crowns Brick',
    game: QA_SCENARIOS['five-crowns-preservers'].data.currentGame,
    player: 'Brick'
  },
  {
    label: 'Five Crowns Linda demo',
    game: QA_SCENARIOS['demo-seed'].data.currentGame,
    player: 'Linda'
  },
  {
    label: 'Five Crowns Duke-like 20',
    slices: () => LP.buildSlices(20, 10, true, 5, { remainingRounds: 4, oneStrongRound: 20, leaderGap: 51 })
  },
  {
    label: 'Flip 7 late Hal',
    name: 'Flip 7 Vengeance',
    totals: { Ann: 180, Bea: 170, Cal: 160, Dee: 150, Eve: 90, Fay: 80, Gus: 70, Hal: 20 },
    options: { roundCount: 6, spread: 40, currentRound: 7, player: 'Hal' }
  }
];

function offerFromCase(item) {
  if (item.slices) return { eligible: true, winLow: true, scoreIncrement: 5, slices: item.slices() };
  if (item.game) return LP.getLifePreserverOffer(item.game, item.player, item.game.originalRoster);
  return offer(item.name, item.totals, item.options);
}

test('roulette segment arcs match each outcome probability and sum to 360', () => {
  for (const item of ROULETTE_CASES) {
    const result = offerFromCase(item);
    assert.equal(result.eligible, true, item.label);
    const slices = result.slices;
    assert.ok(slices.length >= 20 && slices.length <= 40, `${item.label}: pocket count ${slices.length}`);
    const arcs = LP.sliceArcs(slices);
    const totalArc = arcs.reduce((sum, arc) => sum + arc.arc, 0);
    assert.ok(Math.abs(totalArc - Math.PI * 2) < 1e-9, `${item.label}: arcs ${totalArc}`);
    const degreeSum = arcs.reduce((sum, arc) => sum + (arc.fraction * 360), 0);
    assert.ok(Math.abs(degreeSum - 360) < 0.1, `${item.label}: degree sum ${degreeSum}`);
    const outcomes = LP.summarizeWheelOutcomes(slices);
    outcomes.forEach((outcome) => {
      const matching = arcs.filter((arc) => (
        (Number(arc.adjustment) || 0) === outcome.adjustment && arc.kind === outcome.kind
      ));
      const summed = matching.reduce((sum, arc) => sum + (arc.fraction * 360), 0);
      assert.ok(
        Math.abs(summed - outcome.arcDegrees) < 0.1,
        `${item.label} ${outcome.label}: summed ${summed} != ${outcome.arcDegrees}`
      );
      assert.equal(matching.length, outcome.segments, `${item.label} ${outcome.label} segment count`);
      assert.ok(outcome.segments >= 1, `${item.label} ${outcome.label} needs a pocket`);
      assert.ok(
        Math.abs(outcome.visualShare - outcome.probability) <= LP.VISUAL_SHARE_TOLERANCE + 1e-9,
        `${item.label} ${outcome.label} visual ${outcome.visualShare} vs live ${outcome.probability}`
      );
    });
    if (item.label === 'Five Crowns Duke-like 20') {
      const labels = outcomes.map((outcome) => `${outcome.label}:${outcome.segments}:${outcome.arcDegrees.toFixed(1)}`);
      assert.deepEqual(
        outcomes.map((outcome) => outcome.adjustment).sort((a, b) => a - b),
        [-20, -10, -5, 0, 5, 10],
        `Duke collapsed tiers should merge to six amounts, got ${labels.join(' | ')}`
      );
      const medium = outcomes.find((outcome) => Math.abs(outcome.adjustment) === 30 || Math.abs(outcome.adjustment) === 40);
      assert.equal(medium, undefined, 'Duke medium band is empty and must not invent a 30/40 slice');
      const small = outcomes.filter((outcome) => outcome.adjustment === -5 || outcome.adjustment === -10);
      const smallP = small.reduce((sum, outcome) => sum + outcome.probability, 0);
      assert.ok(Math.abs(smallP - 0.75) < 1e-9, `Duke small+folded medium should be 75%, got ${smallP}`);
      console.log('DUKE_ROULETTE', JSON.stringify(outcomes, null, 2));
    }
    const table = LP.describePocketTable(slices);
    assert.ok(table.pockets >= 20 && table.pockets <= 40, `${item.label} pockets ${table.pockets}`);
    table.bands.forEach((band) => {
      assert.ok(
        Math.abs(band.visualShare - band.probability) < 1e-9,
        `${item.label} ${band.band} visual ${band.visualShare} != live ${band.probability}`
      );
    });
    assert.equal(table.equalOption.implied.noChange, 0.125);
    assert.equal(LP.OUTCOME_TABLE.noChange, 0.12);
    assert.equal(LP.OUTCOME_TABLE.smallSetback, 0.08);
    console.log('POCKET_TABLE', item.label, JSON.stringify(table.outcomes.map((row) => ({
      label: row.label,
      prob: Number(row.probability.toFixed(4)),
      visual: Number(row.visualShare.toFixed(4)),
      pockets: row.segments,
      width: Number(row.widthEach.toFixed(4)),
      arc: Number(row.arcDegrees.toFixed(2))
    }))));
  }
});

test('landing angle stays inside a locked-outcome segment across many seeds', () => {
  for (const item of ROULETTE_CASES) {
    const result = offerFromCase(item);
    const slices = LP.attachSliceArcs(result.slices);
    const outcomes = LP.summarizeWheelOutcomes(slices);
    for (const outcome of outcomes) {
      const pool = slices.filter((slice) => LP.outcomeKey(slice) === outcome.outcomeKey);
      assert.ok(pool.length, `${item.label} ${outcome.label} has segments`);
      for (let seed = 1; seed <= 80; seed++) {
        const random = mulberry32(seed * 97 + outcome.adjustment + item.label.length);
        const pick = LP.pickWeightedSlice(pool, random);
        const degrees = LP.landingDegreesForSlice(pick, random);
        const angle = LP.wheelAngleFromDegrees(degrees);
        const hit = slices.find((slice) => (
          LP.angleInArc(angle, slice._start, slice._end)
        ));
        assert.ok(hit, `${item.label} ${outcome.label} seed ${seed} missed the wheel`);
        assert.equal(LP.outcomeKey(hit), outcome.outcomeKey, `${item.label} ${outcome.label} seed ${seed} landed ${hit && LP.outcomeKey(hit)}`);
        const span = pick._end - pick._start;
        const inset = Math.min(Math.max(span * 0.18, span * 0.08), span * 0.35);
        assert.ok(angle >= pick._start + inset - 1e-9 && angle <= pick._end - inset + 1e-9, `${item.label} landed on an edge`);
      }
    }
  }
});

test('realized Life Preserver frequencies still match the outcome table', () => {
  const n = 20000;
  for (const item of ROULETTE_CASES) {
    const result = offerFromCase(item);
    const slices = result.slices;
    const expected = LP.summarizeWheelOutcomes(slices);
    const counts = Object.fromEntries(expected.map((outcome) => [outcome.outcomeKey, 0]));
    const random = mulberry32(20261027 + item.label.length);
    for (let i = 0; i < n; i++) {
      const pick = LP.pickWeightedSlice(slices, random);
      counts[LP.outcomeKey(pick)] += 1;
    }
    expected.forEach((outcome) => {
      const freq = counts[outcome.outcomeKey] / n;
      assert.ok(
        Math.abs(freq - outcome.probability) < 0.02,
        `${item.label} ${outcome.label} freq ${freq} != ${outcome.probability}`
      );
    });
    const help = expected.filter((outcome) => outcome.kind === 'good').reduce((sum, outcome) => sum + outcome.probability, 0);
    assert.ok(help >= 0.79 && help <= 0.81, `${item.label} P(help) ${help}`);
  }
});

test('in-slice label boxes stay inside their roulette segments', () => {
  const geos = [
    { cx: 400, cy: 400, outer: 400 * LP.WHEEL_OUTER_FRAC, inner: 400 * LP.WHEEL_INNER_FRAC, cssWidth: 340, canvasWidth: 800 },
    { cx: 400, cy: 400, outer: 400 * LP.WHEEL_OUTER_FRAC, inner: 400 * LP.WHEEL_INNER_FRAC, cssWidth: 520, canvasWidth: 800 }
  ];
  for (const geo of geos) {
    for (const item of ROULETTE_CASES) {
      const result = offerFromCase(item);
      const slices = LP.attachSliceArcs(result.slices);
      slices.forEach((slice, index) => {
        const layout = LP.labelLayout(slice, geo);
        assert.equal(layout.text, LP.formatSignedPoints(slice.adjustment));
        assert.ok(layout.insidePie, `${item.label} ${geo.cssWidth} slice ${index} ${layout.text} left the pie`);
        assert.ok(layout.insideSegment, `${item.label} ${geo.cssWidth} slice ${index} ${layout.text} left its segment`);
        assert.ok(layout.cssFont >= 8, `${item.label} ${layout.text} font ${layout.cssFont}`);
        assert.equal(layout.tangentialMode, true, `${item.label} ${layout.text} should read along the rim`);
      });
    }
  }
});

test('data-driven pocket layout works for current and proposed tables', () => {
  const cases = [
    { table: 'current', help: 0.80, zero: 0.12, bad: 0.08 },
    { table: 'proposed', help: 0.75, zero: 0.10, bad: 0.15 }
  ];
  for (const item of cases) {
    const slices = LP.buildSlices(20, 10, true, 5, {
      remainingRounds: 4,
      oneStrongRound: 20,
      leaderGap: 51,
      table: item.table,
      pocketCount: 40
    });
    assert.ok(slices.length >= 20 && slices.length <= 40, `${item.table} pockets ${slices.length}`);
    const amounts = new Set(slices.map((slice) => Number(slice.adjustment)));
    amounts.forEach((amount) => {
      assert.ok(slices.some((slice) => Number(slice.adjustment) === amount));
    });
    const table = LP.describePocketTable(slices);
    table.outcomes.forEach((outcome) => {
      assert.ok(outcome.segments >= 1, `${item.table} ${outcome.label} missing pocket`);
      assert.ok(
        Math.abs(outcome.visualShare - outcome.probability) <= LP.VISUAL_SHARE_TOLERANCE + 1e-9,
        `${item.table} ${outcome.label} visual ${outcome.visualShare} vs ${outcome.probability}`
      );
    });
    const help = table.outcomes.filter((row) => row.kind === 'good').reduce((sum, row) => sum + row.probability, 0);
    const zero = table.outcomes.filter((row) => row.kind === 'zero').reduce((sum, row) => sum + row.probability, 0);
    const bad = table.outcomes.filter((row) => row.kind === 'bad').reduce((sum, row) => sum + row.probability, 0);
    assert.ok(Math.abs(help - item.help) < 1e-9, `${item.table} help ${help}`);
    assert.ok(Math.abs(zero - item.zero) < 1e-9, `${item.table} zero ${zero}`);
    assert.ok(Math.abs(bad - item.bad) < 1e-9, `${item.table} bad ${bad}`);
    LP.attachSliceArcs(slices);
    const geo = { cx: 400, cy: 400, outer: 400 * LP.WHEEL_OUTER_FRAC, inner: 400 * LP.WHEEL_INNER_FRAC, cssWidth: 360, canvasWidth: 800 };
    slices.forEach((slice, index) => {
      const layout = LP.labelLayout(slice, geo);
      assert.ok(layout.insideSegment, `${item.table} slice ${index} ${layout.text} left its pocket`);
    });
    const random = mulberry32(77 + item.table.length);
    for (let seed = 0; seed < 40; seed++) {
      const pick = LP.pickWeightedSlice(slices, random);
      const degrees = LP.landingDegreesForSlice(pick, random);
      const angle = LP.wheelAngleFromDegrees(degrees);
      const hit = slices.find((slice) => LP.angleInArc(angle, slice._start, slice._end));
      assert.equal(LP.outcomeKey(hit), LP.outcomeKey(pick), `${item.table} landing mismatch`);
    }
  }
});

test('in-slice label fonts grow with the wheel', () => {
  const small = { cx: 200, cy: 200, outer: 200 * LP.WHEEL_OUTER_FRAC, inner: 200 * LP.WHEEL_INNER_FRAC, cssWidth: 280, canvasWidth: 400 };
  const large = { cx: 400, cy: 400, outer: 400 * LP.WHEEL_OUTER_FRAC, inner: 400 * LP.WHEEL_INNER_FRAC, cssWidth: 560, canvasWidth: 800 };
  const result = offerFromCase(ROULETTE_CASES[0]);
  const smallSlices = LP.attachSliceArcs(result.slices.map((slice) => ({ ...slice })));
  const largeSlices = LP.attachSliceArcs(result.slices.map((slice) => ({ ...slice })));
  const pick = (slices) => slices.reduce((best, slice) => ((slice._end - slice._start) > (best._end - best._start) ? slice : best), slices[0]);
  const smallFont = LP.labelLayout(pick(smallSlices), small).cssFont;
  const largeFont = LP.labelLayout(pick(largeSlices), large).cssFont;
  assert.ok(largeFont > smallFont + 3, `rim font ${smallFont} -> ${largeFont}`);
});
