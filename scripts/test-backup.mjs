import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Backup = require('../public/assets/backup.js');

test('export keeps every game, including Beat the Heat and 818', () => {
  const history = [
    { id: 1, game: 'Five Crowns', totals: { Matt: 40 } },
    { id: 2, game: '818', totals: { Matt: 88 } },
    { id: 3, game: 'Beat the Heat', totals: { Matt: 22 } },
    { id: 4, game: 'Wizard', totals: { Matt: 140 } }
  ];
  const backup = Backup.buildBackup({
    allPlayers: ['Matt'],
    players: ['Matt'],
    history,
    playerProfiles: { Matt: { avatar: 'neo.png' } },
    currentGame: null
  });
  assert.equal(backup.version, 2);
  assert.equal(backup.history.length, 4);
  assert.equal(backup.gameCounts['Beat the Heat'], 1);
  assert.equal(backup.gameCounts['818'], 1);
  assert.match(Backup.formatGameCounts(backup.gameCounts), /Beat the Heat 1/);
  assert.match(Backup.formatGameCounts(backup.gameCounts), /818 1/);
});

test('old backups without version still import every history row', () => {
  const current = {
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [{ id: 1, game: 'Wizard', totals: { Matt: 90 } }],
    playerProfiles: {},
    currentGame: null
  };
  const incoming = {
    allPlayers: ['Matt', 'Cat'],
    history: [
      { id: 1, game: 'Wizard', totals: { Matt: 90 } },
      { id: 9, game: 'Beat the Heat', totals: { Matt: 18, Cat: 40 } },
      { id: 10, game: '818', totals: { Matt: 70, Cat: 64 } }
    ]
  };
  const { next, added } = Backup.mergeBackup(current, incoming);
  assert.equal(next.history.length, 3);
  assert.equal(added.games, 2);
  assert.equal(added.byGame['Beat the Heat'], 1);
  assert.equal(added.byGame['818'], 1);
  assert.ok(next.allPlayers.includes('Cat'));
  assert.equal(added.incoming.counts['Beat the Heat'], 1);
});

test('cloud merge keeps a live local match and unions Beat the Heat history', () => {
  const local = {
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [{ id: 1, game: 'Wizard', totals: { Matt: 80 } }],
    playerProfiles: {},
    currentGame: { name: '818', originalRoster: ['Matt'] }
  };
  const remote = {
    allPlayers: ['Matt', 'Cat'],
    history: [
      { id: 1, game: 'Wizard', totals: { Matt: 80 } },
      { id: 4, game: 'Beat the Heat', totals: { Matt: 20, Cat: 33 } }
    ],
    currentGame: null
  };
  const { next, added } = Backup.mergeCloud(local, remote);
  assert.equal(next.currentGame.name, '818');
  assert.equal(added.games, 1);
  assert.equal(next.history.some(match => match.game === 'Beat the Heat'), true);
});

test('file merge adds unknown games and players and replaces a live match when the file has one', () => {
  const current = {
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [{ id: 1, game: 'Wizard', totals: { Matt: 90 } }],
    playerProfiles: { Matt: { avatar: 'old.png' } },
    currentGame: { name: '818', originalRoster: ['Matt'] },
    prefs: { dealerRoll: false },
    uiScale: 16
  };
  const incoming = Backup.buildBackup({
    allPlayers: ['Matt', 'Cat'],
    players: ['Cat'],
    history: [
      { id: 1, game: 'Wizard', totals: { Matt: 999 } },
      { id: 8, game: 'Five Crowns', totals: { Cat: 12 } }
    ],
    playerProfiles: { Cat: { avatar: 'joker-cards.png' } },
    currentGame: { name: 'Rook', originalRoster: ['Cat'] },
    prefs: { dealerRoll: true },
    uiScale: 18
  });
  const { next, added } = Backup.mergeBackup(current, incoming);
  assert.equal(next.history.length, 3);
  assert.equal(next.history[0].game, '818');
  assert.equal(next.history[0].outcome, 'paused');
  assert.equal(next.history[0].completed, false);
  assert.equal(next.history[1].totals.Matt, 90);
  assert.equal(added.games, 2);
  assert.equal(added.parked, true);
  assert.ok(next.allPlayers.includes('Cat'));
  assert.equal(next.currentGame.name, 'Rook');
  assert.equal(next.prefs.dealerRoll, true);
  assert.equal(next.uiScale, 18);
  assert.equal(next.playerProfiles.Matt.avatar, 'old.png');
  assert.equal(next.playerProfiles.Cat.avatar, 'joker-cards.png');
});

