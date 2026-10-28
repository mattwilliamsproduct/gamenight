import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');
const Records = require('../public/assets/records-logic.js');

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

function twoWayTie() {
  return {
    id: 101,
    game: 'Five Crowns',
    name: 'Five Crowns',
    completed: true,
    winners: ['Megan', 'Matt'],
    originalRoster: ['Megan', 'Matt', 'Cat'],
    totals: {Megan: 40, Matt: 40, Cat: 80}
  };
}

function threeWayTie() {
  return {
    id: 102,
    game: 'Wizard',
    name: 'Wizard',
    completed: true,
    winners: ['Megan', 'Matt', 'Cat'],
    originalRoster: ['Megan', 'Matt', 'Cat', 'Mike'],
    totals: {Megan: 120, Matt: 120, Cat: 120, Mike: 60}
  };
}

function streakFrom(history, name) {
  let n = 0;
  for (const match of history) {
    if (!Scorebook.countsTowardCareer(match)) continue;
    if (Scorebook.playerWonMatch(match, name)) n += 1;
    else break;
  }
  return n;
}

function agreeEverywhere(match, names) {
  const winners = Scorebook.matchWinners(match);
  const standings = Records.nightStandings(match, helpers);
  const card = Records.nightCardModel(match, helpers);
  names.forEach((name) => {
    assert.equal(Scorebook.playerWonMatch(match, name), true, `${name} won`);
    assert.ok(winners.includes(name), `${name} on winner screen`);
    assert.equal(standings.find((row) => row.name === name)?.isWinner, true, `${name} records standing`);
    assert.ok(card.winners.includes(name), `${name} history card`);
  });
  return {winners, standings, card};
}

test('a 2-way tie is a win for every tied player', () => {
  const match = twoWayTie();
  const seen = agreeEverywhere(match, ['Megan', 'Matt']);
  assert.deepEqual(seen.winners.slice().sort(), ['Matt', 'Megan']);
  assert.equal(Scorebook.playerWonMatch(match, 'Cat'), false);
});

test('a 3-way tie is a win for every tied player', () => {
  const match = threeWayTie();
  const seen = agreeEverywhere(match, ['Megan', 'Matt', 'Cat']);
  assert.deepEqual(seen.winners.slice().sort(), ['Cat', 'Matt', 'Megan']);
  assert.equal(Scorebook.playerWonMatch(match, 'Mike'), false);
});

test('tied wins continue a streak for every tied player', () => {
  const history = [
    twoWayTie(),
    {
      id: 100,
      game: 'Five Crowns',
      name: 'Five Crowns',
      completed: true,
      winners: ['Megan', 'Matt'],
      originalRoster: ['Megan', 'Matt', 'Cat'],
      totals: {Megan: 22, Matt: 22, Cat: 50}
    },
    {
      id: 99,
      game: 'Five Crowns',
      name: 'Five Crowns',
      completed: true,
      winners: ['Megan'],
      originalRoster: ['Megan', 'Matt', 'Cat'],
      totals: {Megan: 10, Matt: 30, Cat: 40}
    }
  ];
  assert.equal(streakFrom(history, 'Megan'), 3);
  assert.equal(streakFrom(history, 'Matt'), 2);
  assert.equal(streakFrom(history, 'Cat'), 0);
});

test('empty stored winners still credit every leader, not only the first name', () => {
  const match = {
    id: 103,
    game: 'Five Crowns',
    name: 'Five Crowns',
    completed: true,
    winners: [],
    originalRoster: ['Megan', 'Matt', 'Cat'],
    totals: {Megan: 18, Matt: 18, Cat: 40}
  };
  assert.deepEqual(Scorebook.matchWinners(match).slice().sort(), ['Matt', 'Megan']);
  assert.equal(Scorebook.playerWonMatch(match, 'Megan'), true);
  assert.equal(Scorebook.playerWonMatch(match, 'Matt'), true);
  assert.equal(Scorebook.leadersOf(match).slice().sort().join(','), 'Matt,Megan');
});

test('winner screen, records, streaks, and history agree on a joint win', () => {
  const match = twoWayTie();
  const {winners, standings, card} = agreeEverywhere(match, ['Megan', 'Matt']);
  const standingWinners = standings.filter((row) => row.isWinner).map((row) => row.name).sort();
  assert.deepEqual(winners.slice().sort(), standingWinners);
  assert.deepEqual(card.winners.slice().sort(), standingWinners);
  assert.equal(streakFrom([match], 'Megan'), 1);
  assert.equal(streakFrom([match], 'Matt'), 1);
});
