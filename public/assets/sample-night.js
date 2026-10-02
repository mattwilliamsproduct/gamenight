(function (root) {
  'use strict';

  const PLAYERS = Object.freeze(['June', 'Theo', 'Rosa', 'Hank', 'Priya', 'Walt']);
  const COLORS = Object.freeze({ June: 2, Theo: 6, Rosa: 8, Hank: 4, Priya: 7, Walt: 5 });
  const STYLE = Object.freeze({
    June: { skill: 1.1, accuracy: 0.62 },
    Theo: { skill: 1.0, accuracy: 0.55 },
    Rosa: { skill: 1.25, accuracy: 0.6 },
    Hank: { skill: 0.9, accuracy: 0.5 },
    Priya: { skill: 1.05, accuracy: 0.66 },
    Walt: { skill: 0.8, accuracy: 0.44 }
  });
  const EIGHT18_TRICKS = Object.freeze([8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8]);
  const LOW_WINS = Object.freeze(['Five Crowns', 'Beat the Heat']);
  const DAY_MS = 86400000;
  const HOUR_MS = 3600000;

  // Newest first, the order the scorebook keeps. Seeds are picked so the wins spread
  // around the table the way a real porch's do (see scripts/test-sample-night.mjs).
  const SCHEDULE = Object.freeze([
    { daysAgo: 7, slot: 1, game: 'Beat the Heat', roster: ['June', 'Theo', 'Rosa', 'Hank', 'Priya'], seed: 11 },
    { daysAgo: 7, slot: 0, game: 'Wizard', roster: PLAYERS, seed: 1 },
    { daysAgo: 14, slot: 1, game: 'Flip 7 Vengeance', roster: PLAYERS, seed: 25 },
    { daysAgo: 14, slot: 0, game: 'Five Crowns', roster: PLAYERS, seed: 2 },
    { daysAgo: 21, slot: 1, game: 'Wizard', roster: PLAYERS, seed: 24 },
    { daysAgo: 21, slot: 0, game: '818', roster: ['Theo', 'Rosa', 'Hank', 'Priya', 'Walt'], seed: 61 },
    { daysAgo: 28, slot: 1, game: 'Beat the Heat', roster: PLAYERS, seed: 21 },
    { daysAgo: 28, slot: 0, game: 'Five Crowns', roster: ['June', 'Rosa', 'Hank', 'Priya', 'Walt'], seed: 4 },
    { daysAgo: 35, slot: 1, game: '818', roster: PLAYERS, seed: 10 },
    { daysAgo: 35, slot: 0, game: 'Wizard', roster: PLAYERS, seed: 3 }
  ]);

  // The live match: Wizard, six players, five hands in, bidding the sixth.
  // Walt is far enough back that the Life Preserver is on the table.
  const LIVE_WIZARD = Object.freeze([
    { bids: [1, 0, 0, 0, 1, 1], actuals: [1, 0, 0, 0, 0, 0] },
    { bids: [1, 1, 0, 0, 0, 1], actuals: [1, 1, 0, 0, 0, 0] },
    { bids: [1, 1, 1, 0, 1, 2], actuals: [0, 1, 1, 0, 1, 0] },
    { bids: [1, 1, 1, 1, 0, 1], actuals: [1, 2, 1, 0, 0, 0] },
    { bids: [1, 2, 1, 1, 1, 1], actuals: [1, 1, 1, 1, 1, 0] }
  ]);

  function createRandom(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wizardScore(bid, actual) {
    return bid === actual ? 20 + 10 * actual : -10 * Math.abs(bid - actual);
  }

  function eight18Score(bid, actual) {
    return actual + (bid === actual ? 10 : 0);
  }

  function maxRoundsFor(game, playerCount) {
    if (game === 'Wizard') return Math.floor(60 / Math.max(playerCount, 1));
    if (game === 'Five Crowns') return 11;
    if (game === '818') return EIGHT18_TRICKS.length;
    return 999;
  }

  function weightedPick(random, players, weightOf) {
    const weights = players.map(player => weightOf(player) * (0.35 + random()));
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    for (let i = 0; i < players.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return players[i];
    }
    return players[players.length - 1];
  }

  function dealTricks(random, players, tricks) {
    const actuals = Object.fromEntries(players.map(player => [player, 0]));
    for (let i = 0; i < tricks; i++) {
      actuals[weightedPick(random, players, player => STYLE[player].skill)] += 1;
    }
    return actuals;
  }

  function missedBid(random, actual, tricks) {
    const direction = actual === 0 ? 1 : actual === tricks ? -1 : (random() < 0.5 ? -1 : 1);
    const distance = random() < 0.8 ? 1 : 2;
    return clamp(actual + direction * distance, 0, tricks);
  }

  function bidTrickRound(random, game, players, roundNumber, tricks, dealerOffset) {
    const actuals = dealTricks(random, players, tricks);
    const bids = {};
    players.forEach(player => {
      bids[player] = random() < STYLE[player].accuracy ? actuals[player] : missedBid(random, actuals[player], tricks);
    });
    if (game === '818') {
      // 818 house law: the dealer may not bid the number that makes the table total equal the tricks.
      const dealer = players[(roundNumber - 1 + dealerOffset) % players.length];
      const bidSum = players.reduce((sum, player) => sum + bids[player], 0);
      if (bidSum === tricks) bids[dealer] = bids[dealer] > 0 ? bids[dealer] - 1 : bids[dealer] + 1;
    }
    const score = game === '818' ? eight18Score : wizardScore;
    const scores = Object.fromEntries(players.map(player => [player, score(bids[player], actuals[player])]));
    return { round: roundNumber, bids, actuals, scores };
  }

  function fiveCrownsRound(random, players, roundNumber) {
    const cards = roundNumber + 2;
    const goesOut = weightedPick(random, players, player => STYLE[player].skill * STYLE[player].skill);
    const scores = {};
    players.forEach(player => {
      if (player === goesOut || random() < 0.12) {
        scores[player] = 0;
        return;
      }
      const spread = cards * 3.4 / STYLE[player].skill;
      scores[player] = Math.max(1, Math.round(random() * random() * spread * 1.6));
    });
    return { round: roundNumber, scores };
  }

  function flipSevenRound(random, players, roundNumber) {
    const scores = {};
    players.forEach(player => {
      if (random() < 0.24) {
        scores[player] = 0;
        return;
      }
      const flipSeven = random() < 0.08 ? 15 : 0;
      scores[player] = Math.round(6 + random() * 34 * STYLE[player].skill) + flipSeven;
    });
    return { round: roundNumber, scores };
  }

  function beatTheHeatRound(random, players, roundNumber) {
    const scores = {};
    players.forEach(player => {
      scores[player] = random() < 0.15 ? 0 : Math.round(1 + random() * 13 / STYLE[player].skill);
    });
    return { round: roundNumber, scores };
  }

  function playRounds(random, game, players, dealerOffset) {
    const rounds = [];
    if (game === 'Wizard' || game === '818') {
      const count = maxRoundsFor(game, players.length);
      for (let r = 1; r <= count; r++) {
        const tricks = game === '818' ? EIGHT18_TRICKS[r - 1] : r;
        rounds.push(bidTrickRound(random, game, players, r, tricks, dealerOffset));
      }
    } else if (game === 'Five Crowns') {
      for (let r = 1; r <= 11; r++) rounds.push(fiveCrownsRound(random, players, r));
    } else if (game === 'Flip 7 Vengeance') {
      for (let r = 1; r <= 7; r++) rounds.push(flipSevenRound(random, players, r));
    } else if (game === 'Beat the Heat') {
      const heat = Object.fromEntries(players.map(player => [player, 0]));
      for (let r = 1; Math.max(...Object.values(heat)) < 66; r++) {
        const round = beatTheHeatRound(random, players, r);
        players.forEach(player => { heat[player] += round.scores[player]; });
        rounds.push(round);
      }
    }
    return rounds;
  }

  function totalsFor(players, rounds) {
    const totals = Object.fromEntries(players.map(player => [player, 0]));
    rounds.forEach(round => {
      Object.entries(round.scores).forEach(([player, score]) => { totals[player] += score; });
    });
    return totals;
  }

  function winnersFor(game, totals) {
    const values = Object.values(totals);
    const best = LOW_WINS.includes(game) ? Math.min(...values) : Math.max(...values);
    return Object.keys(totals).filter(player => totals[player] === best);
  }

  function auditFor(game, players, rounds, startedAt) {
    const log = [{ ts: startedAt, action: 'Match Started', detail: `${game} · ${players.length} players` }];
    rounds.forEach((round, index) => {
      log.push({ ts: startedAt + (index + 1) * 6 * 60000, action: `R${round.round} Submitted`, detail: `${game} round ${round.round}` });
    });
    return log;
  }

  function finishedMatch(entry, index, now) {
    const random = createRandom(20261002 + entry.seed * 7919);
    const players = [...entry.roster];
    const dealerOffset = index % players.length;
    const rounds = playRounds(random, entry.game, players, dealerOffset);
    const totals = totalsFor(players, rounds);
    const id = now - entry.daysAgo * DAY_MS - (2 - entry.slot) * HOUR_MS;
    const match = {
      id,
      game: entry.game,
      date: new Date(id).toLocaleDateString(),
      totals,
      winners: winnersFor(entry.game, totals),
      rounds,
      originalRoster: players,
      currentRound: rounds.length + 1,
      maxRounds: maxRoundsFor(entry.game, players.length),
      hailMaryUsed: [],
      lifePreserverHeld: [],
      lifePreserverHeldRound: null,
      retired: [],
      currentScoreDrafts: {},
      dealerOffset,
      auditLog: auditFor(entry.game, players, rounds, id - rounds.length * 6 * 60000)
    };
    if (entry.game === 'Wizard') {
      match.wizardPhase = 'bidding';
      match.currentBids = {};
    }
    if (entry.game === '818') {
      match.eight18Phase = 'bidding';
      match.currentBids = {};
    }
    return match;
  }

  function liveMatch(now) {
    const players = [...PLAYERS];
    const rounds = LIVE_WIZARD.map((row, index) => {
      const bids = {};
      const actuals = {};
      const scores = {};
      players.forEach((player, seat) => {
        bids[player] = row.bids[seat];
        actuals[player] = row.actuals[seat];
        scores[player] = wizardScore(row.bids[seat], row.actuals[seat]);
      });
      return { round: index + 1, bids, actuals, scores };
    });
    const startedAt = now - 32 * 60000;
    return {
      name: 'Wizard',
      originalRoster: players,
      currentRound: rounds.length + 1,
      maxRounds: maxRoundsFor('Wizard', players.length),
      rounds,
      totals: totalsFor(players, rounds),
      hailMaryUsed: [],
      lifePreserverHeld: [],
      lifePreserverHeldRound: rounds.length + 1,
      retired: [],
      currentScoreDrafts: {},
      dealerOffset: 1,
      wizardPhase: 'bidding',
      currentBids: {},
      auditLog: auditFor('Wizard', players, rounds, startedAt)
    };
  }

  function buildSampleNight(options) {
    const now = Number.isFinite(options && options.now) ? options.now : Date.now();
    return {
      allPlayers: [...PLAYERS],
      players: [...PLAYERS],
      playerProfiles: Object.fromEntries(PLAYERS.map(player => [player, { color: COLORS[player] }])),
      history: SCHEDULE.map((entry, index) => finishedMatch(entry, index, now)),
      currentGame: liveMatch(now)
    };
  }

  const api = {
    PLAYERS,
    EIGHT18_TRICKS,
    wizardScore,
    eight18Score,
    maxRoundsFor,
    buildSampleNight
  };

  root.BPGSampleNight = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