test('restore preview names adds, same-id skips, a replaced live match, and overwrites', () => {
  const current = {
    allPlayers: ['Quinn'],
    players: ['Quinn'],
    history: [{ id: 1, game: 'Wizard', totals: { Quinn: 90 } }],
    playerProfiles: { Quinn: { avatar: 'old.png', color: 1 } },
    currentGame: { name: '818', originalRoster: ['Quinn'] },
    prefs: { lineupIntro: true, statMontage: false, dealerRoll: false },
    uiScale: 16
  };
  const incoming = Backup.buildBackup({
    allPlayers: ['Quinn', 'Alex Rivera'],
    players: ['Alex Rivera'],
    history: [
      { id: 1, game: 'Wizard', totals: { Quinn: 999 } },
      { id: 8, game: 'Five Crowns', totals: { 'Alex Rivera': 12 } }
    ],
    playerProfiles: {
      Quinn: { avatar: 'indiana.png', color: 1 },
      'Alex Rivera': { avatar: 'hermione.png' }
    },
    currentGame: { name: 'Beat the Heat', originalRoster: ['Alex Rivera'] },
    prefs: { lineupIntro: false, statMontage: true, dealerRoll: true },
    uiScale: 18
  });
  const { next, lines } = Backup.restoreChangeLines(current, incoming);
  const text = lines.join(' ');
  assert.match(text, /Adds 1 player: Alex Rivera/);
  assert.match(text, /Seats Alex Rivera tonight/);
  assert.match(text, /Adds 2 games/);
  assert.match(text, /same id stays as it is/);
  assert.match(text, /Saves the match on this table, then puts Beat the Heat on the table/);
  assert.match(text, /Neither match is discarded/);
  assert.match(text, /Overwrites photos for Quinn, Alex Rivera/);
  assert.match(text, /Sets text size to 18/);
  assert.match(text, /lineup intro off/);
  assert.equal(next.history.find(match => match.game === 'Wizard').totals.Quinn, 90);
  assert.equal(next.currentGame.name, 'Beat the Heat');
  assert.equal(next.history.some(match => match.game === '818' && match.outcome === 'paused'), true);
});

test('an empty table in a file does not clear the match here', () => {
  const current = {
    allPlayers: ['Quinn'],
    players: ['Quinn'],
    history: [],
    playerProfiles: {},
    currentGame: { id: 4, name: 'Five Crowns', totals: { Quinn: 12 } }
  };
  const incoming = Backup.buildBackup({
    allPlayers: ['Quinn'],
    players: ['Quinn'],
    history: [],
    currentGame: null
  });
  const { next, lines } = Backup.restoreChangeLines(current, incoming);
  assert.equal(next.currentGame.name, 'Five Crowns');
  assert.equal(next.currentGame.totals.Quinn, 12);
  assert.match(lines.join(' '), /does not clear it/);
});

test('parseBackup rejects junk and accepts a v1 paste payload', () => {
  assert.throws(() => Backup.parseBackup('{"hello":true}'));
  const parsed = Backup.parseBackup(JSON.stringify({
    allPlayers: ['Matt'],
    history: [{ id: 3, game: 'Beat the Heat', totals: { Matt: 11 } }]
  }));
  assert.equal(parsed.history[0].game, 'Beat the Heat');
});

