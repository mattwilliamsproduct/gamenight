import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');

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
  assert.equal(Scorebook.isAssistedMatch({ assistedMatch: true, rounds: [] }), true);
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
