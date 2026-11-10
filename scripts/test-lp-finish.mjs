import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');
const Life = require('../public/assets/life-preserver-logic.js');
const Records = require('../public/assets/records-logic.js');

const RULE = Scorebook.LIFE_PRESERVER_WIN_RULE;

function night(name, totals, amount, extra = {}) {
  const players = Object.keys(totals);
  return {
    id: extra.id || `${name}-lp`,
    name,
    game: name,
    ruleset: extra.legacy ? undefined : RULE,
    originalRoster: players,
    totals: { ...totals },
    completed: extra.completed !== false,
    gameOver: extra.completed !== false,
    currentRound: extra.currentRound || 6,
    maxRounds: extra.maxRounds,
    endScore: extra.endScore,
    rookConfig: extra.rookConfig,
    winners: extra.winners || ['Ada'],
    hailMaryUsed: amount == null ? [] : ['Ada'],
    retired: extra.retired || [],
    rounds: [
      { round: 1, scores: { ...totals } },
      ...(amount == null ? [] : [{ round: 0, hailMaryBonus: true, scores: { Ada: amount } }])
    ]
  };
}

test('the live wheel odds stay 80 percent help', () => {
  assert.deepEqual(Life.OUTCOME_TABLE, {
    smallHelp: 0.45,
    mediumHelp: 0.30,
    bigHelp: 0.05,
    noChange: 0.075,
    smallSetback: 0.125
  });
  assert.equal(Scorebook.STANDINGS_TIE_RANKING, 'competition');
  const odds = Life.liveWheelOdds();
  assert.equal(odds.help, 0.8);
  assert.match(odds.line, /About 80% help, 7\.5% no change, and 12\.5% setback/);
  const copy = Scorebook.lifePreserverWinConfirmCopy(odds.line);
  assert.match(copy, /If this spin helps, you can't win this match/);
  assert.match(copy, /Zero or a setback keeps you in it/);
  assert.match(copy, /About 80% help/);
});

test('helpful is the win direction, and only a helpful spin bars the win', () => {
  assert.equal(Scorebook.classifySpinOutcome({ name: 'Five Crowns' }, -8), 'helpful');
  assert.equal(Scorebook.classifySpinOutcome({ name: 'Five Crowns' }, 5), 'setback');
  assert.equal(Scorebook.classifySpinOutcome({ name: 'Wizard' }, 12), 'helpful');
  assert.equal(Scorebook.classifySpinOutcome({ name: 'Wizard' }, -4), 'setback');
  assert.equal(Scorebook.classifySpinOutcome({ name: 'Flip 7 Vengeance' }, 0), 'zero');

  const helpful = night('Five Crowns', { Ada: 10, Bea: 20, Cal: 30, Dee: 40 }, -8);
  const standing = Scorebook.matchStandings(helpful);
  assert.equal(helpful.lifePreserverOutcomes.Ada.outcome, 'helpful');
  assert.equal(helpful.lifePreserverOutcomes.Ada.amount, -8);
  assert.equal(helpful.eligibleToWin.Ada, false);
  assert.deepEqual(standing.champion, ['Bea']);
  assert.deepEqual(standing.ordered, ['Bea', 'Ada', 'Cal', 'Dee']);
  assert.equal(standing.rows.find((row) => row.player === 'Ada').lpCap, Scorebook.LP_FINISH_CAP);
  assert.equal(standing.rows.find((row) => row.player === 'Ada').lpWhy, Scorebook.LP_FINISH_WHY);
  assert.equal(standing.rows.find((row) => row.player === 'Ada').score, 10);

  const zero = night('Wizard', { Ada: 100, Bea: 80, Cal: 60, Dee: 40 }, 0);
  assert.deepEqual(Scorebook.matchStandings(zero).champion, ['Ada']);
  assert.equal(zero.eligibleToWin.Ada, true);
  assert.equal(zero.lifePreserverOutcomes.Ada.outcome, 'zero');

  const setback = night('Five Crowns', { Ada: 10, Bea: 20, Cal: 30, Dee: 40 }, 6);
  assert.equal(setback && Scorebook.matchStandings(setback).champion[0], 'Ada');
  assert.equal(setback.eligibleToWin.Ada, true);
  assert.equal(setback.lifePreserverOutcomes.Ada.outcome, 'setback');
});

test('a tie for the eligible lead places the next player 3rd', () => {
  const game = night('Five Crowns', { Ada: 8, Bea: 20, Cal: 20, Dee: 40 }, -5);
  const standing = Scorebook.matchStandings(game);
  assert.deepEqual(standing.places, { Bea: 1, Cal: 1, Ada: 3, Dee: 4 });
  assert.deepEqual(standing.champion, ['Bea', 'Cal']);
});

test('undoing or correcting the spin restores eligibility, and later scores do not', () => {
  const game = night('Five Crowns', { Ada: 10, Bea: 20, Cal: 30, Dee: 40 }, -8);
  Scorebook.matchStandings(game);
  game.rounds[0].scores.Ada = 4;
  game.totals.Ada = 4;
  Scorebook.syncLifePreserverEligibility(game);
  assert.equal(game.eligibleToWin.Ada, false);
  assert.deepEqual(Scorebook.matchStandings(game).champion, ['Bea']);

  game.rounds[1].scores.Ada = 0;
  Scorebook.syncLifePreserverEligibility(game);
  assert.equal(game.lifePreserverOutcomes.Ada.outcome, 'zero');
  assert.equal(game.eligibleToWin.Ada, true);
  assert.deepEqual(Scorebook.matchStandings(game).champion, ['Ada']);

  game.rounds[1].scores.Ada = -8;
  Scorebook.syncLifePreserverEligibility(game);
  assert.equal(game.eligibleToWin.Ada, false);
  game.rounds.pop();
  game.hailMaryUsed = [];
  Scorebook.syncLifePreserverEligibility(game);
  assert.equal(Object.hasOwn(game.eligibleToWin, 'Ada'), false);
  assert.equal(Scorebook.playerEligibleToWin(game, 'Ada'), true);
  assert.deepEqual(Scorebook.matchStandings(game).champion, ['Ada']);
});

test('a legacy night keeps the old winner even after a helpful spin', () => {
  const game = night('Five Crowns', { Ada: 10, Bea: 20, Cal: 30, Dee: 40 }, -8, { legacy: true, winners: ['Ada'] });
  const standing = Scorebook.matchStandings(game);
  assert.equal(Scorebook.lifePreserverWinRuleActive(game), false);
  assert.deepEqual(standing.champion, ['Ada']);
  assert.equal(game.eligibleToWin, undefined);
  assert.equal(standing.rows.find((row) => row.player === 'Ada').lpCap, '');
});

test('no eligible player means there is no champion', () => {
  const game = night('Wizard', { Ada: 90, Bea: 80, Cal: 70, Dee: 60 }, 10);
  game.rounds.push({ round: 0, hailMaryBonus: true, scores: { Bea: 8, Cal: 8, Dee: 8 } });
  const standing = Scorebook.matchStandings(game);
  assert.equal(standing.noChampion, true);
  assert.deepEqual(standing.champion, []);
  assert.equal(standing.places.Ada, 1);
  assert.equal(standing.places.Bea, 2);
});

test('a threshold crossed by an ineligible player still ends, and the best eligible player wins', () => {
  const heat = night('Beat the Heat', { Ada: 8, Bea: 20, Cal: 70, Dee: 40 }, -4, {
    maxRounds: 999,
    endScore: 66,
    currentRound: 3
  });
  assert.equal(Scorebook.standingOver(heat), true);
  assert.deepEqual(Scorebook.matchStandings(heat).champion, ['Bea']);
  assert.equal(Scorebook.matchStandings(heat).ordered[1], 'Ada');

  const rook = night('Rook', { Ada: 320, Bea: 280, Cal: 140, Dee: 90 }, 20, {
    maxRounds: 999,
    currentRound: 4,
    rookConfig: { winTarget: 300 }
  });
  assert.equal(Scorebook.standingOver(rook), true);
  assert.deepEqual(Scorebook.matchStandings(rook).champion, ['Bea']);

  const crowns = night('Five Crowns', { Ada: 10, Bea: 22, Cal: 30, Dee: 41 }, -6, {
    maxRounds: 11,
    currentRound: 12
  });
  assert.equal(Scorebook.standingOver(crowns), true);
  assert.deepEqual(Scorebook.matchStandings(crowns).champion, ['Bea']);

  const wizard = night('Wizard', { Ada: 400, Bea: 260, Cal: 180, Dee: 120 }, 30, {
    maxRounds: 15,
    currentRound: 16
  });
  assert.equal(Scorebook.standingOver(wizard), true);
  assert.deepEqual(Scorebook.matchStandings(wizard).champion, ['Bea']);

  const eight = night('818', { Ada: 90, Bea: 70, Cal: 40, Dee: 20 }, 10, {
    maxRounds: 15,
    currentRound: 16
  });
  assert.equal(Scorebook.standingOver(eight), true);
  assert.deepEqual(Scorebook.matchStandings(eight).champion, ['Bea']);

  const canasta = night('Hand and Foot', { Ada: 8000, Bea: 6400, Cal: 2100, Dee: 900 }, 500, {
    maxRounds: 4,
    currentRound: 5
  });
  assert.equal(Scorebook.standingOver(canasta), true);
  assert.deepEqual(Scorebook.matchStandings(canasta).champion, ['Bea']);

  const flip = night('Flip 7 Vengeance', { Ada: 210, Bea: 160, Cal: 90, Dee: 40 }, 25, {
    maxRounds: 999,
    currentRound: 6
  });
  assert.equal(Scorebook.standingOver(flip), false);
  assert.deepEqual(Scorebook.matchStandings(flip).champion, ['Bea']);
});

test('history, passports, and the stored winner agree, including a reload', () => {
  const game = night('Five Crowns', { Ada: 10, Bea: 20, Cal: 30, Dee: 40 }, -8, {
    id: 'crowns-lp',
    maxRounds: 11,
    currentRound: 12
  });
  const before = Scorebook.refreshStanding(game, { over: true, completed: true });
  assert.deepEqual(before.winners, ['Bea']);
  assert.deepEqual(game.winners, ['Bea']);
  const saved = JSON.parse(JSON.stringify(game));
  assert.equal(saved.ruleset, RULE);
  assert.equal(saved.eligibleToWin.Ada, false);
  assert.deepEqual(Scorebook.matchStandings(saved).champion, ['Bea']);

  const stats = Records.playerCareerStats([saved], { scorebook: Scorebook });
  assert.equal(stats.byPlayer.Ada.wins, 0);
  assert.equal(stats.byPlayer.Bea.wins, 1);
  assert.equal(stats.byPlayer.Ada.games, 1);
  assert.equal(Records.eligibleWinners(saved, { scorebook: Scorebook }).join(), 'Bea');
  const card = Records.nightCardModel(saved, {
    configs: { 'Five Crowns': { winLow: true } },
    getDisplayPlayers: (match) => match.originalRoster,
    sortPlayersByTotal: (players, totals) => players,
    competitionPlaces: Scorebook.competitionPlaces,
    scorebook: Scorebook
  });
  assert.equal(card.winnerText, 'Bea won');
  assert.match(card.standings.find((row) => row.name === 'Ada').lpCap, /Best finish: 2nd/);
  assert.equal(Scorebook.isAssistedMatch(saved), true);
});

test('a zero spin still assists the night and still leaves the player eligible', () => {
  const game = night('Wizard', { Ada: 40, Bea: 90, Cal: 70, Dee: 20 }, 0);
  Scorebook.syncAssistedMatch(game);
  Scorebook.matchStandings(game);
  assert.equal(game.assistedMatch, true);
  assert.equal(game.eligibleToWin.Ada, true);
  assert.deepEqual(Scorebook.matchStandings(game).champion, ['Bea']);
});

test('the page uses the shared standings and the pre-spin confirm', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(page, /ruleset:window\.BPGScorebook\?BPGScorebook\.LIFE_PRESERVER_WIN_RULE:'best-finish-2nd'/);
  assert.match(page, /const standing=BPGScorebook\.matchStandings\(currentGame\)/);
  assert.match(page, /id="lp-win-confirm"/);
  assert.match(page, /lifePreserverWinConfirmCopy/);
  assert.match(page, /if\(lifePreserverTradeApplies\(\)&&!_lpWinTradeAccepted\)/);
  assert.match(page, /releaseRemovedLifePreservers\(currentGame\.hailMaryUsed, removedRounds\)/);
});

