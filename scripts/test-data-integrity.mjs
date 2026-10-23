import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { EIGHT18_BID_ACCURACY_ROUNDS } from '../public/qa/fixtures.mjs';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');
const Life = require('../public/assets/life-preserver-logic.js');

test('blank and non-integer entries are rejected before they can become numbers', () => {
  assert.equal(Scorebook.parseEntryInteger('').ok, false);
  assert.equal(Scorebook.parseEntryInteger('   ').reason, 'blank');
  assert.equal(Scorebook.parseEntryInteger('-').reason, 'blank');
  assert.equal(Scorebook.parseEntryInteger(null).reason, 'blank');
  assert.equal(Scorebook.parseEntryInteger('1.5').reason, 'not-integer');
  assert.equal(Scorebook.parseEntryInteger('10abc').reason, 'not-integer');
  assert.equal(Scorebook.parseEntryInteger(1.5).reason, 'not-integer');
  assert.deepEqual(Scorebook.parseEntryInteger(' 0 '), { ok: true, value: 0 });
  assert.deepEqual(Scorebook.parseEntryInteger(-4), { ok: true, value: -4 });
});

test('818 trick limits follow the 8-1-8 schedule, not the round number', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(round => Scorebook.roundTrickLimit('818', round)),
    [8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8]
  );
  assert.equal(Scorebook.roundTrickLimit({ name: '818', currentRound: 15 }, 8), 1);
  assert.equal(Scorebook.roundTrickLimit('Wizard', 2), 2);
  assert.equal(Scorebook.roundTrickLimit('Five Crowns', 4), 0);
});

