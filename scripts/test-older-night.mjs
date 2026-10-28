import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const Backup = require('../public/assets/backup.js');
const Games = require('../public/assets/game-registry.js');
const Scorebook = require('../public/assets/scorebook.js');
const Records = require('../public/assets/records-logic.js');

const fixture = JSON.parse(readFileSync(new URL('../docs/prove-it/fixtures/older-night-from-main.json', import.meta.url), 'utf8'));

test('older-night fixture was built by main backup.js and still names Rook', () => {
  assert.equal(fixture.version, 2);
  assert.ok(fixture.source?.mainSha);
  assert.deepEqual(fixture.source.mainBackupKnownGames, [
    'Five Crowns', 'Wizard', '818', 'Flip 7 Vengeance', 'Beat the Heat', 'Rook'
  ]);
  assert.equal(fixture.history.filter((match) => match.game === 'Rook').length, 1);
  assert.equal(fixture.history.some((match) => match.game === 'Hand and Foot' || match.game === 'Canasta'), false);
  const rook = fixture.history.find((match) => match.game === 'Rook');
  assert.equal(rook.rounds[0].rookBid, 100);
  assert.equal(rook.rounds[0].rookBidder, 'Ada');
  assert.equal(rook.winners.join(' '), 'Cal Dee');
  assert.equal(rook.gameId, undefined);
  assert.ok(fixture.playerProfiles.Ada.avatar);
  assert.equal(fixture.currentGame.name, '818');
  assert.ok(fixture.history.some((match) => match.completed === false && match.game === 'Beat the Heat'));
});

test('RC1 merge keeps Rook identity and does not reinterpret it as Canasta', () => {
  const parsed = Backup.parseBackup(JSON.stringify(fixture));
  const {next, added} = Backup.mergeBackup({
    allPlayers: [],
    players: [],
    history: [],
    playerProfiles: {},
    currentGame: null
  }, parsed);
  assert.equal(added.games, 4);
  const rook = next.history.find((match) => match.game === 'Rook');
  assert.ok(rook, 'Rook night missing after merge');
  assert.equal(Games.displayName(rook.game), 'Rook');
  assert.equal(Games.displayName('Hand and Foot'), 'Canasta');
  assert.notEqual(Games.displayName(rook.game), 'Canasta');
  assert.equal(rook.rounds[0].rookBid, 100);
  assert.equal(Scorebook.isCompletedHistoryMatch(rook), true);
  const names = [...Scorebook.participantNames(rook)];
  assert.ok(names.includes('Ada'));
  assert.ok(names.includes('Cal'));
  assert.equal(next.playerProfiles.Fay.avatar, 'jasmine.png');
  assert.equal(next.currentGame.name, '818');
  assert.ok(next.history.some((match) => match.completed === false));
});

test('Records still treat the older Rook night as Rook, not a Canasta row', () => {
  const rook = fixture.history.find((match) => match.game === 'Rook');
  const helpers = {
    configs: Object.fromEntries(Records.GAMES.map((game) => [game.id, {winLow: game.winLow}])),
    getDisplayPlayers(match) {
      return (match.originalRoster || Object.keys(match.totals || {})).filter(Boolean);
    },
    sortPlayersByTotal(players, totals, cfg) {
      return [...players].sort((a, b) => {
        const diff = cfg.winLow ? (totals[a] || 0) - (totals[b] || 0) : (totals[b] || 0) - (totals[a] || 0);
        return diff || String(a).localeCompare(String(b));
      });
    },
    competitionPlaces: Scorebook.competitionPlaces,
    scorebook: Scorebook
  };
  const card = Records.nightCardModel(rook, helpers);
  assert.equal(card.game, 'Rook');
  assert.equal(card.gameTitle, 'Rook');
  assert.notEqual(card.gameTitle, 'Canasta');
  assert.equal(card.incomplete, false);
  assert.ok(card.winners.includes('Cal'));
  assert.equal(Records.gameTitle('Rook'), 'Rook');
});
