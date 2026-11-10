import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');

function dealerIndex(round, offset, count) {
  return ((Number(round) || 1) - 1 + (Number(offset) || 0) + count) % count;
}

test('live standings match the scoreboard order and leave the dealer seated', () => {
  const roster = ['Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix', 'June', 'Marco'];
  const game = {
    name: 'Five Crowns',
    originalRoster: roster.slice(),
    currentRound: 10,
    maxRounds: 11,
    dealerOffset: 1,
    totals: {Nora: 40, Owen: 25, Priya: 55, Theo: 70, Ruby: 85, Felix: 100, June: 120, Marco: 150}
  };
  const dealer = dealerIndex(game.currentRound, game.dealerOffset, roster.length);
  const standing = Scorebook.scoreboardStandings(game, roster);
  assert.deepEqual(standing.ordered, ['Owen', 'Nora', 'Priya', 'Theo', 'Ruby', 'Felix', 'June', 'Marco']);
  assert.equal(standing.places.Owen, 1);
  assert.equal(standing.places.Marco, 8);
  assert.equal(roster[dealer], 'Priya');
  assert.deepEqual(game.originalRoster, roster);
  assert.equal(game.dealerOffset, 1);
  assert.deepEqual(roster, ['Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix', 'June', 'Marco']);
  assert.equal(dealerIndex(game.currentRound, game.dealerOffset, roster.length), dealer);
});

test('a tied score shares the scoreboard place and the next score is dense', () => {
  const roster = ['Nora', 'Owen', 'Priya'];
  const game = {
    name: 'Five Crowns',
    currentRound: 4,
    dealerOffset: 0,
    totals: {Nora: 25, Owen: 25, Priya: 40}
  };
  const standing = Scorebook.scoreboardStandings(game, roster.slice());
  assert.deepEqual(standing.ordered, ['Nora', 'Owen', 'Priya']);
  assert.deepEqual(standing.places, {Nora: 1, Owen: 1, Priya: 2});
  assert.deepEqual(roster, ['Nora', 'Owen', 'Priya']);
  assert.equal(game.dealerOffset, 0);
});

test('round 1 stays in seat order with no places', () => {
  const roster = ['Owen', 'Nora'];
  const game = {name: 'Five Crowns', currentRound: 1, totals: {Owen: 0, Nora: 0}, dealerOffset: 0};
  const standing = Scorebook.scoreboardStandings(game, roster);
  assert.equal(standing.ranked, false);
  assert.equal(standing.places, null);
  assert.deepEqual(standing.ordered, ['Owen', 'Nora']);
});

test('Home standings call the shared function and do not write seats or the dealer', async () => {
  const js = await readFile(new URL('../public/assets/slice2.js', import.meta.url), 'utf8');
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const rows = js.slice(js.indexOf('function standingRows'), js.indexOf('function leaderBit'));
  assert.match(rows, /BPGScorebook\.scoreboardStandings\(game, roster\)/);
  assert.doesNotMatch(rows, /dealerOffset\s*=/);
  assert.doesNotMatch(rows, /originalRoster\s*=/);
  assert.doesNotMatch(rows, /\.players\s*=/);
  assert.match(js, /Current standings/);
  assert.match(js, /will be saved as unfinished\. You can resume it later\./);
  assert.match(index, /BPGScorebook\.scoreboardStandings\(currentGame, gamePlayers\)/);
});