test('balanced out-of-bounds tricks name every invalid player and do not invent values', () => {
  const result = Scorebook.validateEntries({
    game: 'Wizard',
    kind: 'tricks',
    roundNumber: 2,
    players: ['Alice', 'Bob', 'Cara', 'Dan'],
    values: { Alice: '-1', Bob: '3', Cara: '0', Dan: '0' }
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidPlayers, ['Alice', 'Bob']);
  assert.equal(result.message, 'Wizard tricks must be from 0 to 2. Check Alice, Bob.');
  assert.equal(result.values.Alice, undefined);
  assert.equal(result.values.Bob, undefined);
  assert.equal(result.values.Cara, 0);
});

test('a blank trick is not coerced to zero, and a valid table still sums', () => {
  const blank = Scorebook.validateEntries({
    game: '818',
    kind: 'tricks',
    roundNumber: 8,
    players: ['Alice', 'Bob'],
    values: { Alice: '', Bob: '1' }
  });
  assert.equal(blank.ok, false);
  assert.equal(blank.limit, 1);
  assert.equal(blank.message, '818 tricks must be from 0 to 1. Check Alice.');

  const ok = Scorebook.validateEntries({
    game: 'Wizard',
    kind: 'bids',
    roundNumber: 2,
    players: ['Alice', 'Bob'],
    values: { Alice: '1', Bob: 1 }
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.sum, 2);
  assert.deepEqual(ok.values, { Alice: 1, Bob: 1 });
});

test('Five Crowns, Flip 7, and Beat the Heat reject negative played-round inputs', () => {
  ['Five Crowns', 'Flip 7 Vengeance', 'Beat the Heat'].forEach(game => {
    const result = Scorebook.validateEntries({
      game,
      kind: 'scores',
      roundNumber: 2,
      players: ['Alice'],
      values: { Alice: '-15' }
    });
    assert.equal(result.ok, false, game);
    assert.match(result.message, /0 or higher/);
    assert.match(result.message, /Alice/);
  });
  assert.match(
    Scorebook.validateEntries({
      game: 'Flip 7 Vengeance',
      kind: 'scores',
      players: ['Alice'],
      values: { Alice: -1 }
    }).message,
    /^Flip 7 scores/
  );
});

test('Wizard and Rook calculated scores stay legal when they are negative', () => {
  const wizard = Scorebook.validateEntries({
    game: 'Wizard',
    kind: 'scores',
    roundNumber: 2,
    players: ['Alice'],
    values: { Alice: -10 }
  });
  assert.equal(wizard.ok, true);
  assert.equal(wizard.values.Alice, -10);
  const rook = Scorebook.validateEntries({
    game: 'Rook',
    kind: 'scores',
    players: ['Alice'],
    values: { Alice: '-100' }
  });
  assert.equal(rook.ok, true);
  assert.equal(rook.values.Alice, -100);
});

test('a rejected mutation restores the match and a failed check does too', () => {
  const game = {
    name: 'Five Crowns',
    originalRoster: ['Alice', 'Bob'],
    rounds: [{ round: 1, scores: { Alice: 4, Bob: 6 } }],
    totals: { Alice: 4, Bob: 6 },
    auditLog: []
  };

  const rejected = Scorebook.commitValidatedMutation(game, draft => {
    draft.rounds[0].scores.Alice = -15;
    draft.totals.Alice = -15;
    draft.auditLog.push({ action: 'R1 Score Edited', detail: 'Alice: 4 -> -15' });
    return { ok: false, reason: 'invalid', message: 'Five Crowns scores must be whole numbers, 0 or higher. Check Alice.' };
  });
  assert.equal(rejected.ok, false);
  assert.equal(game.rounds[0].scores.Alice, 4);
  assert.equal(game.totals.Alice, 4);
  assert.deepEqual(game.auditLog, []);

  const thrown = Scorebook.commitValidatedMutation(game, () => {
    game.totals.Alice = 99;
    throw new Error('disk full');
  });
  assert.equal(thrown.ok, false);
  assert.equal(game.totals.Alice, 4);

  const verified = Scorebook.commitValidatedMutation(game, draft => {
    draft.rounds[0].scores.Alice = 1;
    draft.auditLog.push({ action: 'R1 Score Edited' });
    return { ok: true, changed: true };
  }, () => ({ ok: false, reason: 'verify', message: 'Round no longer adds up.' }));
  assert.equal(verified.reason, 'verify');
  assert.equal(game.rounds[0].scores.Alice, 4);
  assert.deepEqual(game.auditLog, []);
});

test('an accepted mutation keeps one totals recompute and does not apply it twice', () => {
  const game = {
    name: 'Five Crowns',
    originalRoster: ['Alice'],
    rounds: [
      { round: 1, scores: { Alice: 4 } },
      { round: 0, hailMaryBonus: true, scores: { Alice: -18 } }
    ],
    totals: { Alice: 0 },
    auditLog: []
  };
  const result = Scorebook.commitValidatedMutation(game, draft => {
    Scorebook.recomputeTotals(draft);
    const once = draft.totals.Alice;
    Scorebook.recomputeTotals(draft);
    return { ok: true, once, twice: draft.totals.Alice };
  });
  assert.equal(result.ok, true);
  assert.equal(result.once, -14);
  assert.equal(result.twice, -14);
  assert.equal(game.totals.Alice, -14);
});

test('trick balance uses the round limit that was validated, not a stand-in round counter', () => {
  const values = { Alice: 0, Bob: 1 };
  assert.equal(Scorebook.trickTableIsBalanced(values, ['Alice', 'Bob'], 1).ok, true);
  assert.equal(Scorebook.trickTableIsBalanced(values, ['Alice', 'Bob'], 8).ok, false);
});

test('the first digit on an untouched Wizard or 818 prefill replaces the bid', () => {
  const session = Scorebook.createScoreEntrySession(['Alice', 'Bob'], { Alice: '1', Bob: '3' });
  Scorebook.pressScoreEntryKey(session, '0');
  assert.equal(session.values.Alice, '0');
  assert.equal(session.acknowledged.Alice, true);
  assert.equal(session.values.Bob, '3');
  assert.equal(session.acknowledged.Bob, false);

  const second = Scorebook.createScoreEntrySession(['Alice'], { Alice: '3' });
  Scorebook.pressScoreEntryKey(second, '3');
  assert.equal(second.values.Alice, '3');
  assert.equal(second.acknowledged.Alice, true);
});

test('digits after the replacement append, including a two-digit trick count', () => {
  const session = Scorebook.createScoreEntrySession(['Alice'], { Alice: '1' });
  Scorebook.pressScoreEntryKey(session, '1');
  Scorebook.pressScoreEntryKey(session, '0');
  assert.equal(session.values.Alice, '10');
  assert.equal(session.acknowledged.Alice, true);

  const zeroFirst = Scorebook.createScoreEntrySession(['Bob'], { Bob: '4' });
  Scorebook.pressScoreEntryKey(zeroFirst, '0');
  Scorebook.pressScoreEntryKey(zeroFirst, '2');
  assert.equal(zeroFirst.values.Bob, '2');
});

test('NEXT-style acceptance keeps an unchanged prefill and later digits append', () => {
  const session = Scorebook.createScoreEntrySession(['Alice', 'Bob'], { Alice: '1', Bob: '2' });
  Scorebook.acceptScoreEntryPlayer(session, 'Alice');
  assert.equal(session.values.Alice, '1');
  assert.equal(session.acknowledged.Alice, true);

  Scorebook.pressScoreEntryKey(session, '0');
  assert.equal(session.values.Alice, '10');

  const blank = Scorebook.acceptScoreEntryValue({ value: '', acknowledged: false });
  assert.equal(blank.accepted, false);
  assert.equal(blank.acknowledged, false);
  const dash = Scorebook.acceptScoreEntryValue({ value: '-', acknowledged: false });
  assert.equal(dash.accepted, false);
});

test('leaving a player and coming back keeps the acknowledged entry', () => {
  const session = Scorebook.createScoreEntrySession(['Alice', 'Bob'], { Alice: '1', Bob: '4' });
  Scorebook.pressScoreEntryKey(session, '2');
  Scorebook.selectScoreEntryPlayer(session, 'Bob');
  Scorebook.selectScoreEntryPlayer(session, 'Alice');
  assert.equal(session.activePlayer, 'Alice');
  assert.equal(session.values.Alice, '2');
  assert.equal(session.acknowledged.Alice, true);
  Scorebook.pressScoreEntryKey(session, '0');
  assert.equal(session.values.Alice, '20');
  assert.equal(session.values.Bob, '4');
  assert.equal(session.acknowledged.Bob, false);
});

test('the score entry modal and submit path use the shared prefill and bounds contracts', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(page, /BPGScorebook\.applyScoreEntryKey/);
  assert.match(page, /BPGScorebook\.acceptScoreEntryValue/);
  assert.match(page, /BPGScorebook\.validateEntries/);
  assert.match(page, /function readLiveEntryRaw/);
  assert.doesNotMatch(page, /parseInt\(el\.value\)\|\|0/);
});

function finishedWizard() {
  return {
    name: 'Wizard',
    originalRoster: ['Alice', 'Bob'],
    currentRound: 2,
    maxRounds: 1,
    completed: true,
    winners: ['Bob'],
    totals: { Alice: -10, Bob: 30 },
    auditLog: [],
    rounds: [{
      round: 1,
      bids: { Alice: 1, Bob: 1 },
      actuals: { Alice: 0, Bob: 1 },
      scores: { Alice: -10, Bob: 30 }
    }]
  };
}

test('a Wizard historical correction rewrites tricks, scores, the winner, and one audit entry together', () => {
  const game = finishedWizard();
  const result = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    now: 111,
    actuals: { Alice: 1, Bob: 0 }
  });
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(game.rounds[0].actuals.Alice, 1);
  assert.equal(game.rounds[0].actuals.Bob, 0);
  assert.equal(game.rounds[0].scores.Alice, 30);
  assert.equal(game.rounds[0].scores.Bob, -10);
  assert.equal(game.totals.Alice, 30);
  assert.equal(game.totals.Bob, -10);
  assert.deepEqual(game.winners, ['Alice']);
  assert.equal(game.currentRound, 2);
  assert.equal(game.auditLog.length, 1);
  assert.equal(game.auditLog[0].action, 'R1 Tricks Edited');
  assert.equal(game.auditLog[0].detail, 'Alice: 0 -> 1 (-10 -> +30), Bob: 1 -> 0 (+30 -> -10)');
  assert.equal(result.standing.reopened, false);
});

