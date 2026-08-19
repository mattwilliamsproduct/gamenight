import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import { QA_SCENARIOS } from '../public/qa/fixtures.mjs';

const require = createRequire(import.meta.url);
const CB = require('../public/assets/comeback-logic.js');

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
  extraRounds = []
}) {
  const lastRound = (currentRound || roundCount + 1) - 1;
  return {
    name,
    originalRoster: [...players],
    totals: { ...totals },
    rounds: [...scoringRounds(roundCount, players, spread, lastRound), ...extraRounds],
    currentRound: currentRound || roundCount + 1,
    hailMaryUsed: [...hailMaryUsed],
    retired: [...retired]
  };
}

function offer(name, totals, options = {}) {
  const players = Object.keys(totals);
  return CB.getComebackOffer(
    game({ name, players, totals, ...options }),
    options.player || players[players.length - 1],
    players,
    options.extra || {}
  );
}

test('818 remaining opportunity uses each upcoming trick count', () => {
  assert.equal(CB.ruleUnitForRound('818', 15), 18);
  assert.equal(CB.ruleUnitForRound('818', 8), 11);
});

test('close 818 player with many rounds left does not qualify', () => {
  const totals = { Ann: 50, Bea: 48, Cal: 47, Dee: 46, Eve: 45, Fay: 44, Gus: 40, Hal: 21 };
  const result = offer('818', totals, { roundCount: 4, spread: 15, player: 'Hal' });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'recovery-load');
  assert.equal(result.packGap, 25);
});

test('tight late 818 table unlocks at about a made-bid deficit', () => {
  const six = { Ann: 100, Bea: 98, Cal: 94, Dee: 93, Eve: 91, Fay: 83 };
  const late = offer('818', six, { roundCount: 13, spread: 16, currentRound: 14, player: 'Fay' });
  assert.equal(late.rank, 6);
  assert.equal(late.packGap, 11);
  assert.equal(late.eligible, true, '11 behind a tight 818 pack with two rounds left should get Comeback');
  assert.ok(late.upcomingOpportunity <= 12, `818 catch-up should be a made bid, got ${late.upcomingOpportunity}`);
  assert.ok(late.bonus > 0);
  assert.ok(late.bonus <= 10);

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
  assert.ok(result.bonus > 0);
  assert.ok(result.bonus <= 10);
});

test('818 8-point last-round gap stays in ordinary range', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 93, Hal: 92 };
  const result = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(result.leaderGap, 8);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'leader-gap');
});

test('818 23-down mid-game sizes about +6 and a miss gets nothing', () => {
  const totals = { Ann: 100, Bea: 98, Cal: 94, Dee: 93, Eve: 91, Fay: 88, Gus: 70, Hal: 55 };
  const gus = offer('818', totals, { roundCount: 10, spread: 14, currentRound: 11, player: 'Gus' });
  const hal = offer('818', totals, { roundCount: 10, spread: 14, currentRound: 11, player: 'Hal' });
  assert.equal(gus.eligible, true);
  assert.equal(hal.eligible, true);
  assert.equal(gus.packGap, 23);
  assert.equal(hal.packGap, 38);
  assert.ok(gus.bonus >= 4 && gus.bonus <= 10, `Gus bonus ${gus.bonus}`);
  assert.ok(hal.bonus > gus.bonus, 'the deeper hole should get more extra');
  assert.ok(hal.bonus <= 10);

  const g = game({ name: '818', players: EIGHT, totals, roundCount: 10, spread: 14, currentRound: 11 });
  const make = { round: 11, scores: { Gus: 13, Hal: 3 }, bids: { Gus: 3, Hal: 3 }, actuals: { Gus: 3, Hal: 7 } };
  const applied = CB.applyComebackToRound(g, make, EIGHT);
  assert.equal(make.comeback.Gus, gus.bonus);
  assert.equal(make.comeback.Hal, undefined);
  assert.ok(applied.some(item => item.player === 'Gus' && item.applied === gus.bonus));
  assert.ok(!applied.some(item => item.player === 'Hal' && item.applied));
});

