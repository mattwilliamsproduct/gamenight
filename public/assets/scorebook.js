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

  function applyScoreEntryKey(entry, key) {
    const source = entry || {};
    let value = source.value == null ? '' : String(source.value);
    let acknowledged = !!source.acknowledged;
    const token = key == null ? '' : String(key);
    const digit = /^[0-9]+$/.test(token);
    if (!acknowledged && digit) {
      return { value: token, acknowledged: true, replaced: true };
    }
    if (token === 'backspace') value = value.slice(0, -1);
    else if (token === '-') value = value.startsWith('-') ? value.substring(1) : '-' + value;
    else if (digit && value === '0' && token !== '0' && token !== '00') value = token;
    else if (digit && value.length < 5) value += token;
    if (digit || token === 'backspace' || token === '-') acknowledged = true;
    return { value, acknowledged, replaced: false };
  }

  function acceptScoreEntryValue(entry) {
    const source = entry || {};
    const value = source.value == null ? '' : String(source.value);
    if (value === '' || value === '-') {
      return { value, acknowledged: !!source.acknowledged, accepted: false };
    }
    return { value, acknowledged: true, accepted: true };
  }

  function createScoreEntrySession(players, values) {
    const list = Array.isArray(players) ? players.filter(Boolean) : [];
    return {
      players: list.slice(),
      activePlayer: list[0] || null,
      values: Object.assign({}, values || {}),
      acknowledged: Object.fromEntries(list.map(player => [player, false]))
    };
  }

  function pressScoreEntryKey(session, key) {
    const player = session && session.activePlayer;
    if (!session || !player) return session;
    const next = applyScoreEntryKey({
      value: session.values[player],
      acknowledged: session.acknowledged[player]
    }, key);
    session.values[player] = next.value;
    session.acknowledged[player] = next.acknowledged;
    return session;
  }

  function acceptScoreEntryPlayer(session, player) {
    if (!session || !player) return session;
    const next = acceptScoreEntryValue({
      value: session.values[player],
      acknowledged: session.acknowledged[player]
    });
    if (!next.accepted) return session;
    session.values[player] = next.value;
    session.acknowledged[player] = true;
    return session;
  }

  function selectScoreEntryPlayer(session, player) {
    if (!session || !player) return session;
    session.activePlayer = player;
    return session;
  }

  function isSyntheticAdjustmentRound(round) {
    return !!(round && (round.hailMaryBonus === true || Number(round.round) === 0));
  }

  function isPlayedScoringRound(round) {
    return !!(round && !isSyntheticAdjustmentRound(round));
  }

  function signedScore(value) {
    const n = Number(value) || 0;
    return n >= 0 ? `+${n}` : String(n);
  }

  function lowScoreWins(game) {
    const name = gameName(game);
    return name === 'Five Crowns' || name === 'Beat the Heat';
  }

  function beatTheHeatLine(game) {
    const line = Number(game && game.endScore);
    return Number.isFinite(line) && line > 0 ? line : 66;
  }

  function rookWinTarget(game) {
    const target = Number(game && game.rookConfig && game.rookConfig.winTarget);
    return Number.isFinite(target) && target > 0 ? target : 0;
  }

  function activeStandingPlayers(game) {
    const retired = new Set((game && game.retired) || []);
    const totals = (game && game.totals) || {};
    const roster = game && Array.isArray(game.originalRoster) && game.originalRoster.length
      ? game.originalRoster
      : Object.keys(totals);
    return roster.filter(player => player && !retired.has(player) && Object.prototype.hasOwnProperty.call(totals, player));
  }

  function matchLengthOver(game) {
    const maxR = Number(game && game.maxRounds);
    if (!Number.isFinite(maxR) || maxR <= 0 || maxR >= 999) return false;
    return (Number(game.currentRound) || 0) > maxR;
  }

  function beatTheHeatOver(game) {
    if (gameName(game) !== 'Beat the Heat') return false;
    const line = beatTheHeatLine(game);
    return activeStandingPlayers(game).some(player => (Number(game.totals[player]) || 0) >= line);
  }

  function rookTargetOver(game) {
    if (gameName(game) !== 'Rook') return false;
    const target = rookWinTarget(game);
    if (!target) return false;
    return activeStandingPlayers(game).some(player => (Number(game.totals[player]) || 0) >= target);
  }

  function standingOver(game) {
    return matchLengthOver(game) || beatTheHeatOver(game) || rookTargetOver(game);
  }

  function leadersOf(game) {
    const players = activeStandingPlayers(game);
    if (!players.length) return [];
    const low = lowScoreWins(game);
    let best = null;
    players.forEach(player => {
      const score = Number(game.totals[player]) || 0;
      if (best == null || (low ? score < best : score > best)) best = score;
    });
    return players.filter(player => (Number(game.totals[player]) || 0) === best);
  }

  function refreshStanding(game, before) {
    const over = standingOver(game);
    const priorWinners = Array.isArray(game.winners) ? game.winners.slice() : [];
    if (before && before.over && !over) {
      game.winners = [];
      game.completed = false;
      return { over: false, reopened: true, winnersChanged: priorWinners.length > 0, winners: [] };
    }
    const finished = over || !!(before && before.completed);
    if (!finished) {
      return { over: false, reopened: false, winnersChanged: false, winners: priorWinners };
    }
    const next = leadersOf(game);
    game.winners = next.slice();
    game.completed = true;
    return {
      over,
      reopened: false,
      winnersChanged: priorWinners.join('\0') !== next.join('\0'),
      winners: next.slice()
    };
  }

  function trickRoundPlayers(round) {
    const bids = round && round.bids;
    const keys = bids ? Object.keys(bids) : [];
    return keys.length ? keys : Object.keys((round && round.actuals) || {});
  }

  function correctionDetail(kind, changes) {
    if (kind === 'tricks') {
      return changes.map(change => `${change.player}: ${change.fromActual} -> ${change.toActual} (${signedScore(change.fromScore)} -> ${signedScore(change.toScore)})`).join(', ');
    }
    return changes.map(change => `${change.player}: ${change.from} -> ${change.to}`).join(', ');
  }

  function sameNumber(left, right) {
    return Number(left) === Number(right);
  }

  function verifyRoundCorrection(game, roundIndex) {
    const round = game && game.rounds && game.rounds[roundIndex];
    if (!round) return { ok: false, reason: 'verify', message: 'That round is missing.' };
    const name = gameName(game);
    if (name === 'Wizard' || name === '818') {
      const players = trickRoundPlayers(round);
      const limit = roundTrickLimit(game, round.round);
      const outOfRange = players.filter(player => {
        const actual = round.actuals && round.actuals[player];
        return !Number.isInteger(actual) || actual < 0 || actual > limit;
      });
      if (outOfRange.length) return { ok: false, reason: 'verify', message: 'Round no longer adds up.' };
      if (!trickTableIsBalanced(round.actuals, players, limit).ok) {
        return { ok: false, reason: 'verify', message: 'Round no longer adds up.' };
      }
      const scoreFor = name === 'Wizard' ? wizardRoundScore : eight18RoundScore;
      const mismatched = players.some(player => round.scores[player] !== scoreFor(round.bids[player], round.actuals[player]));
      if (mismatched) return { ok: false, reason: 'verify', message: 'Round scores no longer match the tricks.' };
    }
    const copy = snapshotMatchState(game);
    recomputeTotals(copy);
    const keys = new Set([...Object.keys(game.totals || {}), ...Object.keys(copy.totals || {})]);
    for (const key of keys) {
      if ((Number(game.totals[key]) || 0) !== (Number(copy.totals[key]) || 0)) {
        return { ok: false, reason: 'verify', message: 'Totals no longer match the rounds.' };
      }
    }
    return { ok: true };
  }

  function commitRoundCorrection(game, spec) {
    const source = spec || {};
    return commitValidatedMutation(game, draft => {
      const roundIndex = source.roundIndex;
      const round = draft && draft.rounds && draft.rounds[roundIndex];
      if (!round || isSyntheticAdjustmentRound(round)) {
        return { ok: false, reason: 'invalid', message: 'That round cannot be corrected.' };
      }
      const name = gameName(draft);
      const before = { over: standingOver(draft), completed: draft.completed === true };
      const kind = (name === 'Wizard' || name === '818') ? 'tricks' : 'scores';
      const changes = [];

      if (kind === 'tricks') {
        const players = trickRoundPlayers(round);
        if (!players.length) return { ok: false, reason: 'invalid', message: 'That round has no bids to correct.' };
        const rawActuals = {};
        players.forEach(player => {
          if (source.actuals && Object.prototype.hasOwnProperty.call(source.actuals, player)) rawActuals[player] = source.actuals[player];
          else rawActuals[player] = round.actuals ? round.actuals[player] : '';
        });
        const checked = validateEntries({
          game: draft,
          kind: 'tricks',
          roundNumber: round.round,
          players,
          values: rawActuals
        });
        if (!checked.ok) return checked;
        const balanced = trickTableIsBalanced(checked.values, players, checked.limit);
        if (!balanced.ok) {
          return {
            ok: false,
            reason: 'unbalanced',
            invalidPlayers: [],
            values: checked.values,
            limit: checked.limit,
            sum: balanced.sum,
            message: `${entryGameLabel(draft)} round ${round.round} must total ${checked.limit} tricks. This table totals ${balanced.sum}.`
          };
        }
        const actualsChanged = players.some(player => !sameNumber(round.actuals && round.actuals[player], checked.values[player]));
        if (!actualsChanged) return { ok: true, changed: false, noop: true, message: '' };
        const scoreFor = name === 'Wizard' ? wizardRoundScore : eight18RoundScore;
        const nextScores = {};
        players.forEach(player => {
          const fromActual = round.actuals ? round.actuals[player] : undefined;
          const toActual = checked.values[player];
          const fromScore = round.scores ? round.scores[player] : scoreFor(round.bids[player], fromActual);
          const toScore = scoreFor(round.bids[player], toActual);
          nextScores[player] = toScore;
          if (!sameNumber(fromActual, toActual) || !sameNumber(fromScore, toScore)) {
            changes.push({
              player,
              fromActual: Number(fromActual),
              toActual,
              fromScore: Number(fromScore),
              toScore
            });
          }
        });
        if (!round.actuals) round.actuals = {};
        if (!round.scores) round.scores = {};
        players.forEach(player => {
          round.actuals[player] = checked.values[player];
          round.scores[player] = nextScores[player];
        });
      } else {
        const rawScores = source.scores || {};
        const players = Object.keys(rawScores);
        if (!players.length) return { ok: false, reason: 'invalid', message: 'Nothing to correct.' };
        const checked = validateEntries({
          game: draft,
          kind: 'scores',
          roundNumber: round.round,
          players,
          values: rawScores
        });
        if (!checked.ok) return checked;
        players.forEach(player => {
          const from = round.scores ? round.scores[player] : undefined;
          const to = checked.values[player];
          if (!sameNumber(from, to)) changes.push({ player, from: Number(from), to });
        });
        if (!changes.length) return { ok: true, changed: false, noop: true, message: '' };
        if (!round.scores) round.scores = {};
        players.forEach(player => { round.scores[player] = checked.values[player]; });
      }

      recomputeTotals(draft);
      const standing = refreshStanding(draft, before);
      const detail = correctionDetail(kind, changes);
      const action = `R${round.round} ${kind === 'tricks' ? 'Tricks Edited' : 'Score Edited'}`;
      if (!Array.isArray(draft.auditLog)) draft.auditLog = [];
      draft.auditLog.push({
        ts: source.now || Date.now(),
        action,
        detail,
        round: round.round,
        kind,
        changes
      });
      if (draft.auditLog.length > 200) draft.auditLog = draft.auditLog.slice(-200);
      return {
        ok: true,
        changed: true,
        noop: false,
        action,
        detail,
        kind,
        changes,
        standing,
        winners: Array.isArray(draft.winners) ? draft.winners.slice() : []
      };
    }, draft => verifyRoundCorrection(draft, source.roundIndex));
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
    recomputeTotals,
    applyScoreEntryKey,
    acceptScoreEntryValue,
    createScoreEntrySession,
    pressScoreEntryKey,
    acceptScoreEntryPlayer,
    selectScoreEntryPlayer,
    isSyntheticAdjustmentRound,
    isPlayedScoringRound,
    standingOver,
    leadersOf,
    refreshStanding,
    commitRoundCorrection
  };

  root.BPGScorebook = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