test('an out-of-bounds or unbalanced historical trick table changes nothing', () => {
  const game = finishedWizard();
  const before = JSON.parse(JSON.stringify(game));
  const bounds = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    actuals: { Alice: -1, Bob: 2 }
  });
  assert.equal(bounds.ok, false);
  assert.match(bounds.message, /Wizard tricks must be from 0 to 1\. Check Alice, Bob\./);
  assert.deepEqual(game, before);

  const blank = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    actuals: { Alice: '', Bob: 1 }
  });
  assert.equal(blank.ok, false);
  assert.match(blank.message, /Check Alice/);
  assert.deepEqual(game, before);

  const unbalanced = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    actuals: { Alice: 1, Bob: 1 }
  });
  assert.equal(unbalanced.ok, false);
  assert.equal(unbalanced.message, 'Wizard round 1 must total 1 tricks. This table totals 2.');
  assert.deepEqual(game, before);
});

test('saving the same tricks is a no-op and writes no audit event', () => {
  const game = finishedWizard();
  const result = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    actuals: { Alice: '0', Bob: '1' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.noop, true);
  assert.deepEqual(game.auditLog, []);
  assert.equal(game.rounds[0].scores.Alice, -10);
});

test('an 818 historical correction uses that round’s trick count, not the live round counter', () => {
  const game = {
    name: '818',
    currentRound: 15,
    maxRounds: 15,
    completed: true,
    originalRoster: ['Alice', 'Bob'],
    winners: ['Alice'],
    totals: { Alice: 11, Bob: 0 },
    auditLog: [],
    rounds: [{
      round: 8,
      bids: { Alice: 1, Bob: 1 },
      actuals: { Alice: 1, Bob: 0 },
      scores: { Alice: 11, Bob: 0 }
    }]
  };
  const rejected = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    actuals: { Alice: 8, Bob: 0 }
  });
  assert.equal(rejected.ok, false);
  assert.match(rejected.message, /818 tricks must be from 0 to 1/);
  assert.equal(game.rounds[0].actuals.Alice, 1);

  const saved = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    now: 222,
    actuals: { Alice: 0, Bob: 1 }
  });
  assert.equal(saved.ok, true);
  assert.equal(game.rounds[0].scores.Alice, 0);
  assert.equal(game.rounds[0].scores.Bob, 11);
  assert.deepEqual(game.winners, ['Bob']);
  assert.equal(game.auditLog.length, 1);
  assert.equal(game.auditLog[0].action, 'R8 Tricks Edited');
});

test('a negative Five Crowns correction is rejected and a real edit logs once', () => {
  const game = {
    name: 'Five Crowns',
    originalRoster: ['Alice', 'Bob'],
    currentRound: 3,
    maxRounds: 11,
    totals: { Alice: 15, Bob: 4 },
    winners: ['Bob'],
    auditLog: [],
    rounds: [
      { round: 1, scores: { Alice: 15, Bob: 4 } },
      { round: 2, scores: { Alice: 0, Bob: 0 } }
    ]
  };
  const before = JSON.parse(JSON.stringify(game));
  const rejected = Scorebook.commitRoundCorrection(game, { roundIndex: 0, scores: { Alice: -15 } });
  assert.equal(rejected.ok, false);
  assert.match(rejected.message, /Five Crowns scores must be whole numbers, 0 or higher\. Check Alice\./);
  assert.deepEqual(game, before);

  const blank = Scorebook.commitRoundCorrection(game, { roundIndex: 0, scores: { Alice: '   ' } });
  assert.equal(blank.ok, false);
  assert.deepEqual(game, before);

  const saved = Scorebook.commitRoundCorrection(game, { roundIndex: 0, now: 333, scores: { Alice: 3 } });
  assert.equal(saved.ok, true);
  assert.equal(game.rounds[0].scores.Alice, 3);
  assert.equal(game.totals.Alice, 3);
  assert.equal(game.auditLog.length, 1);
  assert.equal(game.auditLog[0].action, 'R1 Score Edited');
  assert.equal(game.auditLog[0].detail, 'Alice: 15 -> 3');
  assert.deepEqual(game.winners, ['Bob']);
});

test('a final-round Five Crowns correction can change the winner without reopening the match', () => {
  const game = {
    name: 'Five Crowns',
    originalRoster: ['Alice', 'Bob'],
    currentRound: 2,
    maxRounds: 1,
    completed: true,
    winners: ['Alice'],
    totals: { Alice: 5, Bob: 10 },
    auditLog: [],
    rounds: [{ round: 1, scores: { Alice: 5, Bob: 10 } }]
  };
  const result = Scorebook.commitRoundCorrection(game, { roundIndex: 0, scores: { Bob: 0 } });
  assert.equal(result.ok, true);
  assert.deepEqual(game.winners, ['Bob']);
  assert.equal(game.completed, true);
  assert.equal(result.standing.reopened, false);
  assert.equal(game.gameOver, true);
  assert.equal(game.currentRound, 2);
});

