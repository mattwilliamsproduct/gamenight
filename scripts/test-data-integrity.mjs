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
