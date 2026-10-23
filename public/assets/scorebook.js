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

  const EIGHT18_ROUND_TRICKS = [8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8];
  const NON_NEGATIVE_PLAYED_GAMES = {
    'Five Crowns': true,
    'Flip 7': true,
    'Flip 7 Vengeance': true,
    'Beat the Heat': true
  };

  function gameName(game) {
    if (typeof game === 'string') return game;
    return (game && (game.name || game.game)) || '';
  }

  function roundTrickLimit(game, roundNumber) {
    const name = gameName(game);
    const round = Number(roundNumber);
    if (!Number.isInteger(round) || round < 1) return 0;
    if (name === '818') return EIGHT18_ROUND_TRICKS[round - 1] || 0;
    if (name === 'Wizard') return round;
    return 0;
  }

  function parseEntryInteger(raw) {
    if (raw === undefined || raw === null) return { ok: false, reason: 'blank' };
    if (typeof raw === 'number') {
      if (!Number.isInteger(raw)) return { ok: false, reason: 'not-integer' };
      return { ok: true, value: raw };
    }
    const text = String(raw).trim();
    if (text === '' || text === '-' || text === '+') return { ok: false, reason: 'blank' };
    if (!/^[+-]?\d+$/.test(text)) return { ok: false, reason: 'not-integer' };
    const value = Number(text);
    if (!Number.isSafeInteger(value)) return { ok: false, reason: 'not-integer' };
    return { ok: true, value };
  }

  function playedScoreMustBeNonNegative(game) {
    return !!NON_NEGATIVE_PLAYED_GAMES[gameName(game)];
  }

  function entryGameLabel(game) {
    const name = gameName(game);
    if (name === 'Flip 7 Vengeance' || name === 'Flip 7') return 'Flip 7';
    return name || 'Score';
  }

  function entryRejectionMessage(game, kind, limit, players) {
    const who = (players || []).join(', ');
    const label = entryGameLabel(game);
    if (kind === 'bids') return `${label} bids must be from 0 to ${limit}. Check ${who}.`;
    if (kind === 'tricks') return `${label} tricks must be from 0 to ${limit}. Check ${who}.`;
    return `${label} scores must be whole numbers, 0 or higher. Check ${who}.`;
  }

  function validateEntries(spec) {
    const source = spec || {};
    const kind = source.kind;
    const players = Array.isArray(source.players) ? source.players : [];
    const rawValues = source.values || {};
    const bounded = kind === 'bids' || kind === 'tricks';
    const limit = bounded ? roundTrickLimit(source.game, source.roundNumber) : null;
    const invalidPlayers = [];
    const values = {};
    players.forEach(player => {
      const parsed = parseEntryInteger(rawValues[player]);
      if (!parsed.ok) {
        invalidPlayers.push(player);
        return;
      }
      if (bounded && (parsed.value < 0 || parsed.value > limit)) {
        invalidPlayers.push(player);
        return;
      }
      if (kind === 'scores' && playedScoreMustBeNonNegative(source.game) && parsed.value < 0) {
        invalidPlayers.push(player);
        return;
      }
      values[player] = parsed.value;
    });
    if (invalidPlayers.length) {
      return {
        ok: false,
        reason: 'invalid',
        invalidPlayers,
        values,
        limit,
        message: entryRejectionMessage(source.game, kind, limit, invalidPlayers)
      };
    }
    const sum = players.reduce((total, player) => total + values[player], 0);
    return { ok: true, invalidPlayers: [], values, sum, limit, message: '' };
  }

  function trickTableIsBalanced(values, players, limit) {
    const list = Array.isArray(players) ? players : [];
    const sum = list.reduce((total, player) => total + (Number(values && values[player]) || 0), 0);
    return { ok: sum === limit, sum, limit };
  }

  function snapshotMatchState(game) {
    return JSON.parse(JSON.stringify(game || {}));
  }

  function restoreMatchState(game, snap) {
    if (!game || !snap) return game;
    Object.keys(game).forEach(key => { delete game[key]; });
    Object.assign(game, JSON.parse(JSON.stringify(snap)));
    return game;
  }

  function commitValidatedMutation(game, mutate, verify) {
    if (!game || typeof mutate !== 'function') {
      return { ok: false, reason: 'missing', message: 'That change was not saved.' };
    }
    const snap = snapshotMatchState(game);
    let result;
    try {
      result = mutate(game);
    } catch (error) {
      restoreMatchState(game, snap);
      return { ok: false, reason: 'failed', message: 'That change was not saved.' };
    }
    if (!result || result.ok === false) {
      restoreMatchState(game, snap);
      return result || { ok: false, reason: 'rejected', message: 'That change was not saved.' };
    }
    if (typeof verify === 'function') {
      let check;
      try {
        check = verify(game, result);
      } catch (error) {
        restoreMatchState(game, snap);
        return { ok: false, reason: 'failed', message: 'That change was not saved.' };
      }
      if (!check || check.ok === false) {
        restoreMatchState(game, snap);
        return check || { ok: false, reason: 'verify', message: 'That change was not saved.' };
      }
    }
    return result;
  }

  function recomputeTotals(game) {
    if (!game) return {};
    game.totals = {};
    (game.originalRoster || []).forEach(player => { if (player) game.totals[player] = 0; });
    (game.rounds || []).forEach(round => {
      Object.keys((round && round.scores) || {}).forEach(player => {
        if (game.totals[player] === undefined) game.totals[player] = 0;
        game.totals[player] += (round.scores[player] || 0);
      });
      Object.entries((round && round.comeback) || {}).forEach(([player, extra]) => {
        if (game.totals[player] === undefined) game.totals[player] = 0;
        game.totals[player] += Number(extra) || 0;
      });
    });
    return game.totals;
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
    rookHandScores,
    gameName,
    roundTrickLimit,
    parseEntryInteger,
    playedScoreMustBeNonNegative,
    validateEntries,
    trickTableIsBalanced,
    snapshotMatchState,
    restoreMatchState,
    commitValidatedMutation,
    recomputeTotals
  };

  root.BPGScorebook = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