test('a Beat the Heat correction under 66 reopens the match and clears the winner', () => {
  const game = {
    name: 'Beat the Heat',
    endScore: 66,
    originalRoster: ['Alice', 'Bob'],
    currentRound: 3,
    maxRounds: 999,
    completed: true,
    winners: ['Alice'],
    totals: { Alice: 10, Bob: 70 },
    auditLog: [{ action: 'Match Started' }],
    rounds: [{ round: 1, scores: { Alice: 10, Bob: 70 } }]
  };
  const result = Scorebook.commitRoundCorrection(game, { roundIndex: 0, scores: { Bob: 20 } });
  assert.equal(result.ok, true);
  assert.equal(result.standing.reopened, true);
  assert.equal(game.completed, false);
  assert.equal(game.gameOver, false);
  assert.deepEqual(game.winners, []);
  assert.equal(game.totals.Bob, 20);
  assert.equal(game.auditLog.length, 2);
});

test('a Rook total under the win target reopens, and a Life Preserver round cannot be corrected', () => {
  const rook = {
    name: 'Rook',
    rookConfig: { winTarget: 100 },
    originalRoster: ['Alice', 'Bob'],
    currentRound: 2,
    maxRounds: 999,
    completed: true,
    winners: ['Bob'],
    totals: { Alice: 40, Bob: 110 },
    auditLog: [],
    rounds: [{ round: 1, scores: { Alice: 40, Bob: 110 } }]
  };
  const reopened = Scorebook.commitRoundCorrection(rook, { roundIndex: 0, scores: { Bob: 40 } });
  assert.equal(reopened.standing.reopened, true);
  assert.equal(rook.completed, false);
  assert.equal(rook.gameOver, false);
  assert.deepEqual(rook.winners, []);

  const spin = {
    name: 'Five Crowns',
    originalRoster: ['Alice'],
    totals: { Alice: -18 },
    auditLog: [],
    rounds: [{ round: 0, hailMaryBonus: true, scores: { Alice: -18 } }]
  };
  const blocked = Scorebook.commitRoundCorrection(spin, { roundIndex: 0, scores: { Alice: 0 } });
  assert.equal(blocked.ok, false);
  assert.equal(spin.totals.Alice, -18);
  assert.deepEqual(spin.auditLog, []);
});

test('a Life Preserver is an assisted match only after a spin is stored', () => {
  assert.equal(Scorebook.isAssistedMatch({ lifePreserverHeld: ['Linda'], rounds: [] }), false);
  assert.equal(Scorebook.isAssistedMatch({ hailMaryUsed: [], rounds: [{ round: 1, scores: { Linda: 4 } }] }), false);
  assert.equal(Scorebook.isAssistedMatch({ assistedMatch: true, rounds: [], hailMaryUsed: [] }), false);
  assert.equal(Scorebook.isAssistedMatch({ hailMaryUsed: ['Linda'], rounds: [{ round: 1, scores: { Linda: 4 } }] }), true);
  assert.equal(Scorebook.isAssistedMatch({
    rounds: [{ round: 0, hailMaryBonus: true, scores: { Brick: -18 } }]
  }), true);
  assert.equal(Scorebook.isPlayedScoringRound({ round: 0, hailMaryBonus: true, scores: { Brick: -18 } }), false);
  assert.equal(Scorebook.isSyntheticAdjustmentRound({ round: 0, scores: { Brick: -18 } }), true);
  assert.equal(Scorebook.isPlayedScoringRound({ round: 1, scores: { Brick: 0 } }), true);
});

test('recording a Life Preserver spin is included once and stays put when totals are rebuilt', () => {
  const game = {
    name: 'Five Crowns',
    originalRoster: ['Brick'],
    rounds: [{ round: 1, scores: { Brick: 4 } }],
    totals: { Brick: 4 },
    hailMaryUsed: [],
    lifePreserverHeld: ['Brick']
  };
  Scorebook.recordLifePreserverSpin(game, 'Brick', -18);
  assert.equal(game.assistedMatch, true);
  assert.deepEqual(game.hailMaryUsed, ['Brick']);
  assert.equal(game.rounds.length, 2);
  assert.equal(game.rounds[1].hailMaryBonus, true);
  assert.equal(game.totals.Brick, -14);
  Scorebook.recomputeTotals(game);
  Scorebook.recomputeTotals(game);
  assert.equal(game.totals.Brick, -14);
  assert.equal(game.rounds.length, 2);
  assert.equal(game.lifePreserverHeld[0], 'Brick');
});