test('818 18-point hole with a few rounds left needs Comeback; Wizard does not', () => {
  const totals = { Ann: 100, Bea: 98, Cal: 96, Dee: 93, Eve: 91, Fay: 88, Gus: 85, Hal: 75 };
  const eight18 = offer('818', totals, { roundCount: 11, spread: 14, currentRound: 12, player: 'Hal' });
  assert.equal(eight18.leaderGap, 25);
  assert.equal(eight18.eligible, true);

  const wizardTotals = { Ann: 200, Bea: 190, Cal: 180, Dee: 170, Eve: 160, Fay: 150, Gus: 140, Hal: 120 };
  const wizard = offer('Wizard', wizardTotals, { roundCount: 3, spread: 50, currentRound: 4, player: 'Hal' });
  assert.equal(wizard.leaderGap, 80);
  assert.equal(wizard.eligible, false);
  assert.equal(wizard.reason, 'recovery-load');
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

test('Wizard 50-point last-round hole is still ordinary play', () => {
  const totals = { Ann: 250, Bea: 240, Cal: 230, Dee: 220, Eve: 210, Fay: 200, Gus: 190, Hal: 170 };
  const result = offer('Wizard', totals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assert.equal(result.leaderGap, 80);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'leader-gap');
  assert.ok(result.upcomingOpportunity >= 80);
});

test('Wizard extra is capped and a huge make cannot take 1st', () => {
  const totals = { Ann: 400, Bea: 390, Cal: 380, Dee: 370, Eve: 200, Fay: 180, Gus: 120, Hal: 40 };
  const result = offer('Wizard', totals, { roundCount: 6, spread: 80, currentRound: 7, player: 'Hal' });
  assert.equal(result.eligible, true);
  assert.ok(result.bonus <= 20);
  const scores = Object.fromEntries(EIGHT.map(player => [player, player === 'Hal' ? 90 : 0]));
  const clamped = CB.clampComebackBonus({
    player: 'Hal',
    bonus: 20,
    baseRoundScores: scores,
    preRoundTotals: totals,
    players: EIGHT,
    winLow: false,
    packRank: 4,
    increment: 5
  });
  const rank = CB.rankWithScore('Hal', totals.Hal + 90 + clamped, EIGHT, Object.fromEntries(
    EIGHT.map(player => [player, totals[player] + (scores[player] || 0)])
  ), false);
  assert.ok(rank > 1);
});

test('Five Crowns extra subtracts only on a 0', () => {
  const totals = { Ann: 20, Bea: 24, Cal: 28, Dee: 32, Eve: 48, Fay: 60, Gus: 150, Hal: 165 };
  const result = offer('Five Crowns', totals, { roundCount: 7, spread: 22, currentRound: 8, player: 'Gus' });
  assert.equal(result.eligible, true);
  assert.equal(result.winLow, true);
  assert.ok(result.bonus < 0);
  assert.ok(Math.abs(result.bonus) <= 30);

  const g = game({ name: 'Five Crowns', players: EIGHT, totals, roundCount: 7, spread: 22, currentRound: 8 });
  const round = { round: 8, scores: { Gus: 0, Hal: 8 } };
  CB.applyComebackToRound(g, round, EIGHT);
  assert.equal(round.comeback.Gus, result.bonus);
  assert.equal(round.comeback.Hal, undefined);
});

test('Flip 7 uses a 2.5-bank hole and only pays a bank', () => {
  const players = EIGHT;
  const totals = { Ann: 140, Bea: 130, Cal: 128, Dee: 126, Eve: 80, Fay: 70, Gus: 40, Hal: 20 };
  const rounds = [
    { round: 1, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 22 : 0])) },
    { round: 2, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 22 : 0])) },
    { round: 3, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 22 : 0])) },
    { round: 4, scores: Object.fromEntries(players.map((player, index) => [player, index === 0 ? 200 : 0])) }
  ];
  const close = CB.getComebackOffer(game({
    name: 'Flip 7 Vengeance',
    players,
    totals: { ...totals, Hal: 100 },
    roundCount: 0,
    spread: 22,
    extraRounds: rounds
  }), 'Hal', players);
  const stranded = CB.getComebackOffer(game({
    name: 'Flip 7 Vengeance',
    players,
    totals,
    roundCount: 0,
    spread: 22,
    extraRounds: rounds
  }), 'Hal', players);
  assert.equal(close.eligible, false);
  assert.equal(stranded.eligible, true);
  assert.equal(stranded.expectedGoodTurns, 2.5);
  assert.ok(stranded.bonus <= 15);

  const g = game({ name: 'Flip 7 Vengeance', players, totals, roundCount: 0, extraRounds: rounds });
  const bank = { round: 5, scores: { Hal: 12, Gus: 0 } };
  CB.applyComebackToRound(g, bank, players);
  assert.equal(bank.comeback.Hal, stranded.bonus);
  assert.equal(bank.comeback.Gus, undefined);

  const tiny = { round: 5, scores: { Hal: 1 } };
  CB.applyComebackToRound(g, tiny, players);
  assert.equal(tiny.comeback, undefined);
});

