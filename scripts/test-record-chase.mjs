import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  getRecordChaseHistoryForPlayer,
  getRecordChaseMetricFromMatches,
  getRecordChaseMetricsLegacy,
  getRecordChaseMetricsOnce,
  getRecordChasePlayerRounds,
  indexRecordChaseHistory
} from './record-chase-metrics.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = readFileSync(join(rootDir, 'public', 'index.html'), 'utf8');

const wizardCfg = { winLow: false };
const fiveCrownsCfg = { winLow: true };

function scoringRound(round, scores, extra = {}) {
  return { round, scores, ...extra };
}

function hailMaryRound(scores) {
  return { round: 0, hailMaryBonus: true, scores };
}

const history = [
  {
    id: 100,
    game: 'Wizard',
    totals: { Matt: 140, Cat: 100 },
    rounds: [
      scoringRound(1, { Matt: 50, Cat: 40 }),
      scoringRound(2, { Matt: 50, Cat: 60 }),
      hailMaryRound({ Matt: 40 })
    ]
  },
  {
    id: 200,
    game: 'Wizard',
    totals: { Matt: 80, Cat: 160 },
    rounds: [
      scoringRound(1, { Matt: 20, Cat: 40 }, { joinBonus: { Cat: true } }),
      scoringRound(2, { Matt: 30, Cat: 50 }, { joinBonus: { Cat: true } }),
      scoringRound(3, { Matt: 30, Cat: 70 })
    ]
  },
  {
    id: 300,
    game: '818',
    totals: { Matt: 200, Cat: 50 },
    rounds: [
      scoringRound(1, { Matt: 100, Cat: 25 }),
      scoringRound(2, { Matt: 100, Cat: 25 })
    ]
  },
  {
    id: 400,
    game: 'Wizard',
    totals: { Matt: 90 },
    rounds: [
      scoringRound(1, { Matt: 40 }),
      scoringRound(2, { Matt: 50 })
    ]
  },
  {
    id: 500,
    game: 'Wizard',
    totals: { Dee: 999 },
    rounds: [hailMaryRound({ Dee: 999 })]
  },
  {
    id: 600,
    game: 'Wizard',
    totals: { Dee: 50, Cat: 12 },
    rounds: [
      scoringRound(1, { Dee: 25, Cat: 12 }, { joinBonus: { Dee: true } }),
      scoringRound(2, { Dee: 25 }, { joinBonus: { Dee: true } })
    ]
  },
  {
    id: 700,
    game: 'Five Crowns',
    totals: { Matt: 55, Cat: 80 },
    rounds: [
      scoringRound(1, { Matt: 20, Cat: 40 }),
      scoringRound(2, { Matt: 35, Cat: 40 })
    ]
  },
  {
    id: 800,
    game: 'Five Crowns',
    totals: { Matt: 40, Cat: 40 },
    rounds: [
      scoringRound(1, { Matt: 20, Cat: 15 }),
      scoringRound(2, { Matt: 20, Cat: 25 })
    ]
  },
  {
    id: 801,
    game: 'Five Crowns',
    totals: { Matt: 40, Cat: 90 },
    rounds: [
      scoringRound(1, { Matt: 10, Cat: 45 }),
      scoringRound(2, { Matt: 30, Cat: 45 })
    ]
  }
];

const wizardPlayers = ['Matt', 'Cat', 'Dee', 'Brick'];