test('records copy keeps the assisted-match rules on the page', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(page, /Unassisted matches only/);
  assert.match(page, /No unassisted matches yet/);
  assert.match(page, /Assisted Match/);
  assert.match(page, /BPGScorebook\.isSyntheticAdjustmentRound/);
  assert.match(page, /BPGScorebook\.isAssistedMatch/);
  assert.match(page, /BPGScorebook\.recordLifePreserverSpin/);
  assert.match(page, /BPGScorebook\.classifyBidAccuracy/);
  assert.match(page, /BPGScorebook\.syncAssistedMatch/);
  assert.match(page, /BPGScorebook\.historicalRoundParticipants/);
  assert.match(page, /historyReopenWouldReplaceActive/);
  assert.match(page, /ensureGameId/);
  assert.match(page, /BPGScorebook\.isCompletedHistoryMatch/);
  assert.match(page, /BPGScorebook\.scoreEntryValueIsBlank/);
  assert.match(page, /BPGScorebook\.unconfirmedScoreEntryMessage/);
  assert.match(page, /function parkActiveMatch/);
  assert.match(page, /Save the game on the table and resume this match\?/);
  assert.match(page, /data-match-status="incomplete"/);
  assert.match(page, /Resume Match/);
  assert.match(page, /score-entry-confirm-status/);
  assert.match(page, /function jsAttrArg/);
  const scorebook = fs.readFileSync(new URL('../public/assets/scorebook.js', import.meta.url), 'utf8');
  assert.match(scorebook, /Unentered · Tap 0 or enter score/);
  assert.match(scorebook, /Suggested: \$\{value\} \(tap Next to confirm\)/);
  assert.match(scorebook, /Confirmed: \$\{value\}/);
  assert.match(scorebook, /players still unconfirmed/);
  assert.doesNotMatch(page, /if\(score>0\)ms\[p\]\.exacts/);
  assert.doesNotMatch(page, /return Number\(score\)>=10/);
  assert.doesNotMatch(page, /if\(score!==0\) update\(games\["Five Crowns"\],'bestRound'/);
  const wheelStart = page.indexOf('function authorizeHailMary');
  const wheelEnd = page.indexOf('function applyLifePreserverResult');
  const wheel = page.slice(wheelStart, wheelEnd);
  assert.equal(wheel.includes('assistedMatch'), false);
  assert.equal(wheel.includes('recordLifePreserverSpin'), false);
});

test('historical edits on the page share one commit, cancel, and audit boundary', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(page, /BPGScorebook\.commitRoundCorrection/);
  assert.match(page, /function cancelRoundCorrection/);
  assert.match(page, /function cancelPastNumpad/);
  assert.match(page, /function openPastScoreCell/);
  assert.match(page, /score-cell-hit/);
  assert.match(page, /id="round-correction-modal"/);
  assert.match(page, /event\.key!=='Escape'/);
});

test('same-match merges are blocked for retired players and round-level seats', () => {
  const retired = {
    name: 'Five Crowns',
    originalRoster: ['Bea'],
    retired: ['Ada'],
    totals: { Bea: 4 },
    rounds: [{ round: 1, scores: { Bea: 4 } }]
  };
  assert.equal(Scorebook.findSharedMatch([retired], 'Ada', 'Bea'), retired);

  const tricksOnly = {
    name: '818',
    rounds: [{ round: 8, actuals: { Ada: 1, Bea: 0 }, bids: { Bea: 0 } }]
  };
  assert.equal(Scorebook.participantNames(tricksOnly).has('Ada'), true);
  assert.equal(Scorebook.findSharedMatch([tricksOnly], 'Ada', 'Bea'), tricksOnly);

  const rook = {
    name: 'Rook',
    rookHighBidder: 'Ada',
    rookPartner: 'Bea',
    rounds: [{ round: 1, rookBidder: 'Ada', rookPartner: 'Cal', scores: { Cal: 10 } }]
  };
  assert.equal(Scorebook.findSharedMatch([rook], 'Ada', 'Bea'), rook);
  assert.equal(Scorebook.findSharedMatch([rook], 'Ada', 'Cal'), rook);

  const before = JSON.parse(JSON.stringify(retired));
  Scorebook.applyPlayerNameOnGame(retired, 'Ada', 'Bea', true);
  assert.deepEqual(retired, before);
});

test('a fresh rename and a disjoint merge keep every match score intact', () => {
  const lindaGame = {
    name: 'Five Crowns',
    originalRoster: ['Linda', 'Cara'],
    totals: { Linda: 10, Cara: 4 },
    rounds: [{ round: 1, scores: { Linda: 10, Cara: 4 } }]
  };
  const mattGame = {
    name: 'Wizard',
    originalRoster: ['Matt'],
    retired: ['Matt'],
    totals: { Matt: 30 },
    rounds: [{ round: 1, scores: { Matt: 30 }, bids: { Matt: 1 }, actuals: { Matt: 1 } }]
  };
  assert.equal(Scorebook.findSharedMatch([lindaGame, mattGame], 'Linda', 'Matt'), null);
  Scorebook.applyPlayerNameOnGame(lindaGame, 'Linda', 'Matt', true);
  Scorebook.applyPlayerNameOnGame(mattGame, 'Linda', 'Matt', true);
  assert.equal(lindaGame.rounds[0].scores.Matt, 10);
  assert.equal(lindaGame.rounds[0].scores.Cara, 4);
  assert.equal(lindaGame.rounds[0].scores.Linda, undefined);
  assert.equal(mattGame.rounds[0].scores.Matt, 30);
  assert.equal(mattGame.rounds[0].actuals.Matt, 1);

  const fresh = {
    name: 'Flip 7 Vengeance',
    originalRoster: ['Sam'],
    totals: { Sam: 15 },
    rounds: [{ round: 1, scores: { Sam: 15 } }]
  };
  Scorebook.applyPlayerNameOnGame(fresh, 'Sam', 'Samuel', false);
  assert.equal(fresh.rounds[0].scores.Samuel, 15);
  assert.equal(fresh.totals.Sam, undefined);
});

test('the rename path checks every match before it changes storage', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(page, /BPGScorebook\.findSharedMatch/);
  assert.match(page, /mergePlayerRecords\(oldName, newName\)===false/);
  assert.match(page, /mergePlayerRecords\(src, target\)===false/);
  assert.match(page, /both played in the same match/);
});

test('a blank live trick is rejected before it can be stored as zero', () => {
  const checked = Scorebook.validateEntries({
    game: 'Wizard',
    kind: 'tricks',
    roundNumber: 2,
    players: ['Alice', 'Bob'],
    values: { Alice: '', Bob: '2' }
  });
  assert.equal(checked.ok, false);
  assert.equal(checked.values.Alice, undefined);
  assert.equal(checked.values.Bob, 2);
  assert.match(checked.message, /Check Alice/);
});

