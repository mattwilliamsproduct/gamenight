/**
 * Build a representative older backup by running main's backup.js.
 * Never reads or writes Redis / cardknight. Output is a local fixture only.
 */
import {createRequire} from 'node:module';
import {writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'docs/prove-it/fixtures');
const outFile = join(outDir, 'older-night-from-main.json');
const mainBackupPath = '/tmp/main-backup/backup.js';

mkdirSync('/tmp/main-backup', {recursive: true});
writeFileSync(mainBackupPath, execFileSync('git', ['show', 'origin/main:public/assets/backup.js'], {cwd: root}));

const require = createRequire(import.meta.url);
const MainBackup = require(mainBackupPath);

const PLAYERS = ['Ada', 'Bea', 'Cal', 'Dee', 'Eli', 'Fay'];
const ROOK = ['Ada', 'Bea', 'Cal', 'Dee'];

const rookNight = {
  id: 1700000001001,
  game: 'Rook',
  date: '3/14/2025',
  originalRoster: [...ROOK],
  currentRound: 3,
  rounds: [
    {
      round: 1,
      scores: {Ada: 120, Bea: 120, Cal: 80, Dee: 80},
      rookBid: 100,
      rookBidder: 'Ada',
      rookPartner: 'Bea',
      rookTrump: 'Red',
      rookCalledCard: '14 Green',
      rookBidderCounters: 120,
      rookOppCounters: 80,
      rookMadeIt: true
    },
    {
      round: 2,
      scores: {Ada: 70, Bea: 70, Cal: 130, Dee: 130},
      rookBid: 90,
      rookBidder: 'Cal',
      rookPartner: 'Dee',
      rookTrump: 'Green',
      rookCalledCard: '1 Red',
      rookBidderCounters: 130,
      rookOppCounters: 70,
      rookMadeIt: true
    }
  ],
  totals: {Ada: 190, Bea: 190, Cal: 210, Dee: 210},
  winners: ['Cal', 'Dee'],
  hailMaryUsed: [],
  retired: [],
  completed: true,
  rookConfig: {winTarget: 300, minBid: 70, totalCounters: 200}
};

const fiveCrownsNight = {
  id: 1700000001002,
  game: 'Five Crowns',
  date: '3/21/2025',
  originalRoster: PLAYERS,
  currentRound: 12,
  rounds: [
    {round: 1, scores: {Ada: 0, Bea: 8, Cal: 11, Dee: 14, Eli: 6, Fay: 19}},
    {round: 2, scores: {Ada: 7, Bea: 0, Cal: 9, Dee: 12, Eli: 15, Fay: 21}},
    {round: 3, scores: {Ada: 4, Bea: 6, Cal: 0, Dee: 10, Eli: 8, Fay: 17}},
    {round: 4, scores: {Ada: 5, Bea: 9, Cal: 7, Dee: 0, Eli: 13, Fay: 16}},
    {round: 5, scores: {Ada: 8, Bea: 3, Cal: 12, Dee: 6, Eli: 0, Fay: 22}},
    {round: 6, scores: {Ada: 2, Bea: 11, Cal: 5, Dee: 8, Eli: 9, Fay: 0}},
    {round: 7, scores: {Ada: 6, Bea: 4, Cal: 8, Dee: 15, Eli: 7, Fay: 18}},
    {round: 8, scores: {Ada: 0, Bea: 7, Cal: 10, Dee: 9, Eli: 12, Fay: 14}},
    {round: 9, scores: {Ada: 9, Bea: 5, Cal: 6, Dee: 11, Eli: 4, Fay: 20}},
    {round: 10, scores: {Ada: 3, Bea: 8, Cal: 0, Dee: 13, Eli: 10, Fay: 16}},
    {round: 11, scores: {Ada: 5, Bea: 2, Cal: 7, Dee: 4, Eli: 9, Fay: 12}}
  ],
  totals: {Ada: 49, Bea: 63, Cal: 75, Dee: 102, Eli: 93, Fay: 175},
  winners: ['Ada'],
  hailMaryUsed: [],
  retired: ['Fay'],
  completed: true
};

