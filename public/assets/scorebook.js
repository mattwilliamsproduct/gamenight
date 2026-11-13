(function (root) {
  'use strict';

  function placeScore(totals, player) {
    const n = Number(totals ? totals[player] : undefined);
    return Number.isFinite(n) ? n : 0;
  }

  // Competition ranking: tied totals share a place and the next total skips.
  // 1,1,3 and 2,2,4. Callers omit departed seats so they take no spot.
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

  function entryDigitCap(game, kind) {
    const name = gameName(game);
    const mode = kind || '';
    if (name === 'Hand and Foot' && mode !== 'bids' && mode !== 'tricks') return 4;
    return 3;
  }

  function entryDigitLimit(game, kind) {
    return entryDigitCap(game, kind) === 4 ? 9999 : 999;
  }

  function unusualEntryFloor(game) {
    const name = gameName(game);
    if (name === 'Hand and Foot') return 8000;
    if (name === 'Five Crowns') return 200;
    if (name === 'Wizard') return 150;
    if (name === '818') return 20;
    if (name === 'Flip 7 Vengeance') return 200;
    if (name === 'Beat the Heat') return 30;
    return 500;
  }

  function entryDigitCount(value) {
    return String(value == null ? '' : value).replace(/\D/g, '').length;
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

  function isUsablePlayerName(name) {
    return typeof name === 'string' && name.trim() !== '' && !name.includes(',');
  }

  function knownPlayerNames(allPlayers, profiles) {
    const seen = new Set();
    const names = [];
    const raw = [...(Array.isArray(allPlayers) ? allPlayers : []), ...Object.keys(profiles || {})];
    raw.forEach((item) => {
      const name = typeof item === 'string' ? item.trim() : '';
      if (!isUsablePlayerName(name)) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      names.push(name);
    });
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  function playerSuggestionMatches(allPlayers, profiles, query, seated) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const skip = new Set((seated || []).map((name) => String(name || '').toLowerCase()));
    return knownPlayerNames(allPlayers, profiles)
      .filter((name) => !skip.has(name.toLowerCase()))
      .filter((name) => name.toLowerCase().startsWith(q))
      .slice(0, 8);
  }

  function isCommaJoinedGhost(name, realNames) {
    if (typeof name !== 'string' || !name.includes(',')) return false;
    const parts = name.split(',').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return false;
    const reals = new Set((realNames || []).map((item) => String(item || '').toLowerCase()));
    return parts.every((part) => reals.has(part.toLowerCase()));
  }

  function cleanupCommaJoinedGhosts(state) {
    const allPlayers = Array.isArray(state?.allPlayers) ? state.allPlayers.slice() : [];
    const players = Array.isArray(state?.players) ? state.players.slice() : [];
    const playerProfiles = state?.playerProfiles && typeof state.playerProfiles === 'object'
      ? { ...state.playerProfiles }
      : {};
    const realNames = [...allPlayers, ...players, ...Object.keys(playerProfiles)]
      .filter((name) => typeof name === 'string' && name.trim() && !name.includes(','));
    const kept = [];
    let changed = false;
    const dropIfGhost = (name) => {
      if (isCommaJoinedGhost(name, realNames)) {
        changed = true;
        return false;
      }
      if (typeof name === 'string' && name.includes(',')) kept.push(name);
      return true;
    };
    const nextAll = allPlayers.filter(dropIfGhost);
    const nextPlayers = players.filter(dropIfGhost);
    Object.keys(playerProfiles).forEach((name) => {
      if (!dropIfGhost(name)) delete playerProfiles[name];
    });
    return {
      changed,
      allPlayers: nextAll,
      players: nextPlayers,
      playerProfiles,
      kept: [...new Set(kept)]
    };
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

  function participantNames(game) {
    const names = new Set();
    const add = name => { if (name) names.add(name); };
    if (!game || typeof game !== 'object') return names;
    ['players', 'originalRoster', 'retired'].forEach(key => {
      (Array.isArray(game[key]) ? game[key] : []).forEach(add);
    });
    Object.keys(game.totals || {}).forEach(add);
    (game.rounds || []).forEach(round => {
      if (!round) return;
      ['scores', 'bids', 'actuals'].forEach(key => Object.keys(round[key] || {}).forEach(add));
      add(round.rookBidder);
      add(round.rookPartner);
    });
    add(game.rookHighBidder);
    add(game.rookPartner);
    return names;
  }

  function findSharedMatch(games, oldName, newName) {
    if (!oldName || !newName || oldName === newName) return null;
    for (const game of games || []) {
      const names = participantNames(game);
      if (names.has(oldName) && names.has(newName)) return game;
    }
    return null;
  }

  function namesShareMatch(games, oldName, newName) {
    return !!findSharedMatch(games, oldName, newName);
  }

  function applyPlayerNameOnGame(game, oldName, newName, merge) {
    if (!game || !oldName || !newName || oldName === newName) return game;
    const combining = !!merge;
    if (combining && namesShareMatch([game], oldName, newName)) return game;
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

  const EIGHT18_ROUND_TRICKS = [8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8];
  const NON_NEGATIVE_PLAYED_GAMES = {
    'Five Crowns': true,
    'Beat the Heat': true
  };

  function gameName(game) {
    if (typeof game === 'string') return game;
    return (game && (game.name || game.game)) || '';
  }

  function trickCountLabel(count) {
    const n = Number(count) || 0;
    return n === 1 ? '1 trick' : `${n} tricks`;
  }

  function trickLimitRejection(nextValue, source) {
    if (!source || source.trickLimit == null || source.trickLimit === '') return '';
    const limit = Number(source.trickLimit);
    if (!Number.isFinite(limit)) return '';
    const text = String(nextValue == null ? '' : nextValue).trim();
    if (text === '' || text === '-') return '';
    const n = parseInt(text, 10);
    if (!Number.isFinite(n) || n <= limit) return '';
    if (source.detail) return `${n} is more than this round's ${trickCountLabel(limit)}.`;
    return `This round has ${trickCountLabel(limit)}.`;
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
    if (name === 'Hand and Foot') return 'Canasta';
    return name || 'Score';
  }

  function entryRejectionMessage(game, kind, limit, players) {
    const who = (players || []).join(', ');
    const label = entryGameLabel(game);
    if (kind === 'bids') return `${label} bids must be from 0 to ${limit}. Check ${who}.`;
    if (kind === 'tricks') return `${label} tricks must be from 0 to ${limit}. Check ${who}.`;
    return `${label} scores must be whole numbers, 0 or higher. Check ${who}.`;
  }

  function missingScoresMessage(players) {
    const list = (players || []).filter(Boolean);
    if (!list.length) return 'Still need a score.';
    return `Still need: ${list.join(', ')}`;
  }

  function missingBidsMessage(players) {
    const list = (players || []).filter(Boolean);
    if (!list.length) return 'Still need bids.';
    if (list.length === 1) return `Still need a bid from ${list[0]}.`;
    if (list.length === 2) return `Still need bids from ${list[0]} and ${list[1]}.`;
    return `Still need bids from ${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}.`;
  }

  function validateEntries(spec) {
    const source = spec || {};
    const kind = source.kind;
    const players = Array.isArray(source.players) ? source.players : [];
    const rawValues = source.values || {};
    const bounded = kind === 'bids' || kind === 'tricks';
    const limit = bounded ? roundTrickLimit(source.game, source.roundNumber) : null;
    const invalidPlayers = [];
    const missingPlayers = [];
    const values = {};
    let oversizeLimit = 0;
    players.forEach(player => {
      let raw = rawValues[player];
      if ((kind === 'scores' || kind === 'tricks') && scoreEntryValueIsBlank(raw)) raw = 0;
      if (kind === 'bids' && gameName(source.game) === '818' && scoreEntryValueIsBlank(raw)) raw = 0;
      if (kind === 'bids' && gameName(source.game) !== '818' && scoreEntryValueIsBlank(raw)) {
        missingPlayers.push(player);
        return;
      }
      const parsed = parseEntryInteger(raw);
      if (!parsed.ok) {
        invalidPlayers.push(player);
        return;
      }
      if (bounded && (parsed.value < 0 || parsed.value > limit)) {
        invalidPlayers.push(player);
        return;
      }
      const digitLimit = entryDigitLimit(source.game, kind);
      if (Math.abs(parsed.value) > digitLimit) {
        invalidPlayers.push(player);
        oversizeLimit = digitLimit;
        return;
      }
      if (kind === 'scores' && playedScoreMustBeNonNegative(source.game) && parsed.value < 0) {
        invalidPlayers.push(player);
        return;
      }
      values[player] = parsed.value;
    });
    if (missingPlayers.length) {
      return {
        ok: false,
        reason: 'missing',
        invalidPlayers: missingPlayers.slice(),
        missingPlayers,
        values,
        limit,
        message: missingBidsMessage(missingPlayers)
      };
    }
    if (invalidPlayers.length) {
      return {
        ok: false,
        reason: 'invalid',
        invalidPlayers,
        values,
        limit,
        message: oversizeLimit
          ? `That entry stops at ${oversizeLimit.toLocaleString()}.`
          : entryRejectionMessage(source.game, kind, limit, invalidPlayers)
      };
    }
    if (kind === 'bids' && gameName(source.game) === '818') {
      const dealerBlock = eight18DealerBidViolation(source.game, { round: source.roundNumber, bids: values }, players);
      if (dealerBlock) {
        return {
          ok: false,
          reason: 'dealer',
          invalidPlayers: [dealerBlock.dealer],
          values,
          limit,
          forbidden: dealerBlock.forbidden,
          message: dealerBlock.message
        };
      }
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
    addLateJoinStarts(game);
    return game.totals;
  }

  // Ceiling of the table average. 97.5 and 97.1 both become 98. An exact
  // integer stays put (800 / 8 = 100). Negative sums use mathematical ceiling.
  function ceilingAverage(values) {
    const nums = (Array.isArray(values) ? values : []).map(value => Number(value)).filter(Number.isFinite);
    if (!nums.length) return 0;
    const sum = nums.reduce((total, value) => total + value, 0);
    const count = nums.length;
    if (Number.isInteger(sum)) {
      if (sum >= 0) return Math.floor((sum + count - 1) / count);
      return -Math.floor((-sum) / count);
    }
    return Math.ceil(sum / count);
  }

  function lateJoinInfo(game, player) {
    const info = game && game.lateJoins && game.lateJoins[player];
    if (!info || typeof info !== 'object') return null;
    const start = Number(info.start);
    const joinedRound = Number(info.joinedRound) || 0;
    if (!Number.isFinite(start) || joinedRound < 1) return null;
    return {
      start,
      joinedRound,
      label: `Joined R${joinedRound} · start ${start}`
    };
  }

  function missedRoundText(game, player, roundNumber) {
    const info = lateJoinInfo(game, player);
    const round = Number(roundNumber) || 0;
    if (!info || round < 1 || round >= info.joinedRound) return '';
    return 'Did not play';
  }

  function addLateJoinStarts(game, totals) {
    const book = totals || (game && game.totals);
    if (!game || !book) return book || {};
    Object.keys(game.lateJoins || {}).forEach(player => {
      const info = lateJoinInfo(game, player);
      if (!info) return;
      if (book[player] === undefined) book[player] = 0;
      book[player] += info.start;
    });
    return book;
  }

  function recordLateJoin(game, player, existingTotals, joinedRound) {
    if (!game || !player) return null;
    const values = Array.isArray(existingTotals) ? existingTotals : Object.values(existingTotals || {});
    const start = ceilingAverage(values);
    const round = Math.max(1, Number(joinedRound) || 1);
    if (!game.lateJoins || typeof game.lateJoins !== 'object') game.lateJoins = {};
    game.lateJoins[player] = { start, joinedRound: round };
    return lateJoinInfo(game, player);
  }

  function applyScoreEntryKey(entry, key) {
    const source = entry || {};
    let value = source.value == null ? '' : String(source.value);
    let acknowledged = !!source.acknowledged;
    const token = key == null ? '' : String(key);
    const digit = /^[0-9]+$/.test(token);
    const mode = source.mode || '';
    const deferAck = !!source.deferAck || mode === 'bids' || mode === 'tricks' || mode === 'bid' || mode === 'trick';
    // Prefills replace on the first digit. After the seat is dirty, digits append
    // even when deferAck keeps acknowledged false (bids/tricks "Entered" status).
    // Pending "-" is blank for status but must keep the sign (P1-05).
    const dirty = !!source.dirty;
    // 00 is not a key. A blank bid stays blank. A typed 0 is still a zero bid.
    if (token === '00') {
      return { value, acknowledged, replaced: false, dirty, rejected: false };
    }
    if (!acknowledged && digit && !dirty) {
      const replaced = String(value).trim() === '-' ? '-' + token : token;
      const blocked = trickLimitRejection(replaced, source);
      if (blocked) {
        return { value, acknowledged, replaced: false, dirty, rejected: true, attempt: replaced, message: blocked };
      }
      if (String(value).trim() === '-') {
        return { value: '-' + token, acknowledged: deferAck ? false : true, replaced: false, dirty: true };
      }
      return { value: token, acknowledged: deferAck ? false : true, replaced: true, dirty: true };
    }
    const cap = Number.isFinite(Number(source.digitCap)) ? Number(source.digitCap) : 3;
    const limitLabel = cap >= 4 ? '9,999' : '999';
    if (token === 'backspace') value = value.slice(0, -1);
    else if (token === '-') value = value.startsWith('-') ? value.substring(1) : '-' + value;
    else if (digit) {
      const nextValue = (value === '0' && token !== '0' && token !== '00') ? token : value + token;
      if (entryDigitCount(nextValue) > cap) {
        return {
          value,
          acknowledged,
          replaced: false,
          dirty,
          rejected: true,
          message: `That entry stops at ${limitLabel}.`
        };
      }
      const blocked = trickLimitRejection(nextValue, source);
      if (blocked) {
        return { value, acknowledged, replaced: false, dirty, rejected: true, attempt: nextValue, message: blocked };
      }
      value = nextValue;
    }
    if (String(value).trim() === '-') {
      acknowledged = deferAck ? false : true;
    } else if (scoreEntryValueIsBlank(value)) {
      acknowledged = false;
    } else if (digit || token === 'backspace' || token === '-') {
      acknowledged = deferAck ? false : true;
    }
    return { value, acknowledged, replaced: false, dirty: dirty || digit || token === '-' || token === 'backspace' };
  }

  function acceptScoreEntryValue(entry) {
    const source = entry || {};
    const value = source.value == null ? '' : String(source.value);
    if (scoreEntryValueIsBlank(value)) {
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

  function scoreEntryValueIsBlank(value) {
    if (value == null) return true;
    const text = String(value).trim();
    return text === '' || text === '-' || text === '+';
  }

  function scoreEntryBlankHelper() {
    return 'Skip leaves a score blank.';
  }

  function historyScoreOrNull(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string' && raw.trim() === '') return null;
    const parsed = parseEntryInteger(raw);
    return parsed.ok ? parsed.value : null;
  }

  function scoreEntryStatus(entry) {
    const source = entry || {};
    const value = source.value == null ? '' : String(source.value);
    const mode = source.mode || '';
    const bidLike = mode === 'bids' || mode === 'tricks' || mode === 'bid' || mode === 'trick';
    if (source.skipped && scoreEntryValueIsBlank(value)) {
      return { state: 'skipped', label: 'Skipped' };
    }
    if (scoreEntryValueIsBlank(value)) {
      return { state: 'unentered', label: 'Not entered' };
    }
    if (source.acknowledged) return { state: 'confirmed', label: `✓ Confirmed: ${value}` };
    if (bidLike) {
      if (String(value).trim() === '0') return { state: 'entered', label: 'Entered 0' };
      return { state: 'entered', label: `Entered ${value}` };
    }
    return { state: 'suggested', label: `💡 Suggested: ${value} (tap Next to confirm)` };
  }

  function confirmScoreEntryOnNext(session) {
    if (!session || !session.activePlayer) return session;
    const player = session.activePlayer;
    if (!scoreEntryValueIsBlank(session.values && session.values[player])) {
      acceptScoreEntryPlayer(session, player);
    }
    const order = Array.isArray(session.players) ? session.players : [];
    const index = order.indexOf(player);
    if (order.length) session.activePlayer = order[(index + 1) % order.length];
    return session;
  }

  function isSyntheticAdjustmentRound(round) {
    return !!(round && (round.hailMaryBonus === true || Number(round.round) === 0));
  }

  function isPlayedScoringRound(round) {
    return !!(round && !isSyntheticAdjustmentRound(round));
  }

  function appliedLifePreserverRemains(game) {
    if (!game || typeof game !== 'object') return false;
    if ((game.rounds || []).some(round => round && round.hailMaryBonus === true)) return true;
    return Array.isArray(game.hailMaryUsed) && game.hailMaryUsed.some(name => !!name);
  }

  function isAssistedMatch(game) {
    return appliedLifePreserverRemains(game);
  }

  function isCompletedHistoryMatch(match) {
    if (!match || typeof match !== 'object') return false;
    return match.completed !== false;
  }

  function expectedFullRoundCount(match) {
    if (!match || typeof match !== 'object') return 0;
    const stored = Number(match.maxRounds);
    if (Number.isFinite(stored) && stored > 0 && stored < 999) return stored;
    const name = gameName(match);
    const roster = Array.isArray(match.originalRoster) ? match.originalRoster.filter(Boolean) : [];
    const n = Math.max(roster.length || Object.keys(match.totals || {}).length || 0, 1);
    if (name === 'Five Crowns') return 11;
    if (name === 'Wizard') return Math.floor(60 / n);
    if (name === '818') return 15;
    if (name === 'Hand and Foot') return 4;
    return 0;
  }

  function isFullGame(match) {
    if (!match || typeof match !== 'object') return false;
    if (match.completed === false) return false;
    if (match.endedEarly === true) return false;
    const name = gameName(match);
    const scored = scoringRoundCount(match.rounds || []);
    if (name === 'Five Crowns' || name === 'Wizard' || name === '818' || name === 'Hand and Foot') {
      const need = expectedFullRoundCount(match);
      return need > 0 && scored >= need;
    }
    if (name === 'Beat the Heat') {
      const line = Number(match.endScore);
      const target = Number.isFinite(line) && line > 0 ? line : 66;
      const retired = new Set(match.retired || []);
      const totals = match.totals || {};
      return Object.keys(totals).some(player => !retired.has(player) && (Number(totals[player]) || 0) >= target);
    }
    if (name === 'Rook') {
      const target = Number(match.rookConfig && match.rookConfig.winTarget);
      if (!(Number.isFinite(target) && target > 0)) return false;
      const retired = new Set(match.retired || []);
      const totals = match.totals || {};
      return Object.keys(totals).some(player => !retired.has(player) && (Number(totals[player]) || 0) >= target);
    }
    if (name === 'Flip 7 Vengeance' || name === 'Flip 7') {
      const retired = new Set(match.retired || []);
      const totals = match.totals || {};
      // Matt, Nov 12, 7:10 PM ET: full game when any stored total reaches 200+.
      return Object.keys(totals).some((player) => !retired.has(player) && (Number(totals[player]) || 0) >= 200);
    }
    return match.completed === true;
  }

  function isEndedEarlyMatch(match) {
    if (!match || typeof match !== 'object') return false;
    if (match.completed === false) return false;
    if (match.endedEarly === true) return true;
    const name = gameName(match);
    if (name === 'Rook') {
      const target = Number(match.rookConfig && match.rookConfig.winTarget);
      if (!(Number.isFinite(target) && target > 0)) return false;
    }
    return match.completed === true && !isFullGame(match);
  }

  // 999 is the open-ended sentinel (Flip 7, Rook, Beat the Heat). It is not a round target.
  const OPEN_ROUND_SENTINEL = 999;

  function storedRoundTarget(match) {
    const stored = Number(match && match.maxRounds);
    if (Number.isFinite(stored) && stored > 0 && stored < OPEN_ROUND_SENTINEL) return stored;
    return null;
  }

  function storedScoreTarget(match) {
    const end = Number(match && match.endScore);
    if (Number.isFinite(end) && end > 0) return end;
    const rook = Number(match && match.rookConfig && match.rookConfig.winTarget);
    if (Number.isFinite(rook) && rook > 0) return rook;
    return null;
  }

  function anyActiveTotalAtLeast(match, score) {
    const retired = new Set((match && match.retired) || []);
    const totals = (match && match.totals) || {};
    return Object.keys(totals).some((player) => (
      player && !retired.has(player) && (Number(totals[player]) || 0) >= score
    ));
  }

  // 'finished' when a stored rule is met, 'short' when a stored rule is missed, null when no rule is stored.
  // Today's config targets are not applied here. Rook stays unknown unless the row saved a target.
  // Leave game asks leaveFinishState, which applies Flip 7's 200 rule without changing review-off history.
  function completionFromSavedRules(match) {
    if (!match || typeof match !== 'object') return null;
    const rounds = storedRoundTarget(match);
    const score = storedScoreTarget(match);
    if (rounds == null && score == null) return null;
    const roundsMet = rounds != null && scoringRoundCount(match.rounds || []) >= rounds;
    const scoreMet = score != null && anyActiveTotalAtLeast(match, score);
    return (roundsMet || scoreMet) ? 'finished' : 'short';
  }

  // Leave game only. Flip 7 finishes at 200 for a seated player (Matt, Nov 12, 7:10 PM ET).
  // A game that scored and stayed under 200 is short. Rook stays on the saved-target rule.
  function leaveFinishState(match) {
    if (!match || typeof match !== 'object') return null;
    const name = gameName(match);
    if (name === 'Flip 7 Vengeance' || name === 'Flip 7') {
      const played = scoringRoundCount(match.rounds || []);
      if (anyActiveTotalAtLeast(match, 200)) return 'finished';
      if (played >= 1) return 'short';
      return null;
    }
    return completionFromSavedRules(match);
  }

  function canastaScoreFinite(value) {
    if (value === '' || value === null || value === undefined || value === '-') return false;
    const number = Number(value);
    return Number.isFinite(number);
  }

  // A saved Canasta row is ambiguous when a scoring round has no numeric score,
  // a blank score, or the same round number twice. Four clean rounds are not ambiguous.
  function canastaRowsAmbiguous(match) {
    const rounds = ((match && match.rounds) || []).filter(isScoringRound);
    const seen = new Set();
    return rounds.some((round) => {
      if (!round || typeof round !== 'object') return true;
      const number = Number(round.round);
      if (Number.isFinite(number)) {
        if (seen.has(number)) return true;
        seen.add(number);
      }
      const scores = round.scores;
      if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return true;
      const keys = Object.keys(scores).filter(Boolean);
      if (!keys.length) return true;
      return keys.some((key) => !canastaScoreFinite(scores[key]));
    });
  }

  // The live Leave probe has no saved id or date. A history row does.
  function canastaLiveProbe(match) {
    return !!(match && match.id == null && !match.date);
  }

  function outcomeFromLegacy(match) {
    const known = completionFromSavedRules(match);
    if (known === 'finished') return 'finished';
    if (known === 'short') return 'ended_early';
    const legacy = legacyCompletion(match);
    if (legacy.status === 'complete') return 'finished';
    if (legacy.status === 'partial') return 'ended_early';
    return 'uncertain';
  }

  function resolveOutcome(match) {
    if (!match || typeof match !== 'object') return 'uncertain';
    const name = gameName(match);
    if (name === 'Hand and Foot' || name === 'Canasta') {
      // Matt, 7:13 PM ET, amendment 11. This replaces the 5:55 note that left every Canasta night uncertain.
      // Four saved rounds are complete. A game finished in the app is finished.
      // A legacy night with fewer than 4 rounds, or with an ambiguous row, stays uncertain.
      if (match.outcome === 'paused' || match.completed === false) return 'paused';
      if (canastaRowsAmbiguous(match)) return 'uncertain';
      const played = scoringRoundCount(match.rounds || []);
      if (played >= 4) return 'finished';
      if (match.outcome === 'ended_early') return 'ended_early';
      if (canastaLiveProbe(match)) {
        const known = completionFromSavedRules(match);
        if (known === 'finished') return 'finished';
        if (known === 'short') return 'ended_early';
      }
      return 'uncertain';
    }
    const stored = match.outcome;
    if (stored === 'finished' || stored === 'paused' || stored === 'ended_early' || stored === 'uncertain') return stored;
    if (match.completed === false) return 'paused';
    if (legacyReviewAppliedNow()) return outcomeFromLegacy(match);
    const known = completionFromSavedRules(match);
    if (known === 'finished') return 'finished';
    if (known === 'short') return 'ended_early';
    return 'uncertain';
  }

  let legacyReviewApplied = true;
  let historyReviewDecisions = {};

  function setLegacyReviewApplied(on) {
    legacyReviewApplied = !!on;
  }

  function legacyReviewAppliedNow() {
    return legacyReviewApplied;
  }

  function setHistoryReview(decisions) {
    historyReviewDecisions = decisions && typeof decisions === 'object' && !Array.isArray(decisions) ? decisions : {};
  }

  function historyReviewDecision(match) {
    if (!match || match.id == null) return null;
    const row = historyReviewDecisions[String(match.id)];
    const decision = row && typeof row === 'object' ? row.decision : row;
    if (decision === 'counted' || decision === 'not_counted') return decision;
    return null;
  }

  function legacyRosterCount(match) {
    const roster = Array.isArray(match && match.originalRoster) ? match.originalRoster.filter(Boolean) : [];
    if (roster.length) return roster.length;
    const players = Array.isArray(match && match.players) ? match.players.filter(Boolean) : [];
    if (players.length) return players.length;
    return Object.keys((match && match.totals) || {}).filter(Boolean).length;
  }

  function anySavedTotalAtLeast(match, score) {
    const totals = (match && match.totals) || {};
    return Object.keys(totals).some((player) => player && (Number(totals[player]) || 0) >= score);
  }

  // Isolated legacy rule. 'complete' | 'partial' | 'uncertain', plus a reason.
  // Known fixed lengths come from saved rounds, not from a round-count field.
    // Flip 7 finishes at 200 for a seated player (Matt, Nov 12, 7:10 PM ET). Rook stays uncertain unless a target saved on that night was reached.
    // Canasta is 4 saved scoring rounds (Matt, 7:13 PM ET, amendment 11). Fewer than 4, or an ambiguous row, stays uncertain.
  function legacyCompletion(match) {
    if (!match || typeof match !== 'object') {
      return {status: 'uncertain', reason: 'No saved night.', played: 0, fixed: null};
    }
    const name = gameName(match);
    const played = scoringRoundCount(match.rounds || []);
    if (name === 'Hand and Foot' || name === 'Canasta') {
      if (canastaRowsAmbiguous(match)) {
        return {status: 'uncertain', reason: 'A Canasta row is ambiguous. Needs review.', played, fixed: 4};
      }
      if (played >= 4) {
        return {status: 'complete', reason: played + ' saved rounds meet the 4-round length.', played, fixed: 4};
      }
      return {status: 'uncertain', reason: played + ' of 4 rounds. Needs review.', played, fixed: 4};
    }
    if (name === 'Flip 7 Vengeance' || name === 'Flip 7') {
      if (anyActiveTotalAtLeast(match, 200)) {
        return {status: 'complete', reason: 'A seated player reached 200.', played, fixed: null};
      }
      if (played >= 1) {
        return {status: 'partial', reason: 'Flip 7 ended before 200.', played, fixed: null};
      }
      return {status: 'uncertain', reason: 'Flip 7 has no saved rounds. Needs review.', played, fixed: null};
    }
    if (name === 'Rook') {
      const target = storedScoreTarget(match);
      if (target != null && anySavedTotalAtLeast(match, target)) {
        return {status: 'complete', reason: 'A target saved on this night was reached.', played, fixed: null};
      }
      return {status: 'uncertain', reason: name + ' has no confirmed finish rule. Needs review.', played, fixed: null};
    }
    if (name === 'Beat the Heat') {
      if (anyActiveTotalAtLeast(match, 66)) {
        return {status: 'complete', reason: 'A seated player reached 66.', played, fixed: null};
      }
      return {status: 'uncertain', reason: 'Beat the Heat did not show a saved total of 66. Needs review.', played, fixed: null};
    }
    let fixed = null;
    if (name === 'Five Crowns') fixed = 11;
    else if (name === '818') fixed = EIGHT18_ROUND_TRICKS.length;
    else if (name === 'Wizard') {
      const count = legacyRosterCount(match);
      fixed = count > 0 ? Math.floor(60 / count) : null;
    }
    if (!fixed) {
      return {status: 'uncertain', reason: 'No known finish rule for this night. Needs review.', played, fixed: null};
    }
    if (played >= fixed) {
      return {status: 'complete', reason: played + ' saved rounds meet the ' + fixed + '-round length.', played, fixed};
    }
    return {status: 'partial', reason: played + ' of ' + fixed + ' rounds. Ended early.', played, fixed};
  }

  function resultIsCounted(match) {
    const decision = historyReviewDecision(match);
    if (decision === 'counted') return true;
    if (decision === 'not_counted') return false;
    return !!(match && (match.countResult === true || match.countOverride === true));
  }

  function isCompleteGame(match) {
    return resolveOutcome(match) === 'finished';
  }

  // Wins, games played, win rate, and win/loss streak. A counted early or uncertain result is included. A pause is not.
  function countsForTallies(match) {
    const outcome = resolveOutcome(match);
    if (outcome === 'finished') return true;
    if (outcome === 'ended_early' || outcome === 'uncertain') return resultIsCounted(match);
    return false;
  }

  function countsForResults(match) {
    return countsForTallies(match);
  }

  // Full-game score records. Counting a winner does not make a partial total eligible.
  function countsForScoreMagnitude(match) {
    return resolveOutcome(match) === 'finished';
  }

  function endedEarlyLabel(match) {
    const outcome = resolveOutcome(match);
    if (outcome === 'ended_early') {
      const rounds = storedRoundTarget(match);
      const played = scoringRoundCount((match && match.rounds) || []);
      if (rounds != null) return `Ended early, ${played} of ${rounds} rounds`;
      const legacy = legacyCompletion(match);
      if (legacy.status === 'partial' && legacy.fixed) return `Ended early, ${legacy.played} of ${legacy.fixed} rounds`;
      return 'Ended early';
    }
    if (outcome === 'uncertain') return 'Needs review';
    return '';
  }

  function showCountResult(match) {
    const outcome = resolveOutcome(match);
    return outcome === 'ended_early' || outcome === 'uncertain';
  }

  function needsCountDecision(match) {
    if (!match || typeof match !== 'object') return false;
    if (resolveOutcome(match) === 'paused') return false;
    return completionFromSavedRules(match) !== 'finished';
  }

  function syncAssistedMatch(game) {
    if (!game || typeof game !== 'object') return false;
    game.assistedMatch = appliedLifePreserverRemains(game);
    return game.assistedMatch;
  }

  function recordLifePreserverSpin(game, player, adjustment) {
    if (!game || !player) return game;
    if (!Array.isArray(game.rounds)) game.rounds = [];
    if (!Array.isArray(game.hailMaryUsed)) game.hailMaryUsed = [];
    const alreadyUsed = game.hailMaryUsed.includes(player);
    const alreadySpun = (game.rounds || []).some(round => (
      round && round.hailMaryBonus === true && round.scores && Object.prototype.hasOwnProperty.call(round.scores, player)
    ));
    if (alreadyUsed || alreadySpun) return game;
    const parsed = parseEntryInteger(adjustment);
    const value = parsed.ok ? parsed.value : 0;
    game.rounds.push({ round: 0, scores: { [player]: value }, hailMaryBonus: true });
    game.hailMaryUsed.push(player);
    recomputeTotals(game);
    syncAssistedMatch(game);
    return game;
  }

  function bidFieldPresent(map, player) {
    if (!map || !Object.prototype.hasOwnProperty.call(map, player)) return false;
    const raw = map[player];
    if (raw === undefined || raw === null || String(raw).trim() === '') return false;
    const value = Number(raw);
    return Number.isFinite(value);
  }

  function classifyBidAccuracy(round, player) {
    if (!isPlayedScoringRound(round) || !player) return null;
    if (round.joinBonus && round.joinBonus[player]) return null;
    if (!bidFieldPresent(round.bids, player) || !bidFieldPresent(round.actuals, player)) return null;
    return Number(round.bids[player]) === Number(round.actuals[player]) ? 'exact' : 'miss';
  }

  function matchHasPlayedBid(match) {
    const name = gameName(match);
    if (name !== 'Wizard' && name !== '818') return false;
    return (match && match.rounds || []).some((round) => {
      const names = Object.keys((round && round.bids) || {});
      return names.some((player) => classifyBidAccuracy(round, player));
    });
  }

  function mintGameId() {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
    return `gn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function ensureGameId(game) {
    if (!game || typeof game !== 'object') return null;
    const hasGameId = game.gameId != null && game.gameId !== '';
    const hasId = game.id != null && game.id !== '';
    if (!hasGameId && hasId) game.gameId = game.id;
    else if (hasGameId && !hasId) game.id = game.gameId;
    else if (!hasGameId && !hasId) {
      const minted = mintGameId();
      game.gameId = minted;
      game.id = minted;
    }
    return game.gameId;
  }

  function matchPhase(game) {
    const name = gameName(game);
    if (name === 'Wizard') return (game && game.wizardPhase) || 'bidding';
    if (name === '818') return (game && game.eight18Phase) || 'bidding';
    if (name === 'Rook') return (game && game.rookPhase) || 'bidSetup';
    return 'scoring';
  }

  function matchIdentity(game) {
    if (!game || typeof game !== 'object') return null;
    return {
      gameId: ensureGameId(game),
      round: Number(game.currentRound) || 1,
      phase: matchPhase(game)
    };
  }

  function historyReopenNotice(gameName, blocked) {
    const heat = gameName === 'Beat the Heat';
    const cause = heat
      ? 'That score no longer reaches the heat line.'
      : 'That score no longer finishes the night.';
    const effect = 'The winner is removed and this night drops out of wins and records.';
    return blocked ? `${cause} ${effect} The game on the table stayed put.` : `${cause} ${effect}`;
  }

  function historyReopenWouldReplaceActive(active, edited) {
    if (!active) return false;
    if (edited && active === edited) return false;
    const keyOf = game => {
      if (!game) return '';
      if (game.gameId != null && game.gameId !== '') return String(game.gameId);
      if (game.id != null && game.id !== '') return String(game.id);
      return '';
    };
    const activeKey = keyOf(active);
    const editedKey = keyOf(edited);
    if (!activeKey || !editedKey) return true;
    return activeKey !== editedKey;
  }

  function historicalRoundParticipants(game, round) {
    if (!round || isSyntheticAdjustmentRound(round)) return [];
    const join = round.joinBonus || {};
    const retired = new Set((game && game.retired) || []);
    const seen = new Set();
    const named = [];
    const add = player => {
      if (!player || join[player] || seen.has(player)) return;
      if (retired.has(player)) {
        const bid = round.bids && round.bids[player];
        const actual = round.actuals && round.actuals[player];
        const score = round.scores && round.scores[player];
        if (scoreEntryValueIsBlank(bid) && scoreEntryValueIsBlank(actual) && scoreEntryValueIsBlank(score)) return;
      }
      seen.add(player);
      named.push(player);
    };
    const bids = round.bids || {};
    const actuals = round.actuals || {};
    if (Object.keys(bids).length || Object.keys(actuals).length) {
      Object.keys(bids).forEach(add);
      Object.keys(actuals).forEach(add);
    } else {
      Object.keys(round.scores || {}).forEach(add);
    }
    const roster = game && Array.isArray(game.originalRoster) && game.originalRoster.length
      ? game.originalRoster
      : named;
    const ordered = roster.filter(player => seen.has(player));
    named.forEach(player => {
      if (!ordered.includes(player)) ordered.push(player);
    });
    return ordered;
  }

  function eight18DealerBidViolation(game, round, players) {
    if (gameName(game) !== '818' || !round || !players || !players.length) return null;
    const bids = round.bids || {};
    const known = players.every(player => bidFieldPresent(bids, player));
    if (!known) return null;
    const roundNumber = Number(round.round) || 1;
    const offset = Number(game && game.dealerOffset) || 0;
    const index = ((roundNumber - 1 + offset) % players.length + players.length) % players.length;
    const dealer = players[index];
    const limit = roundTrickLimit(game, roundNumber);
    const others = players.reduce((sum, player) => {
      if (player === dealer) return sum;
      return sum + Number(bids[player]);
    }, 0);
    const forbidden = limit - others;
    if (!Number.isInteger(forbidden) || forbidden < 0 || forbidden > limit) return null;
    if (Number(bids[dealer]) !== forbidden) return null;
    return {
      dealer,
      forbidden,
      message: `Dealer ${dealer} cannot bid ${forbidden} on round ${roundNumber}.`
    };
  }

  function signedScore(value) {
    const n = Number(value) || 0;
    return n >= 0 ? `+${n}` : String(n);
  }

  function lowScoreWins(game) {
    const name = gameName(game);
    return name === 'Five Crowns' || name === 'Beat the Heat';
  }

  // Canasta pairs share one score. Rank the teams, then give every partner that place.
  // Two different team scores are 1st and 2nd, not 1st, 1st, 3rd, 3rd.
  function canastaTeamPlaces(game, players) {
    const name = gameName(game);
    if (name !== 'Hand and Foot' && name !== 'Canasta') return null;
    const sides = game && game.handFoot && Array.isArray(game.handFoot.sides) ? game.handFoot.sides : null;
    if (!sides || !sides.length) return null;
    const teams = sides
      .map((side) => ({
        key: side && side.key ? String(side.key) : '',
        members: (side && side.members || []).filter(Boolean)
      }))
      .filter((side) => side.members.length >= 2);
    if (!teams.length) return null;
    const totals = (game && game.totals) || {};
    const scoreOf = (side) => Number(totals[side.members[0]]) || 0;
    const orderedTeams = teams.slice().sort((a, b) => scoreOf(b) - scoreOf(a));
    const places = {};
    const ordered = [];
    const wanted = Array.isArray(players) && players.length ? new Set(players) : null;
    let cursor = 0;
    while (cursor < orderedTeams.length) {
      const score = scoreOf(orderedTeams[cursor]);
      let end = cursor + 1;
      while (end < orderedTeams.length && scoreOf(orderedTeams[end]) === score) end++;
      const rank = cursor + 1;
      for (let i = cursor; i < end; i++) {
        orderedTeams[i].members.forEach((member) => {
          places[member] = rank;
          if (!wanted || wanted.has(member)) ordered.push(member);
        });
        if (orderedTeams[i].key) {
          places[orderedTeams[i].key] = rank;
          if (wanted && wanted.has(orderedTeams[i].key) && !ordered.includes(orderedTeams[i].key)) {
            ordered.push(orderedTeams[i].key);
          }
        }
      }
      cursor = end;
    }
    if (wanted) {
      players.forEach((player) => {
        if (player && !ordered.includes(player)) ordered.push(player);
      });
    }
    return { ordered, places, ranked: true };
  }

  // The live scoreboard and Home standings both call this. Round 1 stays in
  // roster order with no places. After that, order is the scoreboard sort
  // (win direction, stable ties) and places are dense. A later ruleset can
  // take over by defining matchStandings and lifePreserverWinRuleActive in
  // this file. This does not reorder seats or the dealer.
  function scoreboardStandings(game, players) {
    const list = (Array.isArray(players) ? players : []).filter(Boolean);
    const round = Number(game && game.currentRound) || 1;
    if (round > 1
      && typeof matchStandings === 'function'
      && typeof lifePreserverWinRuleActive === 'function'
      && lifePreserverWinRuleActive(game)) {
      const standing = matchStandings(game);
      const wanted = new Set(list);
      const ordered = (standing.ordered || []).filter((player) => wanted.has(player));
      list.forEach((player) => {
        if (!ordered.includes(player)) ordered.push(player);
      });
      return { ordered, places: standing.places || {}, ranked: true };
    }
    if (round <= 1) return { ordered: list.slice(), places: null, ranked: false };
    const teams = canastaTeamPlaces(game, list);
    if (teams) return { ordered: teams.ordered, places: teams.places, ranked: true };
    const low = lowScoreWins(game);
    const totals = (game && game.totals) || {};
    const ordered = list.slice().sort((a, b) => (
      low
        ? (Number(totals[a]) || 0) - (Number(totals[b]) || 0)
        : (Number(totals[b]) || 0) - (Number(totals[a]) || 0)
    ));
    return { ordered, places: competitionPlaces(ordered, totals), ranked: true };
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
      game.gameOver = false;
      return { over: false, reopened: true, winnersChanged: priorWinners.length > 0, winners: [] };
    }
    const finished = over || !!(before && before.completed);
    if (!finished) {
      return { over: false, reopened: false, winnersChanged: false, winners: priorWinners };
    }
    const next = leadersOf(game);
    game.winners = next.slice();
    game.completed = true;
    game.gameOver = true;
    return {
      over,
      reopened: false,
      winnersChanged: priorWinners.join('\0') !== next.join('\0'),
      winners: next.slice()
    };
  }

  function trickRoundPlayers(game, round) {
    return historicalRoundParticipants(game, round);
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
      const players = trickRoundPlayers(game, round);
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
        const players = trickRoundPlayers(draft, round);
        if (!players.length) return { ok: false, reason: 'invalid', message: 'That round has no bids to correct.' };
        const rawActuals = {};
        players.forEach(player => {
          if (source.actuals && Object.prototype.hasOwnProperty.call(source.actuals, player)) rawActuals[player] = source.actuals[player];
          else rawActuals[player] = round.actuals ? round.actuals[player] : '';
        });
        const rawBids = {};
        players.forEach(player => {
          if (source.bids && Object.prototype.hasOwnProperty.call(source.bids, player)) rawBids[player] = source.bids[player];
          else rawBids[player] = round.bids ? round.bids[player] : '';
        });
        const checkedBids = validateEntries({
          game: draft,
          kind: 'bids',
          roundNumber: round.round,
          players,
          values: rawBids
        });
        if (!checkedBids.ok) return checkedBids;
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
            message: `${entryGameLabel(draft)} round ${round.round} must total ${trickCountLabel(checked.limit)}. This table totals ${balanced.sum}.`
          };
        }
        const dealerBlock = eight18DealerBidViolation(draft, Object.assign({}, round, { bids: checkedBids.values }), players);
        if (dealerBlock) {
          return {
            ok: false,
            reason: 'dealer',
            invalidPlayers: [dealerBlock.dealer],
            limit: checked.limit,
            message: dealerBlock.message
          };
        }
        const bidsChanged = players.some(player => !sameNumber(round.bids && round.bids[player], checkedBids.values[player]));
        const actualsChanged = players.some(player => !sameNumber(round.actuals && round.actuals[player], checked.values[player]));
        if (!bidsChanged && !actualsChanged) return { ok: true, changed: false, noop: true, message: '' };
        const scoreFor = name === 'Wizard' ? wizardRoundScore : eight18RoundScore;
        const nextScores = {};
        players.forEach(player => {
          const fromBid = round.bids ? round.bids[player] : undefined;
          const toBid = checkedBids.values[player];
          const fromActual = round.actuals ? round.actuals[player] : undefined;
          const toActual = checked.values[player];
          const fromScore = round.scores ? round.scores[player] : scoreFor(fromBid, fromActual);
          const toScore = scoreFor(toBid, toActual);
          nextScores[player] = toScore;
          if (!sameNumber(fromBid, toBid) || !sameNumber(fromActual, toActual) || !sameNumber(fromScore, toScore)) {
            changes.push({
              player,
              fromBid: Number(fromBid),
              toBid,
              fromActual: Number(fromActual),
              toActual,
              fromScore: Number(fromScore),
              toScore
            });
          }
        });
        if (!round.bids) round.bids = {};
        if (!round.actuals) round.actuals = {};
        if (!round.scores) round.scores = {};
        players.forEach(player => {
          round.bids[player] = checkedBids.values[player];
          round.actuals[player] = checked.values[player];
          round.scores[player] = nextScores[player];
        });
      } else {
        const rawScores = source.scores || {};
        const players = Object.keys(rawScores);
        if (!players.length) return { ok: false, reason: 'invalid', message: 'Nothing to correct.' };
        if (!round.scores) round.scores = {};
        const editable = {};
        players.forEach(player => {
          const raw = rawScores[player];
          const stored = Object.prototype.hasOwnProperty.call(round.scores, player) ? round.scores[player] : undefined;
          if (scoreEntryValueIsBlank(raw) && historyScoreOrNull(stored) == null) return;
          editable[player] = raw;
        });
        const editPlayers = Object.keys(editable);
        if (!editPlayers.length) return { ok: true, changed: false, noop: true, message: '' };
        const checked = validateEntries({
          game: draft,
          kind: 'scores',
          roundNumber: round.round,
          players: editPlayers,
          values: editable
        });
        if (!checked.ok) return checked;
        editPlayers.forEach(player => {
          const from = Object.prototype.hasOwnProperty.call(round.scores, player) ? round.scores[player] : undefined;
          const to = checked.values[player];
          const fromNumber = historyScoreOrNull(from);
          if (fromNumber !== to) changes.push({ player, from: fromNumber == null ? from : fromNumber, to });
        });
        if (!changes.length) return { ok: true, changed: false, noop: true, message: '' };
        editPlayers.forEach(player => { round.scores[player] = checked.values[player]; });
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
    isUsablePlayerName,
    knownPlayerNames,
    playerSuggestionMatches,
    isCommaJoinedGhost,
    cleanupCommaJoinedGhosts,
    competitionPlaces,
    canastaTeamPlaces,
    entryDigitCap,
    entryDigitLimit,
    unusualEntryFloor,
    entryDigitCount,
    scoreboardStandings,
    isScoringRound,
    scoringRoundCount,
    lifePreserverFollowing,
    lifePreserverLeading,
    lifePreserverHidden,
    applyPlayerNameOnGame,
    participantNames,
    findSharedMatch,
    namesShareMatch,
    wizardRoundScore,
    eight18RoundScore,
    rookHandScores,
    gameName,
    roundTrickLimit,
    trickCountLabel,
    parseEntryInteger,
    playedScoreMustBeNonNegative,
    validateEntries,
    trickTableIsBalanced,
    snapshotMatchState,
    restoreMatchState,
    commitValidatedMutation,
    recomputeTotals,
    ceilingAverage,
    lateJoinInfo,
    missedRoundText,
    recordLateJoin,
    applyScoreEntryKey,
    acceptScoreEntryValue,
    createScoreEntrySession,
    pressScoreEntryKey,
    acceptScoreEntryPlayer,
    selectScoreEntryPlayer,
    scoreEntryValueIsBlank,
    scoreEntryBlankHelper,
    historyScoreOrNull,
    scoreEntryStatus,
    confirmScoreEntryOnNext,
    isCompletedHistoryMatch,
    isFullGame,
    isEndedEarlyMatch,
    expectedFullRoundCount,
    storedRoundTarget,
    storedScoreTarget,
    completionFromSavedRules,
    leaveFinishState,
    legacyCompletion,
    setLegacyReviewApplied,
    legacyReviewAppliedNow,
    setHistoryReview,
    resolveOutcome,
    resultIsCounted,
    isCompleteGame,
    countsForTallies,
    countsForResults,
    countsForScoreMagnitude,
    endedEarlyLabel,
    showCountResult,
    needsCountDecision,
    missingBidsMessage,
    isSyntheticAdjustmentRound,
    isPlayedScoringRound,
    isAssistedMatch,
    syncAssistedMatch,
    recordLifePreserverSpin,
    classifyBidAccuracy,
    matchHasPlayedBid,
    ensureGameId,
    matchIdentity,
    historyReopenNotice,
    historyReopenWouldReplaceActive,
    historicalRoundParticipants,
    eight18DealerBidViolation,
    standingOver,
    leadersOf,
    refreshStanding,
    commitRoundCorrection
  };

  root.BPGScorebook = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