test('the 12-player records fixture keeps Brick’s spin beside a real zero hand', async () => {
  const {QA_SCENARIOS} = await import('../public/qa/fixtures.mjs');
  const heal = QA_SCENARIOS['records-assisted-heal'].data;
  assert.equal(heal.allPlayers.length, 12);
  assert.equal(heal.currentGame, null);
  assert.equal(heal.history.length, 2);
  const assisted = heal.history.find(match => match.assistedMatch === true);
  const plain = heal.history.find(match => match.assistedMatch !== true);
  assert.ok(assisted);
  assert.ok(plain);
  assert.equal(Scorebook.isAssistedMatch(assisted), true);
  assert.equal(Scorebook.isAssistedMatch(plain), false);
  assert.equal(assisted.originalRoster.length, 12);
  const spin = assisted.rounds.find(round => round.hailMaryBonus === true);
  const hand = assisted.rounds.find(round => round.round === 1);
  assert.equal(spin.scores.Brick, -18);
  assert.equal(spin.round, 0);
  assert.equal(Scorebook.isSyntheticAdjustmentRound(spin), true);
  assert.equal(Scorebook.isPlayedScoringRound(hand), true);
  assert.equal(hand.scores.Brick, 0);
  assert.equal(assisted.totals.Brick, -18);
  assert.equal(plain.totals.Matt, 4);
  const copy = JSON.parse(JSON.stringify(assisted));
  const before = JSON.stringify({totals: copy.totals, rounds: copy.rounds});
  Scorebook.recomputeTotals(copy);
  Scorebook.recomputeTotals(copy);
  assert.equal(JSON.stringify({totals: copy.totals, rounds: copy.rounds}), before);
  assert.equal(copy.rounds.length, 2);
  const home = QA_SCENARIOS['home-party'].data.history;
  assert.equal(home.some(match => (match.rounds || []).some(round => round.scores && round.scores.Brick === -18)), false);
});

test('bid accuracy uses bids and actuals, including legacy scores and rule-consistent 818 rounds', () => {
  assert.equal(Scorebook.eight18RoundScore(3, 2), 2);
  assert.equal(Scorebook.eight18RoundScore(0, 0), 10);
  // Legacy/inconsistent-score fixtures. The stored score is not the shelf formula.
  // Bid accuracy ignores it and compares bid with actual.
  assert.equal(EIGHT18_BID_ACCURACY_ROUNDS.legacyMiss.fixtureKind, 'legacy-inconsistent-score');
  assert.equal(EIGHT18_BID_ACCURACY_ROUNDS.legacyMiss.scores.Ada, 15);
  assert.equal(Scorebook.classifyBidAccuracy(EIGHT18_BID_ACCURACY_ROUNDS.legacyMiss, 'Ada'), 'miss');
  assert.equal(EIGHT18_BID_ACCURACY_ROUNDS.legacyExactZero.fixtureKind, 'legacy-inconsistent-score');
  assert.equal(EIGHT18_BID_ACCURACY_ROUNDS.legacyExactZero.scores.Bea, 0);
  assert.equal(Scorebook.classifyBidAccuracy(EIGHT18_BID_ACCURACY_ROUNDS.legacyExactZero, 'Bea'), 'exact');
  // Rule-consistent 818. A miss scores the tricks taken. An exact zero scores tricks + 10.
  assert.equal(EIGHT18_BID_ACCURACY_ROUNDS.standardMiss.fixtureKind, 'rule-consistent-818');
  assert.deepEqual(EIGHT18_BID_ACCURACY_ROUNDS.standardMiss.scores, { Dee: 2 });
  assert.equal(Scorebook.classifyBidAccuracy(EIGHT18_BID_ACCURACY_ROUNDS.standardMiss, 'Dee'), 'miss');
  assert.equal(EIGHT18_BID_ACCURACY_ROUNDS.standardExactZero.fixtureKind, 'rule-consistent-818');
  assert.deepEqual(EIGHT18_BID_ACCURACY_ROUNDS.standardExactZero.scores, { Eve: 10 });
  assert.equal(Scorebook.classifyBidAccuracy(EIGHT18_BID_ACCURACY_ROUNDS.standardExactZero, 'Eve'), 'exact');
  const legacy = { round: 2, scores: { Cal: 40 } };
  assert.equal(Scorebook.classifyBidAccuracy(legacy, 'Cal'), null);
  const spin = { round: 0, hailMaryBonus: true, scores: { Ada: 15 }, bids: { Ada: 1 }, actuals: { Ada: 1 } };
  assert.equal(Scorebook.classifyBidAccuracy(spin, 'Ada'), null);
});