const wizardNight = {
  id: 1700000001003,
  game: 'Wizard',
  date: '3/28/2025',
  originalRoster: ['Ada', 'Bea', 'Cal', 'Dee', 'Eli'],
  currentRound: 11,
  rounds: [
    {round: 1, bids: {Ada: 0, Bea: 1, Cal: 0, Dee: 0, Eli: 0}, actuals: {Ada: 0, Bea: 1, Cal: 0, Dee: 0, Eli: 0}, scores: {Ada: 20, Bea: 30, Cal: 20, Dee: 20, Eli: 20}},
    {round: 2, bids: {Ada: 1, Bea: 0, Cal: 0, Dee: 1, Eli: 0}, actuals: {Ada: 1, Bea: 0, Cal: 0, Dee: 1, Eli: 0}, scores: {Ada: 30, Bea: 20, Cal: 20, Dee: 30, Eli: 20}},
    {round: 3, bids: {Ada: 0, Bea: 1, Cal: 1, Dee: 0, Eli: 1}, actuals: {Ada: 0, Bea: 1, Cal: 2, Dee: 0, Eli: 0}, scores: {Ada: 20, Bea: 30, Cal: -10, Dee: 20, Eli: -10}}
  ],
  totals: {Ada: 70, Bea: 80, Cal: 30, Dee: 70, Eli: 30},
  winners: ['Bea'],
  hailMaryUsed: [],
  retired: [],
  completed: true
};

const incompleteHeat = {
  id: 1700000001004,
  game: 'Beat the Heat',
  date: '4/4/2025',
  originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
  currentRound: 4,
  rounds: [
    {round: 1, scores: {Ada: 8, Bea: 5, Cal: 12, Dee: 3}},
    {round: 2, scores: {Ada: 11, Bea: 9, Cal: 6, Dee: 4}},
    {round: 3, scores: {Ada: 7, Bea: 14, Cal: 8, Dee: 2}}
  ],
  totals: {Ada: 26, Bea: 28, Cal: 26, Dee: 9},
  winners: [],
  hailMaryUsed: [],
  retired: [],
  completed: false
};

const live818 = {
  name: '818',
  originalRoster: ['Ada', 'Bea', 'Cal', 'Dee', 'Eli'],
  currentRound: 3,
  rounds: [
    {round: 1, bids: {Ada: 2, Bea: 1, Cal: 0, Dee: 2, Eli: 3}, actuals: {Ada: 2, Bea: 1, Cal: 0, Dee: 3, Eli: 2}, scores: {Ada: 12, Bea: 11, Cal: 0, Dee: 3, Eli: 2}},
    {round: 2, bids: {Ada: 1, Bea: 0, Cal: 2, Dee: 1, Eli: 2}, actuals: {Ada: 1, Bea: 0, Cal: 2, Dee: 0, Eli: 4}, scores: {Ada: 11, Bea: 0, Cal: 12, Dee: 0, Eli: 4}}
  ],
  totals: {Ada: 23, Bea: 11, Cal: 12, Dee: 3, Eli: 6},
  hailMaryUsed: ['Eli'],
  retired: [],
  currentBids: {},
  eight18Phase: 'bidding',
  dealerOffset: 0
};

const state = {
  allPlayers: PLAYERS,
  players: ['Ada', 'Bea', 'Cal', 'Dee', 'Eli'],
  history: [incompleteHeat, wizardNight, fiveCrownsNight, rookNight],
  playerProfiles: {
    Ada: {avatar: 'leia.png', color: 2},
    Bea: {avatar: 'belle.png', color: 6},
    Cal: {avatar: 'neo.png', color: 8},
    Dee: {avatar: 'mario.png', color: 4},
    Eli: {avatar: 'ironman.png', color: 7},
    Fay: {avatar: 'jasmine.png', color: 5}
  },
  currentGame: live818,
  prefs: {lineupIntro: true, statMontage: true, dealerRoll: false},
  uiScale: 16
};

const backup = MainBackup.buildBackup(state);
backup.source = {
  builtBy: 'scripts/build-older-night-from-main.mjs',
  mainSha: execFileSync('git', ['rev-parse', 'origin/main'], {cwd: root}).toString().trim(),
  mainBackupKnownGames: MainBackup.KNOWN_GAMES,
  note: 'Built with origin/main backup.js. No Redis. Rook identity must survive RC1 Canasta shelf.'
};

mkdirSync(outDir, {recursive: true});
writeFileSync(outFile, `${JSON.stringify(backup, null, 2)}\n`);
console.log(`wrote ${outFile}`);
console.log(`version=${backup.version} games=${backup.history.length} rook=${backup.history.filter((m) => m.game === 'Rook').length}`);
