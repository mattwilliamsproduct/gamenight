import {eight18Score, eight18Tricks, wizardScore} from '../qa/fixture-rules.mjs';

const LOW_WINS = new Set(['Five Crowns', 'Beat the Heat']);

function totalsFromRounds(roster, rounds) {
  const totals = Object.fromEntries(roster.map((player) => [player, 0]));
  (rounds || []).forEach((round) => {
    Object.entries(round && round.scores || {}).forEach(([player, score]) => {
      totals[player] = (totals[player] || 0) + (Number(score) || 0);
    });
  });
  return totals;
}

function winnersFor(game, totals) {
  const values = Object.values(totals);
  if (!values.length) return [];
  const target = LOW_WINS.has(game) ? Math.min(...values) : Math.max(...values);
  return Object.keys(totals).filter((player) => totals[player] === target);
}

function finishedNight(id, game, date, roster, rounds, extra = {}) {
  const totals = extra.totals || totalsFromRounds(roster, rounds);
  const played = (rounds || []).filter((round) => round && !round.hailMaryBonus).length;
  return {
    id,
    game,
    date,
    totals,
    winners: extra.winners || winnersFor(game, totals),
    rounds,
    originalRoster: [...roster],
    currentRound: extra.currentRound || (played + 1),
    hailMaryUsed: extra.hailMaryUsed || [],
    retired: extra.retired || [],
    completed: extra.completed !== false,
    assistedMatch: !!extra.assistedMatch,
    endedEarly: extra.endedEarly === true,
    maxRounds: extra.maxRounds,
    dealerOffset: extra.dealerOffset || 0,
    ...extra
  };
}

function scoreRound(round, roster, values) {
  return {round, scores: Object.fromEntries(roster.map((player, index) => [player, values[index]]))};
}

function fiveCrownsFull() {
  const roster = ['Nora', 'Owen', 'Priya', 'Theo'];
  const rounds = [
    [0, 2, 5, 4],
    [3, 1, 4, 6],
    [2, 3, 6, 5],
    [1, 2, 3, 4],
    [4, 0, 5, 3],
    [2, 3, 4, 0],
    [1, 2, 3, 5],
    [2, 1, 4, 3],
    [0, 3, 2, 4],
    [2, 3, 0, 2],
    [2, 2, 4, 3]
  ].map((values, index) => scoreRound(index + 1, roster, values));
  return finishedNight(1786100000001, 'Five Crowns', '10/28/2026', roster, rounds, {maxRounds: 11, endedEarly: false});
}

function splitTricks(roster, tricks, winner) {
  const actuals = Object.fromEntries(roster.map((player) => [player, 0]));
  if (tricks <= 0) return actuals;
  const winnerTake = Math.min(tricks, Math.max(0, Math.floor(tricks / roster.length)));
  actuals[winner] = winnerTake;
  let left = tricks - winnerTake;
  const others = roster.filter((player) => player !== winner);
  others.forEach((player, index) => {
    if (index === others.length - 1) {
      actuals[player] = left;
      return;
    }
    const take = Math.min(left, Math.floor(left / (others.length - index)));
    actuals[player] = take;
    left -= take;
  });
  return actuals;
}

function wizardPlayable(roster, winner) {
  const count = Math.floor(60 / roster.length);
  return Array.from({length: count}, (_, index) => {
    const tricks = index + 1;
    const actuals = splitTricks(roster, tricks, winner);
    const bids = {};
    roster.forEach((player, playerIndex) => {
      const took = actuals[player];
      const winnerHit = player === winner && (tricks % 2 === 0 || tricks === 5);
      const tableNolie = tricks === 5;
      const otherHit = player !== winner && (tricks + playerIndex) % 3 === 0;
      if (tableNolie || winnerHit || otherHit) {
        bids[player] = took;
        return;
      }
      const miss = (tricks + playerIndex) % 2 === 0 ? 1 : -1;
      let bid = took + miss;
      if (bid < 0) bid = took + 1;
      if (bid > tricks) bid = Math.max(0, took - 1);
      if (bid === took) bid = took === 0 ? Math.min(1, tricks) : took - 1;
      bids[player] = bid;
    });
    const scores = Object.fromEntries(roster.map((player) => [player, wizardScore(bids[player], actuals[player])]));
    return {round: tricks, bids, actuals, scores};
  });
}

function wizardFullFour() {
  const roster = ['Owen', 'Nora', 'Priya', 'Theo'];
  return finishedNight(1786100000002, 'Wizard', '10/27/2026', roster, wizardPlayable(roster, 'Owen'), {maxRounds: 15, endedEarly: false});
}