test('cloud merge never revives a finished match in either direction while keeping a different live match and Resume/Reopen intact', () => {
  // 1. Finished locally while cloud still holds stale in-progress currentGame for same ID
  const finishedLocally = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [{ id: 'm-1', game: 'Five Crowns', completed: true, winners: ['Matt'], totals: { Matt: 12, Cat: 30 } }],
      playerProfiles: {},
      currentGame: null
    },
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'm-1', name: 'Five Crowns', currentRound: 5, rounds: [{ round: 1, scores: { Matt: 0, Cat: 5 } }] }
    }
  );
  assert.equal(finishedLocally.next.currentGame, null, 'stale cloud currentGame must not revive a locally finished match');

  // 2. Finished in cloud while local still holds stale in-progress currentGame for same ID
  const finishedInCloud = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'm-1', name: 'Five Crowns', currentRound: 5, rounds: [{ round: 1, scores: { Matt: 0, Cat: 5 } }] }
    },
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [{ id: 'm-1', game: 'Five Crowns', completed: true, winners: ['Matt'], totals: { Matt: 12, Cat: 30 } }],
      playerProfiles: {},
      currentGame: null
    }
  );
  assert.equal(finishedInCloud.next.currentGame, null, 'stale local currentGame must clear when match is finished in cloud');
  assert.equal(finishedInCloud.next.history.some(h => h.id === 'm-1' && h.completed === true), true);

  // 3. Different live match stays active on the table
  const differentLive = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'm-2', name: 'Wizard', currentRound: 3, rounds: [{ round: 1, scores: { Matt: 20, Cat: 20 } }] }
    },
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [{ id: 'm-1', game: 'Five Crowns', completed: true, winners: ['Matt'], totals: { Matt: 12, Cat: 30 } }],
      playerProfiles: {},
      currentGame: { id: 'm-1', name: 'Five Crowns', currentRound: 5, rounds: [] }
    }
  );
  assert.equal(differentLive.next.currentGame?.id, 'm-2', 'a different live match must remain on the table');

  // 4. Intentional Resume of a paused match stays active even if cloud still has the paused entry
  const resumedPaused = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'm-3', name: 'Five Crowns', currentRound: 4, rounds: [] }
    },
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [{ id: 'm-3', game: 'Five Crowns', outcome: 'paused', completed: false, gameOver: false, winners: [], totals: { Matt: 10, Cat: 15 } }],
      playerProfiles: {},
      currentGame: null
    }
  );
  assert.equal(resumedPaused.next.currentGame?.id, 'm-3', 'resumed paused match must stay active');

  // 5. Intentional Reopen of a finished match stays active over an older finished cloud entry
  const reopenedMatch = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'm-4', name: 'Beat the Heat', currentRound: 5, rounds: [], reopenedAt: Date.now() }
    },
    {
      savedAt: new Date(Date.now() - 60000).toISOString(),
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [{ id: 'm-4', game: 'Beat the Heat', completed: true, winners: ['Matt'], totals: { Matt: 40, Cat: 68 } }],
      playerProfiles: {},
      currentGame: null
    }
  );
  assert.equal(reopenedMatch.next.currentGame?.id, 'm-4', 'intentionally reopened match must stay active');
  assert.equal(reopenedMatch.next.history.some(h => h.id === 'm-4'), false, 'stale finished copy should not duplicate reopened match');
});