function undoLastScoringRound(game) {
  let lastIdx = -1;
  for (let i = game.rounds.length - 1; i >= 0; i -= 1) {
    if (!game.rounds[i].hailMaryBonus) { lastIdx = i; break; }
  }
  const removed = game.rounds.slice(lastIdx);
  game.rounds = game.rounds.slice(0, lastIdx);
  game.currentRound = game.rounds[lastIdx] ? game.rounds[lastIdx].round : (game.rounds.length + 1);
  game.hailMaryUsed = Life.releaseRemovedLifePreservers(game.hailMaryUsed, removed);
  Scorebook.recomputeTotals(game);
  Scorebook.syncAssistedMatch(game);
  return removed;
}

test('undo removes the whole adjustment and restores eligibility without a reroll', () => {
  const game = {
    name: 'Five Crowns',
    ruleset: RULE,
    originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
    currentRound: 3,
    rounds: [
      { round: 1, scores: { Ada: 20, Bea: 30, Cal: 40, Dee: 50 } },
      { round: 2, scores: { Ada: 18, Bea: 12, Cal: 16, Dee: 22 } }
    ],
    totals: {},
    hailMaryUsed: [],
    retired: []
  };
  Scorebook.recomputeTotals(game);
  const base = game.totals.Ada;
  Scorebook.recordLifePreserverSpin(game, 'Ada', -8);
  Scorebook.matchStandings(game);
  assert.equal(game.totals.Ada, base - 8);
  assert.equal(game.eligibleToWin.Ada, false);
  assert.deepEqual(game.hailMaryUsed, ['Ada']);

  undoLastScoringRound(game);
  const standing = Scorebook.matchStandings(game);
  assert.equal(game.totals.Ada, 20);
  assert.equal((game.rounds || []).some(round => round && round.hailMaryBonus), false);
  assert.equal(game.eligibleToWin.Ada, undefined);
  assert.equal(standing.rows.find(row => row.player === 'Ada').eligibleToWin, true);
  assert.deepEqual(game.hailMaryUsed, ['Ada']);
  assert.equal(game.assistedMatch, true);

  const sameRound = Scorebook.recordLifePreserverSpin(game, 'Ada', -8);
  assert.equal(sameRound, game);
  assert.equal((game.rounds || []).some(round => round && round.hailMaryBonus), false);
  assert.equal(game.totals.Ada, 20);

  game.currentRound = 4;
  game.rounds.push({ round: 3, scores: { Ada: 10, Bea: 14, Cal: 18, Dee: 20 } });
  Scorebook.recomputeTotals(game);
  const later = Scorebook.recordLifePreserverSpin(game, 'Ada', -8);
  assert.equal(later.totals.Ada, 30);
  assert.equal((later.rounds || []).some(round => round && round.hailMaryBonus), false);

  const reloaded = JSON.parse(JSON.stringify(later));
  Scorebook.recordLifePreserverSpin(reloaded, 'Ada', -12);
  assert.equal((reloaded.rounds || []).some(round => round && round.hailMaryBonus), false);
  assert.deepEqual(reloaded.hailMaryUsed, ['Ada']);
  assert.equal(Scorebook.matchStandings(reloaded).rows.find(row => row.player === 'Ada').eligibleToWin, true);
});

test('a correction that keeps a helpful adjustment leaves the player ineligible', () => {
  const game = night('Five Crowns', { Ada: 10, Bea: 20, Cal: 30, Dee: 40 }, -8);
  const bonus = game.rounds.find(round => round.hailMaryBonus);
  bonus.scores.Ada = -3;
  Scorebook.recomputeTotals(game);
  const standing = Scorebook.matchStandings(game);
  assert.equal(game.totals.Ada, 7);
  assert.equal(game.eligibleToWin.Ada, false);
  assert.equal(standing.rows.find(row => row.player === 'Ada').eligibleToWin, false);
  assert.deepEqual(standing.champion, ['Bea']);

  game.eligibleToWin.Ada = true;
  const again = Scorebook.matchStandings(game);
  assert.equal(game.eligibleToWin.Ada, false);
  assert.equal(again.rows.find(row => row.player === 'Ada').score, 7);
  assert.equal(again.rows.find(row => row.player === 'Ada').eligibleToWin, false);
});
