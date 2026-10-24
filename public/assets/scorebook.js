(function (root) {
  'use strict';

  function placeScore(totals, player) {
    const n = Number(totals ? totals[player] : undefined);
    return Number.isFinite(n) ? n : 0;
  }

  function competitionPlaces(sortedPlayers, totals) {
    const place = {};
    const list = Array.isArray(sortedPlayers) ? sortedPlayers : [];
    let cursor = 0;
    while (cursor < list.length) {
      const score = placeScore(totals, list[cursor]);
      let end = cursor + 1;
      while (end < list.length && placeScore(totals, list[end]) === score) end++;
      const rank = cursor + 1;
      for (let i = cursor; i < end; i++) place[list[i]] = rank;
      cursor = end;
    }
    return place;
  }

  function isScoringRound(round) {
    return !!(round && !round.hailMaryBonus);
  }

  function scoringRoundCount(rounds) {
    return (rounds || []).filter(isScoringRound).length;
  }

  function adjustmentFor(round, player) {
    if (!round || !round.scores || round.scores[player] === undefined) return 0;
    return Number(round.scores[player]) || 0;
  }

  function lifePreserverFollowing(rounds, scoringIndex, player) {
    const list = rounds || [];
    if (scoringIndex < 0 || scoringIndex >= list.length) return 0;
    let total = 0;
    for (let i = scoringIndex + 1; i < list.length; i++) {
      const round = list[i];
      if (!round || !round.hailMaryBonus) break;
      total += adjustmentFor(round, player);
    }
    return total;
  }

  function lifePreserverLeading(rounds, player) {
    let total = 0;
    for (const round of rounds || []) {
      if (!round) continue;
      if (!round.hailMaryBonus) break;
      total += adjustmentFor(round, player);
    }
    return total;
  }

  function lifePreserverHidden(rounds, visibleIndexes, player) {
    const visible = new Set(visibleIndexes || []);
    let total = lifePreserverLeading(rounds, player);
    (rounds || []).forEach((round, index) => {
      if (!isScoringRound(round) || visible.has(index)) return;
      total += lifePreserverFollowing(rounds, index, player);
    });
    return total;
  }

  function replaceName(list, oldName, newName) {
    if (!Array.isArray(list)) return list;
    const next = [];
    const seen = new Set();
    list.forEach(name => {
      const mapped = name === oldName ? newName : name;
      if (mapped == null || mapped === '' || seen.has(mapped)) return;
      seen.add(mapped);
      next.push(mapped);
    });
    return next;
  }

  function finiteNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function moveOrMergeField(map, oldName, newName, merge) {
    if (!map || oldName === newName || !Object.prototype.hasOwnProperty.call(map, oldName)) return;
    const incoming = map[oldName];
    const hasExisting = Object.prototype.hasOwnProperty.call(map, newName);
    const incomingNumber = finiteNumber(incoming);
    const existingNumber = hasExisting ? finiteNumber(map[newName]) : null;
    if (merge && hasExisting && incomingNumber != null && existingNumber != null) {
      map[newName] = existingNumber + incomingNumber;
    } else if (!hasExisting || !merge) {
      map[newName] = incoming;
    }
    delete map[oldName];
  }

  function applyPlayerNameOnGame(game, oldName, newName, merge) {
    if (!game || !oldName || !newName || oldName === newName) return game;
    const combining = !!merge;
    if (game.totals) moveOrMergeField(game.totals, oldName, newName, combining);
    if (Array.isArray(game.winners)) game.winners = replaceName(game.winners, oldName, newName);
    (game.rounds || []).forEach(round => {
      if (!round) return;
      ['scores', 'bids', 'actuals', 'joinBonus', 'comeback', 'handFootParts'].forEach(key => {
        moveOrMergeField(round[key], oldName, newName, combining);
      });
      if (round.rookBidder === oldName) round.rookBidder = newName;
      if (round.rookPartner === oldName) round.rookPartner = newName;
    });
    ['originalRoster', 'retired', 'hailMaryUsed', 'lifePreserverHeld'].forEach(key => {
      if (Array.isArray(game[key])) game[key] = replaceName(game[key], oldName, newName);
    });
    moveOrMergeField(game.currentBids, oldName, newName, combining);
    moveOrMergeField(game.currentScoreDrafts, oldName, newName, combining);
    if (game.rookHighBidder === oldName) game.rookHighBidder = newName;
    if (game.rookPartner === oldName) game.rookPartner = newName;
    return game;
  }

  function wizardRoundScore(bid, tricks) {
    const b = parseInt(bid, 10) || 0;
    const a = parseInt(tricks, 10) || 0;
    return b === a ? 20 + 10 * a : -10 * Math.abs(b - a);
  }

  function eight18RoundScore(bid, actual) {
    const b = parseInt(bid, 10) || 0;
    const a = parseInt(actual, 10) || 0;
    return a + (a === b ? 10 : 0);
  }

  function rookHandScores(hand) {
    const bidder = hand && hand.bidder;
    const partner = hand && hand.partner;
    const bid = Number(hand && hand.bid);
    const handTotal = Number(hand && hand.handTotal);
    let bidderTeamPoints = Number(hand && hand.bidderTeamPoints);
    const players = Array.isArray(hand && hand.players) ? hand.players : [];
    if (!Number.isFinite(bid) || !Number.isFinite(handTotal)) {
      return { scores: {}, made: false, otherTeamPoints: 0 };
    }
    if (!Number.isFinite(bidderTeamPoints)) bidderTeamPoints = 0;
    bidderTeamPoints = Math.max(0, Math.min(handTotal, bidderTeamPoints));
    const otherTeamPoints = handTotal - bidderTeamPoints;
    const made = bidderTeamPoints >= bid;
    const scores = {};
    players.forEach(player => {
      if (player === bidder || player === partner) scores[player] = made ? bidderTeamPoints : -bid;
      else scores[player] = otherTeamPoints;
    });
    return { scores, made, otherTeamPoints };
  }

  const api = {
    competitionPlaces,
    isScoringRound,
    scoringRoundCount,
    lifePreserverFollowing,
    lifePreserverLeading,
    lifePreserverHidden,
    applyPlayerNameOnGame,
    wizardRoundScore,
    eight18RoundScore,
    rookHandScores
  };

  root.BPGScorebook = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
