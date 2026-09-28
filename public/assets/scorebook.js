(function (root) {
  'use strict';

  function competitionPlaces(sortedPlayers, totals) {
    const place = {};
    const list = Array.isArray(sortedPlayers) ? sortedPlayers : [];
    const scores = totals || {};
    let cursor = 0;
    while (cursor < list.length) {
      const score = scores[list[cursor]];
      let end = cursor + 1;
      while (end < list.length && scores[list[end]] === score) end++;
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

  function moveOrMergeField(map, oldName, newName, merge) {
    if (!map || oldName === newName || !Object.prototype.hasOwnProperty.call(map, oldName)) return;
    const incoming = map[oldName];
    const hasExisting = Object.prototype.hasOwnProperty.call(map, newName);
    if (merge && hasExisting && typeof incoming === 'number' && typeof map[newName] === 'number') {
      map[newName] += incoming;
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
      ['scores', 'bids', 'actuals', 'joinBonus', 'comeback'].forEach(key => {
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

  const api = {
    competitionPlaces,
    isScoringRound,
    scoringRoundCount,
    lifePreserverFollowing,
    lifePreserverLeading,
    lifePreserverHidden,
    applyPlayerNameOnGame
  };

  root.BPGScorebook = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
