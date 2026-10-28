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

function finishedNight() {
  return {
    id: 201,
    game: 'Five Crowns',
    name: 'Five Crowns',
    completed: true,
    gameOver: true,
    winners: ['Megan'],
    originalRoster: ['Megan', 'Matt', 'Cat'],
    totals: {Megan: 12, Matt: 28, Cat: 40},
    currentRound: 12,
    maxRounds: 11
  };
}

function reopen(match) {
  const next = JSON.parse(JSON.stringify(match));
  next.currentRound = 8;
  const result = Scorebook.refreshStanding(next, {over: true, completed: true});
  return {next, result};
}

test('a reopened incomplete night does not count toward wins or streaks', () => {
  const {next, result} = reopen(finishedNight());
  assert.equal(result.reopened, true);
  assert.equal(next.completed, false);
  assert.deepEqual(next.winners, []);
  assert.equal(Scorebook.countsTowardCareer(next), false);
  assert.equal(Scorebook.isCompletedHistoryMatch(next), false);
  assert.deepEqual(Scorebook.matchWinners(next), []);
  assert.equal(Scorebook.playerWonMatch(next, 'Megan'), false);
  assert.equal(Scorebook.playerWonMatch(next, 'Matt'), false);

  const standings = Records.nightStandings(next, helpers);
  assert.ok(standings.every((row) => row.isWinner === false));
  const card = Records.nightCardModel(next, helpers);
  assert.equal(card.incomplete, true);
  assert.deepEqual(card.winners, []);

  const history = [next, finishedNight()];
  assert.equal(Scorebook.playerWonMatch(history[0], 'Megan'), false);
  assert.equal(Scorebook.playerWonMatch(history[1], 'Megan'), true);
  let streak = 0;
  for (const match of history) {
    if (!Scorebook.countsTowardCareer(match)) continue;
    if (Scorebook.playerWonMatch(match, 'Megan')) streak += 1;
    else break;
  }
  assert.equal(streak, 1, 'reopened night is skipped; prior finished win still counts once');
});

test('the same night counts normally once it is completed again', () => {
  const {next} = reopen(finishedNight());
  next.totals = {Megan: 10, Matt: 10, Cat: 44};
  next.currentRound = 12;
  const finished = Scorebook.refreshStanding(next, {over: false, completed: false});
  assert.equal(finished.over, true);
  assert.equal(next.completed, true);
  assert.deepEqual(Scorebook.matchWinners(next).slice().sort(), ['Matt', 'Megan']);
  assert.equal(Scorebook.countsTowardCareer(next), true);
  assert.equal(Scorebook.playerWonMatch(next, 'Megan'), true);
  assert.equal(Scorebook.playerWonMatch(next, 'Matt'), true);
  assert.equal(Scorebook.playerWonMatch(next, 'Cat'), false);

  const standings = Records.nightStandings(next, helpers);
  assert.equal(standings.find((row) => row.name === 'Megan')?.isWinner, true);
  assert.equal(standings.find((row) => row.name === 'Matt')?.isWinner, true);
  const card = Records.nightCardModel(next, helpers);
  assert.equal(card.incomplete, false);
  assert.deepEqual(card.winners.slice().sort(), ['Matt', 'Megan']);
});

test('leftover winners on an incomplete night still do not count', () => {
  const leftover = {
    id: 202,
    game: 'Wizard',
    name: 'Wizard',
    completed: false,
    gameOver: false,
    winners: ['Megan', 'Matt'],
    originalRoster: ['Megan', 'Matt', 'Cat'],
    totals: {Megan: 80, Matt: 80, Cat: 20}
  };
  assert.equal(Scorebook.countsTowardCareer(leftover), false);
  assert.deepEqual(Scorebook.matchWinners(leftover), []);
  assert.equal(Scorebook.playerWonMatch(leftover, 'Megan'), false);
  const card = Records.nightCardModel(leftover, helpers);
  assert.deepEqual(card.winners, []);
});