test('cloud merge protects local offline Undo and accepts genuinely newer cloud updates across pre-updatedAt copies', () => {
  // (a1) Stale cloud snapshot (older updatedAt) cannot overwrite a local offline Undo
  const undoWithTimestamps = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: {
        id: 'undo-1',
        name: 'Five Crowns',
        currentRound: 3,
        updatedAt: 20000,
        rounds: [{ round: 1, scores: { Matt: 0, Cat: 5 } }, { round: 2, scores: { Matt: 4, Cat: 8 } }],
        auditLog: [{ action: 'Match started' }, { action: 'R1' }, { action: 'R2' }, { action: 'R3' }, { action: 'R3 undone' }]
      }
    },
    {
      savedAt: new Date(10000).toISOString(),
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: {
        id: 'undo-1',
        name: 'Five Crowns',
        currentRound: 4,
        updatedAt: 10000,
        rounds: [
          { round: 1, scores: { Matt: 0, Cat: 5 } },
          { round: 2, scores: { Matt: 4, Cat: 8 } },
          { round: 3, scores: { Matt: 20, Cat: 12 } }
        ],
        auditLog: [{ action: 'Match started' }, { action: 'R1' }, { action: 'R2' }, { action: 'R3' }]
      }
    }
  );
  assert.equal(undoWithTimestamps.next.currentGame.rounds.length, 2, 'local offline undo must survive older timestamped cloud copy');
  assert.equal(undoWithTimestamps.next.currentGame.currentRound, 3);

  // (a2) Stale cloud snapshot predating updatedAt (no updatedAt, no savedAt) still loses to local undo via append-only auditLog
  const undoVsLegacyCloud = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: {
        id: 'undo-2',
        name: 'Five Crowns',
        currentRound: 3,
        updatedAt: 20000,
        rounds: [{ round: 1 }, { round: 2 }],
        auditLog: [{ action: 'start' }, { action: 'R1' }, { action: 'R2' }, { action: 'R3' }, { action: 'R3 undone' }]
      }
    },
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: {
        id: 'undo-2',
        name: 'Five Crowns',
        currentRound: 4,
        rounds: [{ round: 1 }, { round: 2 }, { round: 3 }],
        auditLog: [{ action: 'start' }, { action: 'R1' }, { action: 'R2' }, { action: 'R3' }]
      }
    }
  );
  assert.equal(undoVsLegacyCloud.next.currentGame.rounds.length, 2, 'local undo must survive untimestamped legacy cloud copy');

  // (b1) Stale local match (with older updatedAt) accepts genuinely newer cloud update (with newer updatedAt)
  const newerCloudBothTs = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'live-1', name: 'Five Crowns', currentRound: 2, updatedAt: 10000, rounds: [{ round: 1 }], auditLog: [{ action: 'R1' }] }
    },
    {
      savedAt: new Date(25000).toISOString(),
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'live-1', name: 'Five Crowns', currentRound: 4, updatedAt: 25000, rounds: [{ round: 1 }, { round: 2 }, { round: 3 }], auditLog: [{ action: 'R1' }, { action: 'R2' }, { action: 'R3' }] }
    }
  );
  assert.equal(newerCloudBothTs.next.currentGame.rounds.length, 3, 'stale local match must accept newer cloud match');

  // (b2) Stale local match predating updatedAt accepts genuinely newer cloud update (with updatedAt)
  const legacyLocalNewerCloud = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'live-2', name: 'Five Crowns', currentRound: 2, rounds: [{ round: 1 }], auditLog: [{ action: 'R1' }] }
    },
    {
      savedAt: new Date(30000).toISOString(),
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'live-2', name: 'Five Crowns', currentRound: 4, updatedAt: 30000, rounds: [{ round: 1 }, { round: 2 }, { round: 3 }], auditLog: [{ action: 'R1' }, { action: 'R2' }, { action: 'R3' }] }
    }
  );
  assert.equal(legacyLocalNewerCloud.next.currentGame.rounds.length, 3, 'legacy local match without updatedAt must accept newer cloud match');

  // (b3) Stale local match (with updatedAt) accepts genuinely newer legacy cloud update (no updatedAt, newer savedAt)
  const localTsNewerLegacyCloud = Backup.mergeCloud(
    {
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'live-3', name: 'Five Crowns', currentRound: 2, updatedAt: 10000, rounds: [{ round: 1 }], auditLog: [{ action: 'R1' }] }
    },
    {
      savedAt: new Date(30000).toISOString(),
      allPlayers: ['Matt', 'Cat'],
      players: ['Matt', 'Cat'],
      history: [],
      playerProfiles: {},
      currentGame: { id: 'live-3', name: 'Five Crowns', currentRound: 3, rounds: [{ round: 1 }, { round: 2 }], auditLog: [{ action: 'R1' }, { action: 'R2' }] }
    }
  );
  assert.equal(localTsNewerLegacyCloud.next.currentGame.rounds.length, 2, 'stale timestamped local match must accept newer legacy cloud update');
});