test('runaway leader unlocks everyone who cannot catch first', () => {
  const totals = { Ann: 200, Bea: 50, Cal: 49, Dee: 48, Eve: 47, Fay: 46, Gus: 45, Hal: 44 };
  const bea = offer('818', totals, { roundCount: 10, spread: 15, currentRound: 11, player: 'Bea' });
  const hal = offer('818', totals, { roundCount: 10, spread: 15, currentRound: 11, player: 'Hal' });
  const ann = offer('818', totals, { roundCount: 10, spread: 15, currentRound: 11, player: 'Ann' });
  assert.equal(ann.eligible, false);
  assert.equal(ann.reason, 'leading');
  assert.equal(bea.eligible, true, 'second place should get extra when first has run away');
  assert.equal(hal.eligible, true);
  assert.ok(Math.abs(hal.bonus) >= Math.abs(bea.bonus));
});

test('4-player extra may reach 2nd but never 1st; 8-player extra may also reach 2nd', () => {
  const eightTotals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 40, Fay: 30, Gus: 20, Hal: 10 };
  const eight = offer('818', eightTotals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal' });
  assert.equal(eight.bestAllowedRank, 2);

  const fourTotals = { Ann: 80, Bea: 78, Cal: 40, Dee: 20 };
  const four = offer('818', fourTotals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Dee' });
  assert.equal(four.eligible, true);
  assert.equal(four.bestAllowedRank, 2);
  const second = CB.clampComebackBonus({
    player: 'Dee',
    bonus: 10,
    baseRoundScores: { Ann: 0, Bea: 0, Cal: 0, Dee: 10 },
    preRoundTotals: fourTotals,
    players: FOUR,
    winLow: false,
    packRank: 2,
    increment: 1
  });
  const first = CB.clampComebackBonus({
    player: 'Dee',
    bonus: 80,
    baseRoundScores: { Ann: 0, Bea: 0, Cal: 0, Dee: 0 },
    preRoundTotals: fourTotals,
    players: FOUR,
    winLow: false,
    packRank: 2,
    increment: 1
  });
  const afterSecond = CB.rankWithScore('Dee', fourTotals.Dee + 10 + second, FOUR, {
    Ann: 80, Bea: 78, Cal: 40, Dee: 20 + 10
  }, false);
  assert.ok(afterSecond >= 2);
  const afterFirst = CB.rankWithScore('Dee', fourTotals.Dee + first, FOUR, fourTotals, false);
  assert.ok(afterFirst > 1);
  assert.ok(first < 80);
});

test('catching the lead turns Comeback off; falling behind turns it back on', () => {
  const stranded = { Ann: 100, Bea: 98, Cal: 94, Dee: 93, Eve: 91, Fay: 88, Gus: 70, Hal: 55 };
  const caught = { Ann: 100, Bea: 98, Cal: 94, Dee: 93, Eve: 91, Fay: 88, Gus: 93, Hal: 55 };
  assert.equal(offer('818', stranded, { roundCount: 10, spread: 14, currentRound: 11, player: 'Gus' }).eligible, true);
  assert.equal(offer('818', caught, { roundCount: 11, spread: 14, currentRound: 12, player: 'Gus' }).eligible, false);
  assert.equal(offer('818', stranded, { roundCount: 12, spread: 14, currentRound: 13, player: 'Gus' }).eligible, true);
});

test('legacy rescue and retired players cannot qualify; joiners wait for 4 real rounds', () => {
  const totals = { Ann: 100, Bea: 99, Cal: 98, Dee: 97, Eve: 96, Fay: 95, Gus: 90, Hal: 70 };
  const used = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal', hailMaryUsed: ['Hal'] });
  const retired = offer('818', totals, { roundCount: 14, spread: 17, currentRound: 15, player: 'Hal', retired: ['Hal'] });
  assert.equal(used.reason, 'legacy-rescue');
  assert.equal(retired.reason, 'retired');

  const joinRounds = scoringRounds(8, EIGHT, 15, 8).map(round => {
    round.scores.Hal = 0;
    round.joinBonus = { Hal: true };
    return round;
  });
  const joiner = CB.getComebackOffer(game({
    name: '818',
    players: EIGHT,
    totals,
    roundCount: 0,
    extraRounds: joinRounds,
    currentRound: 9
  }), 'Hal', EIGHT);
  assert.equal(joiner.reason, 'joined-late');
});

test('legacy bonus rounds are excluded from round counts', () => {
  const totals = { Ann: 50, Bea: 48, Cal: 47, Dee: 46, Eve: 45, Fay: 44, Gus: 40, Hal: 21 };
  const bonus = { round: 0, hailMaryBonus: true, scores: { Ann: 400, Hal: 0 } };
  const withBonus = offer('818', totals, { roundCount: 3, spread: 15, extraRounds: [bonus], player: 'Hal' });
  const without = offer('818', totals, { roundCount: 3, spread: 15, player: 'Hal' });
  assert.equal(withBonus.reason, 'too-early');
  assert.equal(without.reason, 'too-early');
});

test('Rook and Beat the Heat stay ineligible', () => {
  const totals = { Ann: 100, Bea: 90, Cal: 20, Dee: 10 };
  assert.equal(offer('Rook', totals, { roundCount: 6, spread: 20, player: 'Dee' }).reason, 'unsupported-game');
  assert.equal(offer('Beat the Heat', totals, { roundCount: 6, spread: 8, player: 'Dee' }).reason, 'unsupported-game');
});

test('Five Crowns QA fixture gives Brick a Comeback extra', () => {
  const currentGame = QA_SCENARIOS['five-crowns-comeback'].data.currentGame;
  const players = currentGame.originalRoster;
  const result = CB.getComebackOffer(currentGame, 'Brick', players);
  assert.equal(result.eligible, true);
  assert.equal(currentGame.totals.Brick, 150);
  assert.equal(result.rank, 7);
  assert.equal(result.packGap, 110);
  assert.ok(result.bonus < 0);
  assert.ok(Math.abs(result.bonus) <= 30);
  const explained = CB.explainComebackOffer(result);
  assert.match(explained.summary, /7th of 8/);
  assert.match(explained.summary, /behind the lead/);
  assert.ok(explained.bullets.some(bullet => /Cannot take 1st/.test(bullet)));
  assert.equal(result.slices, undefined);
});

test('editing a 0 into leftover cards strips Five Crowns extra and does not grant it retroactively', () => {
  const totals = { Ann: 20, Bea: 24, Cal: 28, Dee: 32, Eve: 48, Fay: 60, Gus: 150, Hal: 165 };
  const g = game({ name: 'Five Crowns', players: EIGHT, totals, roundCount: 7, spread: 22, currentRound: 8 });
  const round = { round: 8, scores: { Gus: 0, Hal: 8 }, comeback: { Gus: -10 } };
  assert.equal(CB.syncComebackAfterScoreEdit(g, round, 'Gus'), false);
  round.scores.Gus = 8;
  assert.equal(CB.syncComebackAfterScoreEdit(g, round, 'Gus'), true);
  assert.equal(round.comeback, undefined);
  round.scores.Hal = 0;
  assert.equal(CB.syncComebackAfterScoreEdit(g, round, 'Hal'), false);
  assert.equal(round.comeback, undefined);
});

test('Wizard max rounds stay frozen when the active table shrinks', () => {
  const totals = { Ann: 80, Bea: 78, Cal: 76, Dee: 74, Eve: 40, Fay: 38, Gus: 20, Hal: 10 };
  const g = game({ name: 'Wizard', players: EIGHT, totals, roundCount: 6, spread: 80, currentRound: 7 });
  assert.equal(CB.getMaxRounds(g, EIGHT), 7);
  g.maxRounds = 7;
  g.retired = ['Ann'];
  const seven = EIGHT.filter(player => player !== 'Ann');
  assert.equal(CB.getMaxRounds(g, seven), 7);
  delete g.maxRounds;
  g.originalRoster = [...EIGHT];
  assert.equal(CB.getMaxRounds(g, seven), 7);
});

test('Comeback rules copy is plain language and game-specific', () => {
  const eight18 = CB.explainComebackRules('818');
  assert.equal(eight18.supported, true);
  assert.match(eight18.lead, /818/);
  assert.ok(eight18.when.some(line => /4 rounds/.test(line)));
  assert.ok(eight18.notWhen.some(line => /First place never/.test(line)));
  assert.ok(eight18.scale.some(line => /\+1 through \+10/.test(line)));
  assert.ok(eight18.apply.some(line => /make your bid/.test(line)));
  assert.ok(eight18.apply.some(line => /automatic/.test(line)));

  const wizard = CB.explainComebackRules('Wizard');
  assert.ok(wizard.when.some(line => /50 to 90/.test(line)));
  assert.ok(wizard.scale.some(line => /\+5, \+10, \+15, or \+20/.test(line)));

  const crowns = CB.explainComebackRules('Five Crowns');
  assert.ok(crowns.when.some(line => /4 hands/.test(line)));
  assert.ok(crowns.when.some(line => /Low score wins/.test(line)));
  assert.ok(crowns.scale.some(line => /−5/.test(line) || /-5/.test(line) || /5,/.test(line)));
  assert.ok(crowns.apply.some(line => /go out with 0/.test(line)));

  const flip7 = CB.explainComebackRules('Flip 7 Vengeance');
  assert.match(flip7.lead, /Flip 7/);
  assert.ok(flip7.when.some(line => /two and a half strong banks/.test(line)));
  assert.ok(flip7.scale.some(line => /\+5, \+10, or \+15/.test(line)));
  assert.ok(flip7.apply.some(line => /at least 10 points/.test(line)));

  const rook = CB.explainComebackRules('Rook');
  assert.equal(rook.supported, false);
  assert.match(rook.lead, /does not use Turbos/);
});

test('Comeback table summary names who has extra and who is still in it', () => {
  const currentGame = QA_SCENARIOS['five-crowns-comeback'].data.currentGame;
  const summary = CB.summarizeComebackTable(currentGame, currentGame.originalRoster);
  assert.equal(summary.rules.supported, true);
  assert.equal(summary.live.timingOpen, true);
  assert.ok(summary.live.ready.includes('Brick'));
  assert.equal(summary.live.used, undefined);
  assert.match(summary.live.roundLine, /scored/);
  assert.equal(summary.live.leaderPlayer, 'Matt');
  assert.equal(summary.live.packPlayer, 'Megan');
});

test('Five Crowns blowout gives both stragglers Comeback and a bigger extra than 15', () => {
  const currentGame = QA_SCENARIOS['five-crowns-blowout'].data.currentGame;
  const players = currentGame.originalRoster;
  const linda = CB.getComebackOffer(currentGame, 'Linda', players);
  const vikki = CB.getComebackOffer(currentGame, 'Vikki', players);
  assert.equal(currentGame.currentRound, 7);
  assert.equal(currentGame.totals.Linda, 108);
  assert.equal(currentGame.totals.Vikki, 140);
  assert.equal(linda.eligible, true, '108 behind a pack of zeros should still get Comeback');
  assert.equal(vikki.eligible, true);
  assert.equal(linda.reason, 'ok');
  assert.ok(Math.abs(linda.bonus) > 15, `blowout extra should be more than 15, got ${linda.bonus}`);
  assert.ok(Math.abs(vikki.bonus) > 15, `blowout extra should be more than 15, got ${vikki.bonus}`);
  assert.ok(Math.abs(linda.bonus) <= 30);
  assert.ok(Math.abs(vikki.bonus) <= 30);
  assert.equal(currentGame.rounds[5].comeback.Vikki, -15);
  assert.equal(CB.formatRoundScore(0, -15), '0 −15');
});

test('wide Five Crowns spreads do not hide a 108-point hole behind inflated remaining opportunity', () => {
  const players = EIGHT;
  const totals = { Ann: 0, Bea: 0, Cal: 0, Dee: 0, Eve: 0, Fay: 0, Gus: 108, Hal: 140 };
  const wide = Array.from({ length: 6 }, (_, index) => ({
    round: index + 1,
    scores: Object.fromEntries(players.map((player, playerIndex) => [player, playerIndex >= 6 ? 40 : 0]))
  }));
  const g = game({
    name: 'Five Crowns',
    players,
    totals,
    roundCount: 0,
    extraRounds: wide,
    currentRound: 7
  });
  const gus = CB.getComebackOffer(g, 'Gus', players);
  const hal = CB.getComebackOffer(g, 'Hal', players);
  assert.equal(gus.eligible, true, `Gus 108 down should qualify even after wild spreads, got ${gus.reason}`);
  assert.equal(hal.eligible, true);
});

test('score-entry preview uses the clamped extra, not the uncapped offer', () => {
  const totals = { Ann: 80, Bea: 79, Cal: 40, Dee: 61 };
  const g = game({ name: '818', players: FOUR, totals, roundCount: 14, spread: 17, currentRound: 15 });
  const offer = CB.getComebackOffer(g, 'Dee', FOUR);
  assert.equal(offer.eligible, true);
  const draft = { scores: { Dee: 18 }, bids: { Dee: 8 }, actuals: { Dee: 8 } };
  const preview = CB.previewComebackApply(g, 'Dee', draft, FOUR);
  const clamped = CB.clampComebackBonus({
    player: 'Dee',
    bonus: offer.bonus,
    baseRoundScores: draft.scores,
    preRoundTotals: totals,
    players: FOUR,
    winLow: false,
    packRank: 2,
    increment: 1
  });
  assert.equal(preview.extra, clamped);
  assert.ok(preview.clamped);
  assert.notEqual(preview.extra, offer.bonus);
  assert.equal(preview.label, CB.formatRoundScore(18, clamped));
});

test('Wizard extra drops when the points cell is edited off a make', () => {
  const totals = { Ann: 400, Bea: 390, Cal: 380, Dee: 370, Eve: 200, Fay: 180, Gus: 120, Hal: 40 };
  const g = game({ name: 'Wizard', players: EIGHT, totals, roundCount: 6, spread: 80, currentRound: 7 });
  const round = { round: 7, scores: { Hal: 50 }, bids: { Hal: 3 }, actuals: { Hal: 3 }, comeback: { Hal: 20 } };
  assert.equal(CB.isComebackSuccess(g, round, 'Hal'), true);
  assert.equal(CB.syncComebackAfterScoreEdit(g, round, 'Hal'), false);
  round.scores.Hal = -10;
  assert.equal(CB.isComebackSuccess(g, round, 'Hal'), false);
  assert.equal(CB.syncComebackAfterScoreEdit(g, round, 'Hal'), true);
  assert.equal(round.comeback, undefined);
  round.scores.Hal = 50;
  assert.equal(CB.syncComebackAfterScoreEdit(g, round, 'Hal'), false);
  assert.equal(round.comeback, undefined);
});

test('Comeback chip copy stays short on the scorecard and full in the formatter', () => {
  assert.equal(CB.formatComebackChip(-30), 'Turbo −30');
  assert.equal(CB.formatComebackChipShort(-30), '−30');
  assert.equal(CB.formatComebackChipShort(-5), '−5');
  assert.equal(CB.formatComebackChipShort(20), '+20');
});

test('818, Wizard, and Flip 7 use the same sliding turbo scale', () => {
  assert.equal(CB.sizeComebackBonus(3, 1, 1, 10), 3);
  assert.equal(CB.sizeComebackBonus(7, 1, 1, 10), 7);
  assert.equal(CB.sizeComebackBonus(16, 1, 1, 10), 10);
  assert.equal(CB.sizeComebackBonus(6, 1, 5, 20), 5);
  assert.equal(CB.sizeComebackBonus(12, 1, 5, 20), 10);
  assert.equal(CB.sizeComebackBonus(22, 1, 5, 20), 20);
  assert.equal(CB.sizeComebackBonus(8, 1, 5, 15), 5);
  assert.equal(CB.sizeComebackBonus(14, 1, 5, 15), 10);
  assert.equal(CB.sizeComebackBonus(40, 1, 5, 15), 15);
  assert.equal(CB.sizeComebackBonus(4, 1, 5, 30), 0);
});

test('Five Crowns last-hand runaway pair gives 3rd through last a scaled extra', () => {
  const players = ['Matt', 'Cat', 'Megan', 'Michelle', 'Mike', 'Vikki', 'Linda', 'Duke'];
  const totals = { Matt: 31, Cat: 34, Megan: 92, Michelle: 94, Mike: 94, Vikki: 159, Linda: 172, Duke: 182 };
  const rounds = Array.from({ length: 10 }, (_, index) => ({
    round: index + 1,
    scores: Object.fromEntries(players.map(player => [player, 0]))
  }));
  const g = game({
    name: 'Five Crowns',
    players,
    totals,
    roundCount: 0,
    extraRounds: rounds,
    currentRound: 11
  });
  const offers = Object.fromEntries(players.map(player => [player, CB.getComebackOffer(g, player, players)]));
  assert.equal(offers.Matt.eligible, false);
  assert.equal(offers.Matt.reason, 'leading');
  assert.equal(offers.Cat.eligible, false, 'Cat is only 3 behind Matt, so she is still in it');
  assert.equal(offers.Megan.eligible, true, 'third place is out of reach of first on the last hand');
  assert.equal(offers.Megan.bonus, -5, 'just past a catchable last hand should only be −5');
  assert.equal(offers.Michelle.bonus, -10);
  assert.equal(offers.Mike.bonus, -10);
  assert.equal(offers.Vikki.bonus, -30);
  assert.equal(offers.Linda.bonus, -30);
  assert.equal(offers.Duke.bonus, -30);
});

test('Five Crowns turbo ladder fixture shows −5 through −30', () => {
  const currentGame = QA_SCENARIOS['five-crowns-turbo-ladder'].data.currentGame;
  const players = currentGame.originalRoster;
  const expected = {
    Matt: 0,
    Cat: 0,
    Megan: -5,
    Michelle: -10,
    Mike: -15,
    Vikki: -20,
    Linda: -25,
    Duke: -30
  };
  for (const [player, bonus] of Object.entries(expected)) {
    const result = CB.getComebackOffer(currentGame, player, players);
    if (!bonus) {
      assert.equal(result.eligible, false, `${player} should not have a turbo`);
    } else {
      assert.equal(result.eligible, true, `${player} should have a turbo`);
      assert.equal(result.bonus, bonus, `${player} should be ${bonus}`);
    }
  }
});
