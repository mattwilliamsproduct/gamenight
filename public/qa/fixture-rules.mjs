const EIGHT18_TRICKS = [8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8];

export function eight18Tricks(round) {
  return EIGHT18_TRICKS[(Number(round) || 1) - 1] || 0;
}

export function eight18Score(bid, actual) {
  const b = Number(bid) || 0;
  const a = Number(actual) || 0;
  return a + (a === b ? 10 : 0);
}

export function wizardScore(bid, actual) {
  const b = Number(bid) || 0;
  const a = Number(actual) || 0;
  return a === b ? 20 + 10 * a : -10 * Math.abs(b - a);
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function sumMap(map, players) {
  return players.reduce((total, player) => total + (Number(map?.[player]) || 0), 0);
}

function eight18DealerIssue(game, round, players) {
  const bids = round?.bids || {};
  if (!players.every((player) => Number.isInteger(bids[player]))) return null;
  const offset = Number(game?.dealerOffset) || 0;
  const roundNumber = Number(round.round) || 1;
  const tricks = eight18Tricks(roundNumber);
  const dealer = players[((roundNumber - 1 + offset) % players.length + players.length) % players.length];
  const others = players.filter((player) => player !== dealer).reduce((sum, player) => sum + Number(bids[player]), 0);
  const forbidden = tricks - others;
  if (Number.isInteger(forbidden) && forbidden >= 0 && forbidden <= tricks && Number(bids[dealer]) === forbidden) {
    return `dealer ${dealer} cannot bid ${forbidden}`;
  }
  return null;
}

function problemsForBidTrickRound(gameName, round, players, tricks) {
  const issues = [];
  const bids = round.bids || {};
  const actuals = round.actuals || {};
  players.forEach((player) => {
    const bid = bids[player];
    const actual = actuals[player];
    if (!Number.isInteger(bid) || bid < 0 || bid > tricks) {
      issues.push(`${player} bid ${bid} is outside 0..${tricks}`);
    }
    if (!Number.isInteger(actual) || actual < 0 || actual > tricks) {
      issues.push(`${player} actual ${actual} is outside 0..${tricks}`);
    }
    const expected = gameName === '818' ? eight18Score(bid, actual) : wizardScore(bid, actual);
    if (finite(round.scores?.[player]) && Number(round.scores[player]) !== expected) {
      issues.push(`${player} score ${round.scores[player]} does not match ${expected}`);
    }
  });
  if (sumMap(actuals, players) !== tricks) {
    issues.push(`actuals sum ${sumMap(actuals, players)} !== ${tricks} tricks`);
  }
  return issues;
}

export function legalEight18Rounds(players, targetTotals, count, options = {}) {
  const remaining = Object.fromEntries(players.map((player) => [player, Number(targetTotals[player]) || 0]));
  const offset = Number(options.dealerOffset) || 0;
  return Array.from({ length: count }, (_, index) => {
    const tricks = eight18Tricks(index + 1);
    const round = index + 1;
    const dealer = players[((round - 1 + offset) % players.length + players.length) % players.length];
    const actuals = Object.fromEntries(players.map((player) => [player, 0]));
    const order = [...players].sort((a, b) => remaining[b] - remaining[a]);
    let left = tricks;
    for (const player of order) {
      if (left <= 0) break;
      const need = Math.max(0, remaining[player]);
      const take = Math.min(left, tricks, need >= 10 ? Math.min(tricks, Math.max(0, need - 10)) : Math.min(tricks, need));
      actuals[player] = take;
      left -= take;
    }
    if (left > 0) actuals[order[0]] += left;
    const bids = {};
    players.forEach((player) => {
      const actual = actuals[player];
      bids[player] = remaining[player] >= actual + 10 ? actual : (actual === 0 && tricks > 0 ? 1 : 0);
      if (bids[player] > tricks) bids[player] = tricks;
    });
    const others = players.filter((player) => player !== dealer).reduce((sum, player) => sum + bids[player], 0);
    const forbidden = tricks - others;
    if (Number.isInteger(forbidden) && forbidden >= 0 && forbidden <= tricks && bids[dealer] === forbidden) {
      bids[dealer] = forbidden === 0 ? Math.min(1, tricks) : 0;
    }
    const scores = {};
    players.forEach((player) => {
      scores[player] = eight18Score(bids[player], actuals[player]);
      remaining[player] -= scores[player];
    });
    return { round, bids, actuals, scores };
  });
}

export function validateGameFixture(game, label) {
  const issues = [];
  if (!game || typeof game !== 'object') return [`${label}: missing game`];
  const name = game.name || game.game;
  const players = game.originalRoster || Object.keys(game.totals || {});
  const rounds = Array.isArray(game.rounds) ? game.rounds : [];
  const totals = Object.fromEntries(players.map((player) => [player, 0]));
  rounds.forEach((round, index) => {
    const tag = `${label} R${round?.round ?? index}`;
    if (!round) {
      issues.push(`${tag}: empty round`);
      return;
    }
    if (round.hailMaryBonus) {
      Object.entries(round.scores || {}).forEach(([player, score]) => {
        totals[player] = (totals[player] || 0) + (Number(score) || 0);
      });
      return;
    }
    if (name === '818' || name === 'Wizard') {
      const tricks = name === '818' ? eight18Tricks(round.round) : Number(round.round) || 0;
      problemsForBidTrickRound(name, round, players, tricks).forEach((issue) => issues.push(`${tag}: ${issue}`));
      if (name === '818') {
        const dealerIssue = eight18DealerIssue(game, round, players);
        if (dealerIssue) issues.push(`${tag}: ${dealerIssue}`);
      }
    }
    if (name === 'Five Crowns' || name === 'Flip 7 Vengeance' || name === 'Beat the Heat') {
      players.forEach((player) => {
        if (!Object.prototype.hasOwnProperty.call(round.scores || {}, player)) return;
        const score = Number(round.scores[player]);
        if (!Number.isInteger(score) || score < 0) issues.push(`${tag}: ${player} score ${round.scores[player]} is not a 0+ integer`);
      });
    }
    Object.entries(round.scores || {}).forEach(([player, score]) => {
      totals[player] = (totals[player] || 0) + (Number(score) || 0);
    });
    Object.entries(round.comeback || {}).forEach(([player, extra]) => {
      totals[player] = (totals[player] || 0) + (Number(extra) || 0);
    });
  });
  players.forEach((player) => {
    if ((Number(game.totals?.[player]) || 0) !== (totals[player] || 0)) {
      issues.push(`${label}: ${player} total ${game.totals?.[player]} !== round sum ${totals[player] || 0}`);
    }
  });
  if (name === 'Beat the Heat' && rounds.some((round) => !round?.hailMaryBonus)) {
    const over = players.some((player) => (Number(game.totals?.[player]) || 0) >= 66);
    if (game.currentRound > 1 && over && (game.currentRound || 0) <= rounds.filter((round) => !round.hailMaryBonus).length) {
      issues.push(`${label}: Beat the Heat continued after a total reached 66`);
    }
  }
  return issues;
}

export function validateScenario(id, scenario) {
  const issues = [];
  const data = scenario?.data || {};
  if (data.currentGame) issues.push(...validateGameFixture(data.currentGame, `${id} live`));
  (data.history || []).forEach((match, index) => {
    issues.push(...validateGameFixture(match, `${id} history[${index}] ${match.game || ''}`));
  });
  return issues;
}
