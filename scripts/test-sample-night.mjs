import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Sample = require('../public/assets/sample-night.js');

const NOW = Date.UTC(2026, 9, 2, 23, 30);
const night = Sample.buildSampleNight({ now: NOW });
const LOW_WINS = ['Five Crowns', 'Beat the Heat'];

function sumRounds(match) {
  const totals = {};
  match.rounds.forEach(round => {
    Object.entries(round.scores).forEach(([player, score]) => {
      totals[player] = (totals[player] || 0) + score;
    });
  });
  return totals;
}

test('the same clock builds the same night', () => {
  assert.deepEqual(Sample.buildSampleNight({ now: NOW }), night);
});

test('everyone at the table has a profile and a ring color, and nobody borrows a character avatar', () => {
  assert.deepEqual(night.players, [...Sample.PLAYERS]);
  assert.deepEqual(night.allPlayers, [...Sample.PLAYERS]);
  night.players.forEach(player => {
    assert.ok(night.playerProfiles[player].color >= 1 && night.playerProfiles[player].color <= 8, player);
    assert.equal(night.playerProfiles[player].avatar, undefined, player);
  });
});

test('every finished match adds up, names the right winners, and has a unique id', () => {
  const ids = new Set();
  night.history.forEach(match => {
    assert.ok(!ids.has(match.id), `duplicate id ${match.id}`);
    ids.add(match.id);
    assert.deepEqual(match.totals, sumRounds(match), `${match.game} ${match.id} ROW-ADDS`);
    const values = Object.values(match.totals);
    const best = LOW_WINS.includes(match.game) ? Math.min(...values) : Math.max(...values);
    assert.deepEqual(match.winners, Object.keys(match.totals).filter(player => match.totals[player] === best));
    assert.deepEqual(Object.keys(match.totals).sort(), [...match.originalRoster].sort());
    assert.equal(match.currentRound, match.rounds.length + 1);
  });
  assert.equal(night.history.length, 10);
});

test('wins spread around the table and no two nights replay the same game', () => {
  const wins = Object.fromEntries(Sample.PLAYERS.map(player => [player, 0]));
  night.history.forEach(match => {
    assert.equal(match.winners.length, 1, `${match.game} ${match.id} has one winner`);
    wins[match.winners[0]] += 1;
  });
  Sample.PLAYERS.forEach(player => {
    assert.ok(wins[player] >= 1 && wins[player] <= 3, `${player} won ${wins[player]}`);
  });
  const fingerprints = night.history.map(match => `${match.game}:${JSON.stringify(match.totals)}`);
  assert.equal(new Set(fingerprints).size, fingerprints.length);
});

test('history is newest first and spans five weeks of porch nights', () => {
  for (let i = 1; i < night.history.length; i++) {
    assert.ok(night.history[i - 1].id > night.history[i].id);
  }
  assert.ok(night.history.every(match => match.id < NOW));
  assert.deepEqual(
    [...new Set(night.history.map(match => match.game))].sort(),
    ['818', 'Beat the Heat', 'Five Crowns', 'Flip 7 Vengeance', 'Wizard']
  );
});

test('Wizard and 818 rounds deal every trick and score by the formula', () => {
  night.history.filter(match => match.game === 'Wizard' || match.game === '818').forEach(match => {
    assert.equal(match.rounds.length, Sample.maxRoundsFor(match.game, match.originalRoster.length));
    match.rounds.forEach(round => {
      const tricks = match.game === '818' ? Sample.EIGHT18_TRICKS[round.round - 1] : round.round;
      const dealt = match.originalRoster.reduce((sum, player) => sum + round.actuals[player], 0);
      assert.equal(dealt, tricks, `${match.game} R${round.round} deals ${tricks}`);
      match.originalRoster.forEach(player => {
        const bid = round.bids[player];
        const actual = round.actuals[player];
        assert.ok(bid >= 0 && bid <= tricks, `${player} bid ${bid} of ${tricks}`);
        const expected = match.game === '818' ? Sample.eight18Score(bid, actual) : Sample.wizardScore(bid, actual);
        assert.equal(round.scores[player], expected, `${match.game} R${round.round} ${player}`);
      });
    });
  });
});

test('818 dealers never bid the table onto the trick count', () => {
  night.history.filter(match => match.game === '818').forEach(match => {
    match.rounds.forEach(round => {
      const bidSum = match.originalRoster.reduce((sum, player) => sum + round.bids[player], 0);
      assert.notEqual(bidSum, Sample.EIGHT18_TRICKS[round.round - 1], `818 R${round.round}`);
    });
  });
});

test('Five Crowns is eleven hands with someone going out each hand', () => {
  night.history.filter(match => match.game === 'Five Crowns').forEach(match => {
    assert.equal(match.rounds.length, 11);
    match.rounds.forEach(round => {
      assert.ok(Object.values(round.scores).some(score => score === 0), `hand ${round.round}`);
      assert.ok(Object.values(round.scores).every(score => Number.isInteger(score) && score >= 0));
    });
  });
});

test('Beat the Heat ends on the round someone reaches 66, not before', () => {
  night.history.filter(match => match.game === 'Beat the Heat').forEach(match => {
    assert.ok(Math.max(...Object.values(match.totals)) >= 66);
    const beforeLast = { rounds: match.rounds.slice(0, -1) };
    const earlier = Object.values(sumRounds(beforeLast));
    assert.ok(earlier.length === 0 || Math.max(...earlier) < 66);
  });
});

test('the live Five Crowns match is two hands in, adds up, and is ready for scores', () => {
  const live = night.currentGame;
  assert.equal(live.name, 'Five Crowns');
  assert.equal(live.maxRounds, 11);
  assert.equal(live.currentRound, 3);
  assert.equal(live.wizardPhase, undefined);
  assert.deepEqual(live.totals, sumRounds(live));
  assert.deepEqual(live.totals, { June: 5, Theo: 14, Rosa: 24, Hank: 30, Priya: 29, Walt: 50 });
  live.rounds.forEach(round => {
    assert.ok(Object.values(round.scores).some(score => score === 0), `hand ${round.round} has a go-out`);
    live.originalRoster.forEach(player => {
      assert.ok(Number.isInteger(round.scores[player]) && round.scores[player] >= 0);
    });
  });
  assert.equal(new Set(Object.values(live.totals)).size, live.originalRoster.length, 'no tied places on the sample card');
});

test('the live table has a clear last-place trail without changing Life Preserver odds', () => {
  const live = night.currentGame;
  assert.ok(live.totals.Walt > live.totals.Hank, 'Walt is last so a later LP story still has a hole');
  assert.ok(live.totals.June < live.totals.Theo, 'June is ahead after two go-outs');
});
