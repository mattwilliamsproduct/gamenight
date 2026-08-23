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

test('manual backup merge never erases a live local match', () => {
  const active = {
    name: '818',
    syncId: 'live-818',
    originalRoster: ['Matt', 'Cat'],
    currentRound: 7
  };
  const current = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: active
  };
  const incoming = Backup.buildBackup({
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: null
  });
  const { next } = Backup.mergeBackup(current, incoming);
  assert.equal(next.currentGame, active);
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

test('cloud merge adopts a remote active match when this copy has none', () => {
  const remoteGame = {
    name: 'Five Crowns',
    syncId: 'remote-five-crowns',
    updatedAt: 20,
    originalRoster: ['Matt', 'Cat']
  };
  const local = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {}
  };
  const remote = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: remoteGame
  };
  const { next, added } = Backup.mergeCloud(local, remote);
  assert.equal(added.games, 0);
  assert.equal(added.players, 0);
  assert.equal(next.currentGame, remoteGame);
});

test('cloud merge takes newer progress for the same active match', () => {
  const common = {
    name: 'Wizard',
    syncId: 'shared-wizard',
    originalRoster: ['Matt', 'Cat']
  };
  const local = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: { ...common, updatedAt: 10, currentRound: 3 }
  };
  const remote = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: { ...common, updatedAt: 20, currentRound: 4 }
  };
  const { next, currentGameConflict } = Backup.mergeCloud(local, remote);
  assert.equal(currentGameConflict, false);
  assert.equal(next.currentGame.currentRound, 4);
});

test('cloud merge flags different active matches instead of overwriting either one', () => {
  const localGame = {
    name: '818',
    syncId: 'local-game',
    updatedAt: 30,
    originalRoster: ['Matt', 'Cat']
  };
  const local = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: localGame
  };
  const remote = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: {
      name: 'Five Crowns',
      syncId: 'remote-game',
      updatedAt: 40,
      originalRoster: ['Matt', 'Cat']
    }
  };
  const { next, currentGameConflict } = Backup.mergeCloud(local, remote);
  assert.equal(currentGameConflict, true);
  assert.equal(next.currentGame, localGame);
});

test('cloud merge drops a stale local match that was already finished remotely', () => {
  const localGame = {
    name: '818',
    syncId: 'finished-818',
    updatedAt: 30,
    originalRoster: ['Matt', 'Cat']
  };
  const local = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    playerProfiles: {},
    currentGame: localGame
  };
  const remote = {
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [{
      id: 50,
      game: '818',
      syncId: 'finished-818',
      totals: { Matt: 80, Cat: 70 }
    }],
    playerProfiles: {},
    currentGame: null
  };
  const { next, currentGameConflict } = Backup.mergeCloud(local, remote);
  assert.equal(currentGameConflict, false);
  assert.equal(next.currentGame, null);
});

test('parseBackup rejects junk and accepts a v1 paste payload', () => {
  assert.throws(() => Backup.parseBackup('{"hello":true}'));
  const parsed = Backup.parseBackup(JSON.stringify({
    allPlayers: ['Matt'],
    history: [{ id: 3, game: 'Beat the Heat', totals: { Matt: 11 } }]
  }));
  assert.equal(parsed.history[0].game, 'Beat the Heat');
});
