(function (root) {
  'use strict';

  const GAME_NAME = 'Hand and Foot';
  // One place for Matt's house rules. Display label is Canasta.
  // Saved game id stays Hand and Foot so older nights still open.
  const CANASTA_RULES = Object.freeze({
    displayName: 'Canasta',
    savedGameId: GAME_NAME,
    cleanCanastaEach: 500,
    dirtyCanastaEach: 300,
    sevensCanastaEach: 1500,
    allowAllWildCanasta: false,
    redThreeEachLow: 100,
    redThreeEachHigh: 200,
    redThreeHighAt: 4,
    goingOutBonus: 100,
    redThreeLeftInFoot: 'manual',
    cardValues: Object.freeze({
      joker: 50,
      two: 20,
      ace: 20,
      faceAndTen: 10,
      nineAndBelow: 5
    }),
    rounds: 4,
    melds: Object.freeze([50, 90, 120, 150]),
    minPlayers: 2,
    maxPlayers: 6,
    winLow: false
  });
  const MIN_PLAYERS = CANASTA_RULES.minPlayers;
  const MAX_PLAYERS = CANASTA_RULES.maxPlayers;
  const ROUNDS = CANASTA_RULES.rounds;
  const MELDS = CANASTA_RULES.melds;
  // Older saves still use one canasta count, a flat red-three rate, or a
  // bonuses lump. Those formulas stay on the saved fields.
  const SCORE_DEFAULTS = Object.freeze({
    cleanCanastaEach: CANASTA_RULES.cleanCanastaEach,
    dirtyCanastaEach: CANASTA_RULES.dirtyCanastaEach,
    redThreeEach: CANASTA_RULES.redThreeEachLow,
    goingOutBonus: CANASTA_RULES.goingOutBonus,
    canastaEach: CANASTA_RULES.cleanCanastaEach,
    footPenalty: 100
  });

  function defaultFormat(count) {
    return count === 4 || count === 6 ? 'teams' : 'singles';
  }

  // 2 players are already 1v1, so teams and singles are the same shape.
  // 4 and 6 are the even tables that can leave the default partnership.
  function canSwitchToSingles(count) {
    return count === 4 || count === 6;
  }

  function sideKey(members) {
    const names = (members || []).filter(Boolean);
    if (names.length <= 1) return names[0] || '';
    if (names.length === 2) return names[0] + ' & ' + names[1];
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  }

  // Adjacent seats: (1,2), (3,4), and for six also (5,6).
  function defaultPairs(roster) {
    const names = (roster || []).filter(Boolean);
    const pairs = [];
    for (let i = 0; i + 1 < names.length; i += 2) pairs.push([names[i], names[i + 1]]);
    return pairs;
  }

  function pairsCover(names, pairs) {
    if (!Array.isArray(pairs) || pairs.length !== names.length / 2) return false;
    const used = new Set();
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!Array.isArray(pair) || pair.length !== 2) return false;
      for (let s = 0; s < 2; s++) {
        const name = pair[s];
        if (!name || used.has(name) || names.indexOf(name) === -1) return false;
        used.add(name);
      }
    }
    return used.size === names.length;
  }

  // 4 players are two pairs. 6 players are three pairs of 2.
  // A custom pair list is used only when every name is in exactly one pair.
  function buildSides(roster, format, pairs) {
    const names = (roster || []).filter(Boolean);
    const useTeams = format === 'teams' && (names.length === 4 || names.length === 6);
    if (!useTeams) {
      return names.map(name => ({ key: name, members: [name] }));
    }
    const chosen = pairsCover(names, pairs) ? pairs : defaultPairs(names);
    return chosen.map(members => ({
      key: sideKey(members),
      members: members.slice()
    }));
  }

  // Moving a player into a seat swaps them with whoever sat there,
  // so every name stays in exactly one pair.
  function swapPairMember(pairs, pairIndex, seat, name) {
    const next = (pairs || []).map(pair => (pair || []).slice());
    if (!next[pairIndex] || (seat !== 0 && seat !== 1)) return next;
    const current = next[pairIndex][seat];
    if (!name || current === name) return next;
    let fromPair = -1;
    let fromSeat = -1;
    next.forEach((pair, i) => {
      pair.forEach((n, s) => {
        if (n === name) {
          fromPair = i;
          fromSeat = s;
        }
      });
    });
    if (fromPair < 0) return next;
    next[fromPair][fromSeat] = current;
    next[pairIndex][seat] = name;
    return next;
  }

  function parsePart(raw, nonNegative) {
    if (raw === undefined || raw === null || raw === '' || raw === '-') return 0;
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
    if (!Number.isFinite(n)) return 0;
    return nonNegative ? Math.abs(n) : n;
  }

  function usesNewBreakdown(parts) {
    if (!parts || typeof parts !== 'object') return false;
    return ['cleanCanastas', 'dirtyCanastas', 'goingOut', 'sevensCanastas'].some(function (key) {
      return Object.prototype.hasOwnProperty.call(parts, key);
    });
  }

  function usesStructuredScore(parts) {
    if (!parts || typeof parts !== 'object') return false;
    if (usesNewBreakdown(parts)) return true;
    return ['canastas', 'canastaPoints', 'redThrees', 'footPenalty'].some(function (key) {
      return Object.prototype.hasOwnProperty.call(parts, key);
    });
  }

  function rateOrDefault(parts, key, fallback) {
    if (!parts || parts[key] === undefined || parts[key] === null || parts[key] === '') return fallback;
    return parsePart(parts[key], false);
  }

  // Typed canasta points win. A round saved before that field existed
  // still uses canastas × the canasta rate, and that product is not added
  // a second time once canasta points are present.
  function canastaPointsOf(parts) {
    if (parts && Object.prototype.hasOwnProperty.call(parts, 'canastaPoints')) {
      return parsePart(parts.canastaPoints, false);
    }
    const canastas = parsePart(parts && parts.canastas, true);
    const canastaEach = rateOrDefault(parts, 'canastaEach', SCORE_DEFAULTS.canastaEach);
    return canastas * canastaEach;
  }

  // Going out is once per side. A typed 2 still pays the bonus one time.
  function wentOut(parts) {
    return parsePart(parts && parts.goingOut, true) > 0 ? 1 : 0;
  }

  // Cards left is the only subtraction on a new round. If that field is
  // absent, an older foot penalty fills the same role. Both are never taken.
  function unplayedCards(parts) {
    if (parts && Object.prototype.hasOwnProperty.call(parts, 'cardsLeft') && usesNewBreakdown(parts)) {
      return parsePart(parts.cardsLeft, true);
    }
    return parsePart(parts && parts.footPenalty, true);
  }

  function usesHouseRedThrees(parts) {
    return !!(parts && (
      Object.prototype.hasOwnProperty.call(parts, 'sevensCanastas')
      || Object.prototype.hasOwnProperty.call(parts, 'redThreeEachLow')
      || Object.prototype.hasOwnProperty.call(parts, 'redThreeEachHigh')
    ));
  }

  // 1–3 red 3s pay the low rate each. 4 or more pay the high rate on every
  // red 3 (4 = 800, 5 = 1,000 with the default 100 / 200).
  function redThreesScore(count, parts) {
    const n = parsePart(count, true);
    if (n <= 0) return 0;
    const highAt = rateOrDefault(parts, 'redThreeHighAt', CANASTA_RULES.redThreeHighAt);
    const each = n >= highAt
      ? rateOrDefault(parts, 'redThreeEachHigh', CANASTA_RULES.redThreeEachHigh)
      : rateOrDefault(parts, 'redThreeEachLow', CANASTA_RULES.redThreeEachLow);
    return n * each;
  }

  function redThreePoints(parts) {
    const count = parsePart(parts && parts.redThrees, true);
    if (usesHouseRedThrees(parts)) return redThreesScore(count, parts);
    return count * rateOrDefault(parts, 'redThreeEach', SCORE_DEFAULTS.redThreeEach);
  }

  function newRoundScore(parts) {
    const clean = parsePart(parts.cleanCanastas, true) * rateOrDefault(parts, 'cleanCanastaEach', SCORE_DEFAULTS.cleanCanastaEach);
    const dirty = parsePart(parts.dirtyCanastas, true) * rateOrDefault(parts, 'dirtyCanastaEach', SCORE_DEFAULTS.dirtyCanastaEach);
    const sevens = parsePart(parts.sevensCanastas, true) * rateOrDefault(parts, 'sevensCanastaEach', CANASTA_RULES.sevensCanastaEach);
    const reds = redThreePoints(parts);
    const going = wentOut(parts) * rateOrDefault(parts, 'goingOutBonus', SCORE_DEFAULTS.goingOutBonus);
    const cards = parsePart(parts.cardPoints, false);
    return clean + dirty + sevens + reds + going + cards - unplayedCards(parts);
  }

  function oldStructuredScore(parts) {
    const reds = parsePart(parts.redThrees, true);
    const cards = parsePart(parts.cardPoints, false);
    const foot = parsePart(parts.footPenalty, true);
    const redEach = rateOrDefault(parts, 'redThreeEach', SCORE_DEFAULTS.redThreeEach);
    return canastaPointsOf(parts) + (reds * redEach) + cards - foot;
  }

  // New rounds: clean × 500 + dirty × 300 + red 3s × 100 + going out
  // + melded card points − cards left.
  // A saved round with one canasta count still uses that older formula.
  // A saved round with none of those fields still uses card points + bonuses − cards left.
  function roundScore(parts) {
    if (usesNewBreakdown(parts)) return newRoundScore(parts);
    if (usesStructuredScore(parts)) return oldStructuredScore(parts);
    const card = parsePart(parts && parts.cardPoints, false);
    const bonus = parsePart(parts && parts.bonuses, false);
    const left = parsePart(parts && parts.cardsLeft, true);
    return card + bonus - left;
  }

  function meldForRound(roundNumber) {
    const n = Number(roundNumber) || 0;
    return Object.prototype.hasOwnProperty.call(MELDS, n - 1) ? MELDS[n - 1] : null;
  }

  // One column per side. A repeated key is still one column.
  function scoringKeys(sides) {
    const keys = [];
    const seen = new Set();
    (sides || []).forEach(side => {
      const key = side && side.key;
      if (!key || seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    });
    return keys;
  }

  // History records are the players. A team total on the side name still
  // counts for every member of that side, once each.
  function recordedKeys(sides, totals) {
    const names = [];
    const seen = new Set();
    (sides || []).forEach(side => {
      const members = side && Array.isArray(side.members) && side.members.length
        ? side.members
        : (side && side.key ? [side.key] : []);
      const sideHasTotal = !!(totals && side && side.key && Object.prototype.hasOwnProperty.call(totals, side.key));
      members.forEach(name => {
        if (!name || seen.has(name)) return;
        const memberHas = !!(totals && Object.prototype.hasOwnProperty.call(totals, name));
        if (totals && !memberHas && !sideHasTotal) return;
        seen.add(name);
        names.push(name);
      });
    });
    return names;
  }

  function isLegacyParts(parts) {
    if (!parts || typeof parts !== 'object' || Array.isArray(parts)) return false;
    if (usesNewBreakdown(parts) || usesStructuredScore(parts)) return false;
    return !!(parts.legacy || parts.bonuses !== undefined || parts.cardsLeft !== undefined);
  }

  // One named field per input, plus the computed round score.
  // Foot penalty is the points subtracted (0 means none). It is not a
  // separate played/unplayed flag. Rates are stored so a later default
  // does not rewrite this round. A bonuses lump is not written here.
  // canastaPoints is stored even when it was derived, so the next read
  // does not multiply the canasta count again.
  function persistSideParts(raw) {
    const parts = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    if (usesNewBreakdown(parts)) {
      const going = wentOut(parts);
      const goingRate = rateOrDefault(parts, 'goingOutBonus', SCORE_DEFAULTS.goingOutBonus);
      const storedNew = {
        cleanCanastas: parsePart(parts.cleanCanastas, true),
        dirtyCanastas: parsePart(parts.dirtyCanastas, true),
        sevensCanastas: parsePart(parts.sevensCanastas, true),
        redThrees: parsePart(parts.redThrees, true),
        goingOut: going,
        goingOutPoints: going * goingRate,
        cardPoints: parsePart(parts.cardPoints, false),
        cardsLeft: unplayedCards(parts),
        cleanCanastaEach: rateOrDefault(parts, 'cleanCanastaEach', SCORE_DEFAULTS.cleanCanastaEach),
        dirtyCanastaEach: rateOrDefault(parts, 'dirtyCanastaEach', SCORE_DEFAULTS.dirtyCanastaEach),
        sevensCanastaEach: rateOrDefault(parts, 'sevensCanastaEach', CANASTA_RULES.sevensCanastaEach),
        redThreeEach: rateOrDefault(parts, 'redThreeEach', SCORE_DEFAULTS.redThreeEach),
        redThreeEachLow: rateOrDefault(parts, 'redThreeEachLow', CANASTA_RULES.redThreeEachLow),
        redThreeEachHigh: rateOrDefault(parts, 'redThreeEachHigh', CANASTA_RULES.redThreeEachHigh),
        redThreeHighAt: rateOrDefault(parts, 'redThreeHighAt', CANASTA_RULES.redThreeHighAt),
        goingOutBonus: goingRate
      };
      storedNew.roundScore = roundScore(storedNew);
      return storedNew;
    }
    if (isLegacyParts(parts)) {
      const legacy = {
        cardPoints: parsePart(parts.cardPoints, false),
        bonuses: parsePart(parts.bonuses, false),
        cardsLeft: parsePart(parts.cardsLeft, true),
        legacy: true
      };
      legacy.roundScore = roundScore(legacy);
      return legacy;
    }
    const stored = {
      canastas: parsePart(parts.canastas, true),
      canastaPoints: canastaPointsOf(parts),
      redThrees: parsePart(parts.redThrees, true),
      footPenalty: parsePart(parts.footPenalty, true),
      cardPoints: parsePart(parts.cardPoints, false),
      canastaEach: rateOrDefault(parts, 'canastaEach', SCORE_DEFAULTS.canastaEach),
      redThreeEach: rateOrDefault(parts, 'redThreeEach', SCORE_DEFAULTS.redThreeEach)
    };
    stored.roundScore = roundScore(stored);
    return stored;
  }

  function persistRound(roundNumber, bySide) {
    const scores = {};
    const handFootParts = {};
    Object.keys(bySide || {}).forEach(function (key) {
      const stored = persistSideParts(bySide[key]);
      handFootParts[key] = stored;
      scores[key] = stored.roundScore;
    });
    return { round: roundNumber, scores: scores, handFootParts: handFootParts };
  }

  // One entry per team. The same breakdown and the same round total are
  // copied onto each teammate. The side name is not also stored, so a
  // later sum of every player key does not have a third copy.
  function persistTeamRound(roundNumber, bySide, sides) {
    const scores = {};
    const handFootParts = {};
    (sides || []).forEach(function (side) {
      if (!side) return;
      const raw = (bySide || {})[side.key];
      if (!raw) return;
      const members = Array.isArray(side.members) && side.members.length ? side.members : [side.key];
      members.forEach(function (name) {
        if (!name) return;
        const stored = persistSideParts(raw);
        handFootParts[name] = stored;
        scores[name] = stored.roundScore;
      });
    });
    return { round: roundNumber, scores: scores, handFootParts: handFootParts };
  }

  // Read path for an already saved side. The scorecard number wins when it
  // is present, so normalizing history does not change a total. Old
  // card/bonuses/cardsLeft rows stay on that formula. Their canasta, red
  // three, and foot counts are left absent, because the bonuses lump cannot
  // be split without inventing them.
  function normalizeSideParts(parts, savedScore) {
    if (!parts || typeof parts !== 'object' || Array.isArray(parts)) return null;
    if (!usesStructuredScore(parts) && !isLegacyParts(parts)) return null;
    const stored = persistSideParts(parts);
    const scorecard = Number(savedScore);
    if (Number.isFinite(scorecard)) stored.roundScore = scorecard;
    else if (parts.roundScore !== undefined && parts.roundScore !== null && parts.roundScore !== '') {
      const saved = Number(parts.roundScore);
      if (Number.isFinite(saved)) stored.roundScore = saved;
    }
    return stored;
  }

  function normalizeRound(round) {
    if (!round || typeof round !== 'object') return round;
    const copy = Object.assign({}, round);
    copy.scores = Object.assign({}, round.scores || {});
    if (!round.handFootParts || typeof round.handFootParts !== 'object') return copy;
    copy.handFootParts = {};
    Object.keys(round.handFootParts).forEach(function (key) {
      const parts = round.handFootParts[key];
      if (!parts || typeof parts !== 'object') return;
      const normalized = normalizeSideParts(parts, copy.scores[key]);
      if (!normalized) return;
      copy.handFootParts[key] = normalized;
      if (!Number.isFinite(Number(copy.scores[key]))) copy.scores[key] = normalized.roundScore;
    });
    return copy;
  }

  function cloneParts(parts) {
    return JSON.parse(JSON.stringify(parts));
  }

  function roundHasPlayer(round, name) {
    if (!round || !name) return false;
    const parts = round.handFootParts || {};
    const scores = round.scores || {};
    return Object.prototype.hasOwnProperty.call(parts, name) || Object.prototype.hasOwnProperty.call(scores, name);
  }

  // Older team rounds stored the one entry on the side name. Copy that
  // breakdown onto each teammate and drop the side name so it is not counted
  // again. Rounds that already have a personal copy are left on the players.
  function fanOutRound(round, sides) {
    const copy = normalizeRound(round);
    if (!copy || !Array.isArray(sides) || !sides.length) return copy;
    const scores = Object.assign({}, copy.scores || {});
    const parts = Object.assign({}, copy.handFootParts || {});
    sides.forEach(function (side) {
      if (!side || !side.key || !Array.isArray(side.members) || side.members.length < 2) return;
      const members = side.members.filter(Boolean);
      const heldBy = members.filter(function (name) { return roundHasPlayer({ scores: scores, handFootParts: parts }, name); });
      const sideParts = parts[side.key];
      const sideScore = scores[side.key];
      const sideHolds = !!sideParts || sideScore !== undefined;
      if (sideHolds && heldBy.length === 0) {
        members.forEach(function (name) {
          if (sideParts) parts[name] = cloneParts(sideParts);
          if (sideScore !== undefined) scores[name] = sideScore;
          else if (parts[name] && parts[name].roundScore !== undefined) scores[name] = parts[name].roundScore;
        });
      }
      if (members.some(function (name) { return roundHasPlayer({ scores: scores, handFootParts: parts }, name); })) {
        delete parts[side.key];
        delete scores[side.key];
      }
    });
    copy.scores = scores;
    copy.handFootParts = parts;
    return copy;
  }

  function fanOutTotals(match, sides) {
    if (!match.totals || typeof match.totals !== 'object' || !Array.isArray(sides)) return;
    sides.forEach(function (side) {
      if (!side || !side.key || !Array.isArray(side.members) || side.members.length < 2) return;
      const sideTotal = match.totals[side.key];
      if (sideTotal === undefined) return;
      const anyMember = side.members.some(function (name) {
        return name && Object.prototype.hasOwnProperty.call(match.totals, name);
      });
      if (!anyMember) {
        side.members.forEach(function (name) {
          if (name) match.totals[name] = sideTotal;
        });
      }
      delete match.totals[side.key];
    });
    if (!Array.isArray(match.winners)) return;
    const next = [];
    match.winners.forEach(function (winner) {
      const side = sides.find(function (item) { return item && item.key === winner && Array.isArray(item.members) && item.members.length > 1; });
      if (side) side.members.forEach(function (name) { if (name && next.indexOf(name) === -1) next.push(name); });
      else if (winner && next.indexOf(winner) === -1) next.push(winner);
    });
    match.winners = next;
  }

  function normalizeMatch(match) {
    if (!match || typeof match !== 'object') return match;
    const copy = JSON.parse(JSON.stringify(match));
    const sides = copy.handFoot && copy.handFoot.sides;
    copy.rounds = (copy.rounds || []).map(function (round) {
      return Array.isArray(sides) && sides.length ? fanOutRound(round, sides) : normalizeRound(round);
    });
    if (Array.isArray(sides) && sides.length) fanOutTotals(copy, sides);
    return copy;
  }

  function isHandFootHistory(match) {
    const name = match && (match.game || match.name);
    return name === GAME_NAME;
  }

  function readStat(parts, field, savedScore) {
    const normalized = parts ? normalizeSideParts(parts, savedScore) : null;
    if (field === 'roundScore') {
      if (normalized && Number.isFinite(Number(normalized.roundScore))) return Number(normalized.roundScore);
      return Number.isFinite(Number(savedScore)) ? Number(savedScore) : null;
    }
    if (!normalized) return null;
    if (field === 'cardPoints') return parsePart(normalized.cardPoints, false);
    if (field === 'canastaPoints' && Object.prototype.hasOwnProperty.call(normalized, 'canastaPoints')) {
      return parsePart(normalized.canastaPoints, false);
    }
    if (!usesStructuredScore(normalized)) return null;
    if (!Object.prototype.hasOwnProperty.call(normalized, field)) return null;
    if (field === 'canastas' || field === 'redThrees' || field === 'footPenalty' || field === 'cleanCanastas' || field === 'dirtyCanastas' || field === 'sevensCanastas' || field === 'goingOut') {
      return parsePart(normalized[field], true);
    }
    if (field === 'cardsLeft' && (usesNewBreakdown(normalized) || normalized.legacy)) {
      return parsePart(normalized.cardsLeft, true);
    }
    if (field === 'goingOutPoints' && Object.prototype.hasOwnProperty.call(normalized, 'goingOutPoints')) {
      return parsePart(normalized.goingOutPoints, true);
    }
    return null;
  }

  function sumFieldForSide(rounds, sideKey, field) {
    const result = { total: 0, roundsRecorded: 0, roundsUnknown: 0 };
    (rounds || []).forEach(function (round) {
      if (!round || round.hailMaryBonus) return;
      const parts = round.handFootParts && round.handFootParts[sideKey];
      const saved = round.scores && round.scores[sideKey];
      const value = readStat(parts, field, saved);
      if (value === null) result.roundsUnknown += 1;
      else {
        result.total += value;
        result.roundsRecorded += 1;
      }
    });
    return result;
  }

  function roundHasKey(round, key) {
    const parts = (round && round.handFootParts) || {};
    const scores = (round && round.scores) || {};
    return Object.prototype.hasOwnProperty.call(parts, key) || Object.prototype.hasOwnProperty.call(scores, key);
  }

  // One key per side. Prefer a teammate's own copy. Fall back to the side
  // name for a save that has not been copied onto the players yet.
  function sideKeysForMatch(match) {
    const sides = match && match.handFoot && match.handFoot.sides;
    if (Array.isArray(sides) && sides.length) {
      const keys = [];
      const seen = new Set();
      sides.forEach(function (side) {
        if (!side) return;
        const members = Array.isArray(side.members) ? side.members.filter(Boolean) : [];
        let chosen = null;
        members.forEach(function (name) {
          if (chosen) return;
          if ((match.rounds || []).some(function (round) { return roundHasKey(round, name); })) chosen = name;
        });
        if (!chosen && side.key && (match.rounds || []).some(function (round) { return roundHasKey(round, side.key); })) {
          chosen = side.key;
        }
        if (!chosen) chosen = members[0] || side.key;
        if (!chosen || seen.has(chosen)) return;
        seen.add(chosen);
        keys.push(chosen);
      });
      return keys;
    }
    const keys = [];
    const seen = new Set();
    const remember = function (key) {
      if (!key || seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    };
    (match && match.rounds || []).forEach(function (round) {
      Object.keys(round && round.handFootParts || {}).forEach(remember);
      Object.keys(round && round.scores || {}).forEach(remember);
    });
    return keys;
  }

  function sumFieldForMatch(match, field) {
    const result = { total: 0, roundsRecorded: 0, roundsUnknown: 0 };
    if (!isHandFootHistory(match)) return result;
    sideKeysForMatch(match).forEach(function (key) {
      const part = sumFieldForSide(match.rounds, key, field);
      result.total += part.total;
      result.roundsRecorded += part.roundsRecorded;
      result.roundsUnknown += part.roundsUnknown;
    });
    return result;
  }

  function sideKeysForPlayer(match, playerName) {
    if (!playerName) return [];
    const own = (match && match.rounds || []).some(function (round) { return roundHasKey(round, playerName); });
    if (own) return [playerName];
    const sides = match && match.handFoot && match.handFoot.sides;
    if (Array.isArray(sides) && sides.length) {
      return sides.filter(function (side) {
        return side && Array.isArray(side.members) && side.members.indexOf(playerName) !== -1;
      }).map(function (side) { return side.key; });
    }
    return [];
  }

  // A personal total reads that player's own copy of the team entry.
  // Both teammates store the same count, so each query returns it once.
  function sumFieldForPlayer(history, playerName, field) {
    const result = { total: 0, roundsRecorded: 0, roundsUnknown: 0 };
    (history || []).forEach(function (match) {
      if (!isHandFootHistory(match)) return;
      sideKeysForPlayer(match, playerName).forEach(function (key) {
        const part = sumFieldForSide(match.rounds, key, field);
        result.total += part.total;
        result.roundsRecorded += part.roundsRecorded;
        result.roundsUnknown += part.roundsUnknown;
      });
    });
    return result;
  }

  function totalForSides(rounds, keys) {
    const totals = {};
    (keys || []).forEach(key => { totals[key] = 0; });
    (rounds || []).forEach(round => {
      (keys || []).forEach(key => {
        const score = Number(round && round.scores && round.scores[key]);
        totals[key] += Number.isFinite(score) ? score : 0;
      });
    });
    return totals;
  }

  // Rebuild side keys after a rename or a merge. Duplicate names on one side collapse.
  function renameMember(config, oldName, newName) {
    if (!config || !oldName || oldName === newName) {
      return { config: config || null, keyMap: {} };
    }
    const previous = config.sides || [];
    const sides = previous.map(side => {
      const seen = new Set();
      const members = [];
      (side.members || []).forEach(member => {
        const name = member === oldName ? newName : member;
        if (!name || seen.has(name)) return;
        seen.add(name);
        members.push(name);
      });
      return { key: sideKey(members), members: members };
    });
    const keyMap = {};
    previous.forEach((side, index) => {
      const nextKey = sides[index] && sides[index].key;
      if (side && side.key && nextKey && side.key !== nextKey) keyMap[side.key] = nextKey;
    });
    const seen = new Set();
    const uniqueSides = [];
    sides.forEach(side => {
      if (!side.key || seen.has(side.key)) return;
      seen.add(side.key);
      uniqueSides.push(side);
    });
    return { config: { format: config.format, sides: uniqueSides }, keyMap: keyMap };
  }

  const api = {
    GAME_NAME,
    CANASTA_RULES,
    MIN_PLAYERS,
    MAX_PLAYERS,
    ROUNDS,
    MELDS,
    SCORE_DEFAULTS,
    redThreesScore,
    usesStructuredScore,
    defaultFormat,
    canSwitchToSingles,
    sideKey,
    defaultPairs,
    buildSides,
    swapPairMember,
    parsePart,
    roundScore,
    persistSideParts,
    persistRound,
    persistTeamRound,
    normalizeSideParts,
    normalizeRound,
    normalizeMatch,
    sumFieldForSide,
    sumFieldForMatch,
    sumFieldForPlayer,
    meldForRound,
    scoringKeys,
    recordedKeys,
    totalForSides,
    renameMember
  };

  root.BPGHandFoot = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