test('Next leaves a blank score unentered and confirms a suggested bid', () => {
  const blank = Scorebook.createScoreEntrySession(['Ada', 'Bea', 'Cal', 'Dan'], { Ada: '', Bea: '', Cal: '', Dan: '' });
  Scorebook.confirmScoreEntryOnNext(blank);
  assert.equal(blank.values.Ada, '');
  assert.equal(blank.acknowledged.Ada, false);
  assert.equal(blank.activePlayer, 'Bea');
  assert.equal(Scorebook.scoreEntryStatus({ value: '', acknowledged: false }).state, 'unentered');
  assert.equal(Scorebook.scoreEntryStatus({ value: '', acknowledged: false }).label, 'Unentered · Tap 0 or enter score');
  assert.equal(Scorebook.unconfirmedScoreEntryMessage(blank), '4 of 4 players still unconfirmed');
  Scorebook.pressScoreEntryKey(blank, '0');
  assert.equal(blank.values.Bea, '0');
  assert.equal(blank.acknowledged.Bea, true);
  assert.equal(Scorebook.scoreEntryStatus({ value: '0', acknowledged: true }).label, '✓ Confirmed: 0');

  const suggested = Scorebook.createScoreEntrySession(['Ada', 'Bea'], { Ada: '3', Bea: '0' });
  assert.equal(Scorebook.scoreEntryStatus({ value: '3', acknowledged: false }).state, 'suggested');
  assert.equal(Scorebook.scoreEntryStatus({ value: '3', acknowledged: false }).label, '💡 Suggested: 3 (tap Next to confirm)');
  assert.equal(Scorebook.scoreEntryStatus({ value: '0', acknowledged: false }).label, '💡 Suggested: 0 (tap Next to confirm)');
  Scorebook.confirmScoreEntryOnNext(suggested);
  assert.equal(suggested.values.Ada, '3');
  assert.equal(suggested.acknowledged.Ada, true);
  assert.equal(Scorebook.scoreEntryStatus({ value: '3', acknowledged: true }).label, '✓ Confirmed: 3');
  assert.equal(Scorebook.unconfirmedScoreEntryMessage(suggested), '1 of 2 players still unconfirmed');
  Scorebook.selectScoreEntryPlayer(suggested, 'Bea');
  Scorebook.confirmScoreEntryOnNext(suggested);
  assert.equal(suggested.acknowledged.Bea, true);
  assert.equal(Scorebook.unconfirmedScoreEntryMessage(suggested), '');
});

test('an incomplete history row is left out of completed-match stats', () => {
  assert.equal(Scorebook.isCompletedHistoryMatch(null), false);
  assert.equal(Scorebook.isCompletedHistoryMatch({ completed: false, gameOver: true, winners: ['Ada'] }), false);
  assert.equal(Scorebook.isCompletedHistoryMatch({ completed: true, gameOver: false, winners: [] }), false);
  assert.equal(Scorebook.isCompletedHistoryMatch({ winners: ['Ada'] }), true);
  assert.equal(Scorebook.isCompletedHistoryMatch({ completed: true, gameOver: true }), true);
});

test('the shared commit boundary rejects blank, whitespace, non-finite, fractional, and out-of-range values', () => {
  const check = (game, kind, roundNumber, raw) => Scorebook.validateEntries({
    game,
    kind,
    roundNumber,
    players: ['Ada'],
    values: { Ada: raw }
  });
  ['', '   ', NaN, Infinity, -Infinity, 'NaN', 'Infinity', 2.5, '2.5'].forEach(raw => {
    assert.equal(check('Wizard', 'tricks', 2, raw).ok, false, `trick ${String(raw)}`);
    assert.equal(check('Five Crowns', 'scores', 1, raw).ok, false, `score ${String(raw)}`);
    assert.equal(check('Flip 7 Vengeance', 'scores', 1, raw).ok, false, `flip ${String(raw)}`);
    assert.equal(check('Beat the Heat', 'scores', 1, raw).ok, false, `heat ${String(raw)}`);
  });
  [-1, '-1', 3].forEach(raw => {
    const tricks = check('818', 'tricks', 8, raw);
    assert.equal(tricks.ok, false, String(raw));
    assert.equal(tricks.limit, 1);
  });
  assert.equal(check('Wizard', 'tricks', 4, 0).ok, true);
  assert.equal(check('Wizard', 'tricks', 4, '0').values.Ada, 0);
  assert.equal(check('Five Crowns', 'scores', 1, 0).values.Ada, 0);
  assert.equal(check('Beat the Heat', 'scores', 2, '0').values.Ada, 0);

  const game = {
    name: 'Five Crowns',
    originalRoster: ['Ada'],
    totals: { Ada: 15 },
    auditLog: [],
    rounds: [{ round: 1, scores: { Ada: 15 } }]
  };
  const before = JSON.stringify(game);
  ['', '   ', NaN, Infinity, 2.5, -1].forEach(raw => {
    const result = Scorebook.commitRoundCorrection(game, { roundIndex: 0, scores: { Ada: raw } });
    assert.equal(result.ok, false, String(raw));
    assert.equal(JSON.stringify(game), before);
  });
  const saved = Scorebook.commitRoundCorrection(game, { roundIndex: 0, now: 9, scores: { Ada: '0' } });
  assert.equal(saved.ok, true);
  assert.equal(game.rounds[0].scores.Ada, 0);
  assert.equal(game.totals.Ada, 0);
  assert.equal(game.auditLog.at(-1).detail, 'Ada: 15 -> 0');
});

test('a historical trick correction counts the players who were in that round', () => {
  const game = {
    name: '818',
    dealerOffset: 0,
    originalRoster: ['Alice', 'Bob', 'Cara', 'Dan'],
    retired: ['Cara'],
    currentRound: 4,
    maxRounds: 15,
    completed: false,
    totals: { Alice: 2, Bob: 2, Cara: 2, Dan: 1 },
    auditLog: [],
    rounds: [{
      round: 3,
      bids: { Alice: 1, Bob: 1, Cara: 1, Dan: 0 },
      actuals: { Alice: 2, Bob: 2, Cara: 2, Dan: 1 },
      scores: { Alice: 2, Bob: 2, Cara: 2, Dan: 1 },
      joinBonus: { Dan: true }
    }]
  };
  assert.deepEqual(Scorebook.historicalRoundParticipants(game, game.rounds[0]), ['Alice', 'Bob', 'Cara']);
  const before = JSON.stringify(game);
  const ignoredRetired = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    actuals: { Alice: 4, Bob: 2 }
  });
  assert.equal(ignoredRetired.ok, false);
  assert.match(ignoredRetired.message, /must total 6/);
  assert.equal(JSON.stringify(game), before);

  const saved = Scorebook.commitRoundCorrection(game, {
    roundIndex: 0,
    now: 44,
    actuals: { Alice: 3, Bob: 1, Cara: 2 }
  });
  assert.equal(saved.ok, true);
  assert.deepEqual(game.rounds[0].actuals, { Alice: 3, Bob: 1, Cara: 2, Dan: 1 });
  assert.equal(game.rounds[0].scores.Cara, 2);
  assert.equal(game.retired[0], 'Cara');

  const illegal = {
    name: '818',
    dealerOffset: 0,
    originalRoster: ['Alice', 'Bob', 'Cara', 'Dan'],
    retired: ['Cara'],
    currentRound: 4,
    totals: { Alice: 2, Bob: 2, Cara: 2 },
    auditLog: [],
    rounds: [{
      round: 3,
      bids: { Alice: 1, Bob: 1, Cara: 4 },
      actuals: { Alice: 2, Bob: 2, Cara: 2 },
      scores: { Alice: 2, Bob: 2, Cara: 2 }
    }]
  };
  const dealer = Scorebook.commitRoundCorrection(illegal, {
    roundIndex: 0,
    actuals: { Alice: 2, Bob: 2, Cara: 2 }
  });
  assert.equal(dealer.ok, false);
  assert.equal(dealer.message, 'Dealer Cara cannot bid 4 on round 3.');
  assert.equal(illegal.auditLog.length, 0);
  assert.equal(illegal.rounds[0].actuals.Cara, 2);
});