function countingHistory(list) {
  let walks = 0;
  const wrapped = {
    get length() { return list.length; },
    forEach(fn, thisArg) {
      walks += 1;
      return list.forEach(fn, thisArg);
    },
    filter(fn, thisArg) {
      walks += 1;
      return list.filter(fn, thisArg);
    },
    map(fn, thisArg) {
      walks += 1;
      return list.map(fn, thisArg);
    },
    reduce(fn, initial) {
      walks += 1;
      return list.reduce(fn, initial);
    },
    [Symbol.iterator]() {
      walks += 1;
      return list[Symbol.iterator]();
    }
  };
  return { wrapped, walks: () => walks };
}

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unclosed function ${name}`);
}

function compileIndexHelpers(historyList, currentGame) {
  const names = [
    'getRecordChasePlayerRounds',
    'matchQualifiesForRecordChase',
    'getRecordChaseHistory',
    'indexRecordChaseHistory',
    'pickRecordChaseFinal',
    'getRecordChaseMetric'
  ];
  const body = names.map(name => extractNamedFunction(indexHtml, name)).join('\n');
  return new Function(
    'history',
    'currentGame',
    `${body}\nreturn { getRecordChasePlayerRounds, matchQualifiesForRecordChase, getRecordChaseHistory, indexRecordChaseHistory, pickRecordChaseFinal, getRecordChaseMetric };`
  )(historyList, currentGame);
}

test('once-scan Player Pace matches the per-player history walk', () => {
  const legacy = getRecordChaseMetricsLegacy(history, wizardPlayers, 'Wizard', wizardCfg);
  const once = getRecordChaseMetricsOnce(history, wizardPlayers, 'Wizard', wizardCfg);
  assert.deepEqual(once, legacy);

  assert.deepEqual(once.Matt, {
    bestScore: 140,
    avgFinal: 103,
    worstScore: 80,
    bestMatchId: 100,
    worstMatchId: 200,
    ariaLabel: 'Best 140, average 103, worst 80'
  });
  assert.deepEqual(once.Cat, {
    bestScore: 160,
    avgFinal: 91,
    worstScore: 12,
    bestMatchId: 200,
    worstMatchId: 600,
    ariaLabel: 'Best 160, average 91, worst 12'
  });
  assert.deepEqual(once.Dee, {
    bestScore: null,
    avgFinal: null,
    worstScore: null,
    bestMatchId: null,
    worstMatchId: null,
    ariaLabel: 'No past games yet'
  });
  assert.deepEqual(once.Brick, once.Dee);
});

test('Life Preserver and joinBonus rounds stay out of Player Pace history', () => {
  assert.equal(getRecordChasePlayerRounds(history[0], 'Matt').length, 2);
  assert.equal(getRecordChasePlayerRounds(history[0], 'Matt').some(round => round.hailMaryBonus), false);
  assert.equal(getRecordChasePlayerRounds(history[1], 'Cat').length, 1);
  assert.equal(getRecordChasePlayerRounds(history[1], 'Cat')[0].round, 3);
  assert.deepEqual(getRecordChaseHistoryForPlayer(history, 'Dee', 'Wizard'), []);
  assert.equal(getRecordChaseHistoryForPlayer(history, 'Matt', 'Wizard').some(match => match.id === 300), false);
  assert.equal(getRecordChaseHistoryForPlayer(history, 'Cat', 'Wizard').some(match => match.id === 600), true);
});

test('winLow Best and Worst flip, and equal finals keep the newer match id', () => {
  const players = ['Matt', 'Cat'];
  const once = getRecordChaseMetricsOnce(history, players, 'Five Crowns', fiveCrownsCfg);
  const legacy = getRecordChaseMetricsLegacy(history, players, 'Five Crowns', fiveCrownsCfg);
  assert.deepEqual(once, legacy);
  assert.equal(once.Matt.bestScore, 40);
  assert.equal(once.Matt.bestMatchId, 801);
  assert.equal(once.Matt.worstScore, 55);
  assert.equal(once.Matt.worstMatchId, 700);
  assert.equal(once.Cat.bestScore, 40);
  assert.equal(once.Cat.bestMatchId, 800);
  assert.equal(once.Cat.worstScore, 90);
  assert.equal(once.Cat.worstMatchId, 801);
});

test('indexRecordChaseHistory walks the history list once', () => {
  const counted = countingHistory(history);
  const byPlayer = indexRecordChaseHistory(counted.wrapped, 'Wizard', wizardPlayers);
  assert.equal(counted.walks(), 1);
  assert.deepEqual(byPlayer.Matt.map(match => match.id), [100, 200, 400]);
  assert.deepEqual(byPlayer.Cat.map(match => match.id), [100, 200, 600]);
  assert.deepEqual(byPlayer.Dee, []);
  assert.deepEqual(byPlayer.Brick, []);
});

test('legacy per-player path walks history once per player', () => {
  const counted = countingHistory(history);
  wizardPlayers.forEach(player => {
    getRecordChaseMetricFromMatches(
      getRecordChaseHistoryForPlayer(counted.wrapped, player, 'Wizard'),
      player,
      wizardCfg
    );
  });
  assert.equal(counted.walks(), wizardPlayers.length);
});

test('index.html panel uses the once-scan helper and keeps the same filters', () => {
  const panel = extractNamedFunction(indexHtml, 'renderRecordChasePanel');
  assert.match(panel, /indexRecordChaseHistory\(history,currentGame\.name,players\)/);
  assert.doesNotMatch(panel, /getRecordChaseHistory\(/);
  assert.match(panel, /getRecordChaseMetric\(player,cfg,matchesByPlayer\[player\]\)/);

  const playerRounds = extractNamedFunction(indexHtml, 'getRecordChasePlayerRounds');
  assert.match(playerRounds, /!round\.hailMaryBonus/);
  assert.match(playerRounds, /!round\.joinBonus\?\.\[player\]/);
  assert.match(playerRounds, /round\.scores\[player\]!==undefined/);

  const helpers = compileIndexHelpers(history, { name: 'Wizard' });
  const matchesByPlayer = helpers.indexRecordChaseHistory(history, 'Wizard', wizardPlayers);
  const moduleOnce = getRecordChaseMetricsOnce(history, wizardPlayers, 'Wizard', wizardCfg);
  const pageOnce = Object.fromEntries(wizardPlayers.map(player => [
    player,
    helpers.getRecordChaseMetric(player, wizardCfg, matchesByPlayer[player])
  ]));
  const pageLegacy = Object.fromEntries(wizardPlayers.map(player => [
    player,
    helpers.getRecordChaseMetric(player, wizardCfg)
  ]));
  assert.deepEqual({ ...pageOnce }, { ...moduleOnce });
  assert.deepEqual({ ...pageLegacy }, { ...moduleOnce });
  assert.deepEqual(helpers.getRecordChasePlayerRounds(history[0], 'Matt'), getRecordChasePlayerRounds(history[0], 'Matt'));
  assert.deepEqual(helpers.getRecordChasePlayerRounds(history[1], 'Cat'), getRecordChasePlayerRounds(history[1], 'Cat'));
});