function wizardFullBench() {
  const roster = ['June', 'Marco', 'Iris', 'Hugo'];
  return finishedNight(1786100000003, 'Wizard', '10/26/2026', roster, wizardPlayable(roster, 'June'), {maxRounds: 15, endedEarly: false});
}

function eight18Full() {
  const roster = ['Priya', 'Nora', 'Owen', 'Theo'];
  const rounds = [];
  for (let round = 1; round <= 15; round += 1) {
    const tricks = eight18Tricks(round);
    const dealer = roster[(round - 1) % roster.length];
    const bids = {};
    const actuals = {};
    const scores = {};
    roster.forEach((player) => {
      bids[player] = 0;
      actuals[player] = 0;
    });
    actuals.Priya = tricks;
    if (dealer === 'Priya') {
      bids.Priya = 0;
    } else {
      bids.Priya = tricks;
      bids[dealer] = 1;
    }
    roster.forEach((player) => {
      scores[player] = eight18Score(bids[player], actuals[player]);
    });
    rounds.push({round, bids, actuals, scores});
  }
  return finishedNight(1786100000004, '818', '10/25/2026', roster, rounds, {maxRounds: 15, dealerOffset: 0, endedEarly: false});
}

function flip7Full() {
  const roster = ['Nora', 'Owen', 'Priya', 'Theo'];
  const rounds = [
    [42, 38, 20, 0],
    [40, 36, 18, 0],
    [38, 44, 22, 0],
    [45, 40, 16, 12],
    [45, 46, 12, 12]
  ].map((values, index) => scoreRound(index + 1, roster, values));
  return finishedNight(1786100000005, 'Flip 7 Vengeance', '10/24/2026', roster, rounds, {endedEarly: false});
}

function beatTheHeatFull() {
  const roster = ['Nora', 'Owen', 'Priya', 'Theo'];
  const rounds = [
    [6, 8, 11, 14],
    [5, 9, 10, 12],
    [7, 6, 8, 15],
    [4, 10, 9, 13],
    [8, 7, 12, 16]
  ].map((values, index) => scoreRound(index + 1, roster, values));
  return finishedNight(1786100000006, 'Beat the Heat', '10/23/2026', roster, rounds, {endScore: 66, endedEarly: false});
}

function interruptedFiveCrowns() {
  const roster = ['Nora', 'Owen', 'Priya', 'Theo'];
  const rounds = [
    scoreRound(1, roster, [3, 8, 5, 10]),
    scoreRound(2, roster, [4, 6, 9, 7])
  ];
  return finishedNight(1786100000007, 'Five Crowns', '10/29/2026', roster, rounds, {
    completed: false,
    winners: [],
    currentRound: 3,
    maxRounds: 11
  });
}

function assisted818Partial() {
  const roster = ['Nora', 'Owen', 'Priya', 'Theo'];
  const rounds = [
    {round: 1, bids: {Nora: 2, Owen: 1, Priya: 0, Theo: 2}, actuals: {Nora: 2, Owen: 1, Priya: 0, Theo: 5}, scores: {Nora: 12, Owen: 11, Priya: 10, Theo: 5}},
    {round: 2, bids: {Nora: 1, Owen: 2, Priya: 1, Theo: 0}, actuals: {Nora: 1, Owen: 2, Priya: 1, Theo: 3}, scores: {Nora: 11, Owen: 12, Priya: 11, Theo: 3}},
    {round: 0, hailMaryBonus: true, scores: {Theo: 15}}
  ];
  return finishedNight(1786100000008, '818', '10/30/2026', roster, rounds, {
    hailMaryUsed: ['Theo'],
    assistedMatch: true,
    maxRounds: 15,
    dealerOffset: 0
  });
}

export function buildDemoRecordNights() {
  return [
    fiveCrownsFull(),
    wizardFullFour(),
    wizardFullBench(),
    eight18Full(),
    flip7Full(),
    beatTheHeatFull(),
    interruptedFiveCrowns(),
    assisted818Partial()
  ];
}

export function attachDemoRecordNights(book) {
  const next = book && typeof book === 'object' ? book : {};
  const history = Array.isArray(next.history) ? next.history.slice() : [];
  buildDemoRecordNights().forEach((night) => {
    if (!history.some((row) => row && row.id === night.id)) history.push(night);
  });
  next.history = history;
  return next;
}

export function demoBookHasFullRecordNights(book) {
  const history = book && Array.isArray(book.history) ? book.history : [];
  return history.some((row) => row && row.id === 1786100000001)
    && history.some((row) => row && row.id === 1786100000002)
    && history.some((row) => row && row.completed === false && row.id === 1786100000007)
    && history.some((row) => row && row.assistedMatch === true && row.id === 1786100000008);
}