test('reopening a saved match does not replace a different active game', () => {
  const active = { id: 111, gameId: 111, name: 'Five Crowns', rounds: [{ round: 1, scores: { Matt: 4 } }] };
  const edited = { id: 66, gameId: 66, game: 'Beat the Heat' };
  assert.equal(Scorebook.historyReopenWouldReplaceActive(active, edited), true);
  assert.equal(Scorebook.historyReopenWouldReplaceActive(null, edited), false);
  assert.equal(Scorebook.historyReopenWouldReplaceActive(edited, edited), false);
  assert.equal(Scorebook.historyReopenWouldReplaceActive({ name: 'Wizard' }, edited), true);
  const reopened = { id: 66, gameId: 66, completed: false, gameOver: false, winners: [] };
  assert.equal(Scorebook.isCompletedHistoryMatch(reopened), false);
});

test('undoing the only Life Preserver clears assistedMatch, including a zero-point spin', () => {
  const game = {
    name: 'Five Crowns',
    originalRoster: ['Ada'],
    currentRound: 3,
    rounds: [
      { round: 1, scores: { Ada: 12 } },
      { round: 0, hailMaryBonus: true, scores: { Ada: -5 } },
      { round: 2, scores: { Ada: 4 } }
    ],
    totals: { Ada: 11 },
    hailMaryUsed: ['Ada'],
    assistedMatch: true
  };
  const undo = target => {
    let lastIdx = -1;
    for (let i = target.rounds.length - 1; i >= 0; i -= 1) {
      if (!target.rounds[i].hailMaryBonus) { lastIdx = i; break; }
    }
    if (lastIdx < 0) return false;
    const removed = target.rounds.slice(lastIdx);
    target.rounds = target.rounds.slice(0, lastIdx);
    target.hailMaryUsed = Life.releaseRemovedLifePreservers(target.hailMaryUsed, removed);
    Scorebook.syncAssistedMatch(target);
    Scorebook.recomputeTotals(target);
    return true;
  };
  assert.equal(undo(game), true);
  assert.equal(Scorebook.isAssistedMatch(game), true);
  assert.equal(game.assistedMatch, true);
  assert.equal(undo(game), true);
  assert.equal(game.assistedMatch, false);
  assert.deepEqual(game.hailMaryUsed, []);
  const reloaded = JSON.parse(JSON.stringify(game));
  assert.equal(Scorebook.isAssistedMatch(reloaded), false);

  const neutral = {
    name: 'Five Crowns',
    originalRoster: ['Ada'],
    currentRound: 2,
    rounds: [{ round: 1, scores: { Ada: 12 } }],
    totals: { Ada: 12 },
    hailMaryUsed: [],
    assistedMatch: false
  };
  Scorebook.recordLifePreserverSpin(neutral, 'Ada', 0);
  assert.equal(neutral.totals.Ada, 12);
  assert.equal(neutral.assistedMatch, true);
  assert.deepEqual(neutral.hailMaryUsed, ['Ada']);
  assert.equal(neutral.rounds.at(-1).scores.Ada, 0);
  assert.equal(undo(neutral), true);
  assert.equal(neutral.assistedMatch, false);
  assert.equal(neutral.rounds.some(round => round.hailMaryBonus), false);
  const stored = JSON.parse(JSON.stringify(neutral));
  assert.equal(Scorebook.isAssistedMatch(stored), false);
  assert.equal(stored.assistedMatch, false);
});

test('every match keeps a stable gameId once it has one', () => {
  const legacy = { id: 42, name: 'Wizard', currentRound: 3, wizardPhase: 'scoring' };
  assert.equal(Scorebook.ensureGameId(legacy), 42);
  assert.equal(legacy.gameId, 42);
  assert.equal(Scorebook.ensureGameId(legacy), 42);
  const fresh = { name: '818', currentRound: 4 };
  const minted = Scorebook.ensureGameId(fresh);
  assert.ok(minted);
  assert.equal(fresh.id, minted);
  assert.equal(Scorebook.ensureGameId(fresh), minted);
  const identity = Scorebook.matchIdentity(fresh);
  assert.deepEqual(identity, { gameId: minted, round: 4, phase: 'bidding' });
  const named = { gameId: 'porch-night', name: 'Five Crowns', currentRound: 2 };
  assert.equal(Scorebook.ensureGameId(named), 'porch-night');
  assert.equal(named.id, 'porch-night');
});
