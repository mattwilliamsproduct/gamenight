(function (root) {
  'use strict';

  const GAME_NAME = 'Hand and Foot';
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 6;
  const ROUNDS = 4;
  const MELDS = Object.freeze([50, 90, 120, 150]);
  // Matt named the inputs, not the point values. These are the usual
  // Hand and Foot amounts: 500 for a canasta, 100 for a red three, and
  // 100 if the foot was never played. The foot amount is not applied
  // unless that side types it. A saved round stores the rates it used.
  const SCORE_DEFAULTS = Object.freeze({
    canastaEach: 500,
    redThreeEach: 100,
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

  function buildSides(roster, format) {
    const names = (roster || []).filter(Boolean);
    const useTeams = format === 'teams' && (names.length === 4 || names.length === 6);
    if (!useTeams) {
      return names.map(name => ({ key: name, members: [name] }));
    }
    const half = names.length / 2;
    return [names.slice(0, half), names.slice(half)].map(members => ({
      key: sideKey(members),
      members: members.slice()
    }));
  }

  function parsePart(raw, nonNegative) {
    if (raw === undefined || raw === null || raw === '' || raw === '-') return 0;
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
    if (!Number.isFinite(n)) return 0;
    return nonNegative ? Math.abs(n) : n;
  }

  function usesStructuredScore(parts) {
    if (!parts || typeof parts !== 'object') return false;
    return ['canastas', 'redThrees', 'footPenalty'].some(function (key) {
      return Object.prototype.hasOwnProperty.call(parts, key);
    });
  }

  function rateOrDefault(parts, key, fallback) {
    if (!parts || parts[key] === undefined || parts[key] === null || parts[key] === '') return fallback;
    return parsePart(parts[key], false);
  }

  // New rounds: canastas × rate + red threes × rate + card points − foot penalty.
  // Older saved rounds have no canasta, red-three, or foot fields, and still
  // use card points + bonuses − cards left.
  function roundScore(parts) {
    if (usesStructuredScore(parts)) {
      const canastas = parsePart(parts.canastas, true);
      const reds = parsePart(parts.redThrees, true);
      const cards = parsePart(parts.cardPoints, false);
      const foot = parsePart(parts.footPenalty, true);
      const canastaEach = rateOrDefault(parts, 'canastaEach', SCORE_DEFAULTS.canastaEach);
      const redEach = rateOrDefault(parts, 'redThreeEach', SCORE_DEFAULTS.redThreeEach);
      return (canastas * canastaEach) + (reds * redEach) + cards - foot;
    }
    const card = parsePart(parts && parts.cardPoints, false);
    const bonus = parsePart(parts && parts.bonuses, false);
    const left = parsePart(parts && parts.cardsLeft, true);
    return card + bonus - left;
  }

  function meldForRound(roundNumber) {
    const n = Number(roundNumber) || 0;
    return Object.prototype.hasOwnProperty.call(MELDS, n - 1) ? MELDS[n - 1] : null;
  }

  // One key per side. A repeated key is still one record, so a merge
  // cannot write the same player twice.
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

  // Records use the side key, including a 0 or a negative total.
  // A teammate's own name is not a second record.
  function recordedKeys(sides, totals) {
    const keys = scoringKeys(sides);
    if (!totals || typeof totals !== 'object') return keys;
    return keys.filter(key => Object.prototype.hasOwnProperty.call(totals, key));
  }

  function isLegacyParts(parts) {
    if (!parts || typeof parts !== 'object' || Array.isArray(parts)) return false;
    if (usesStructuredScore(parts)) return false;
    return !!(parts.legacy || parts.bonuses !== undefined || parts.cardsLeft !== undefined);
  }

  // One named field per input, plus the computed round score.
  // Foot penalty is the points subtracted (0 means none). It is not a
  // separate played/unplayed flag. Rates are stored so a later default
  // does not rewrite this round. A bonuses lump is not written here.
  function persistSideParts(raw) {
    const parts = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
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

  function normalizeMatch(match) {
    if (!match || typeof match !== 'object') return match;
    const copy = JSON.parse(JSON.stringify(match));
    copy.rounds = (copy.rounds || []).map(normalizeRound);
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
    if (!usesStructuredScore(normalized)) return null;
    if (!Object.prototype.hasOwnProperty.call(normalized, field)) return null;
    if (field === 'canastas' || field === 'redThrees' || field === 'footPenalty') {
      return parsePart(normalized[field], true);
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

  function sideKeysForMatch(match) {
    const keys = [];
    const seen = new Set();
    const remember = function (key) {
      if (!key || seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    };
    ((match && match.handFoot && match.handFoot.sides) || []).forEach(function (side) {
      remember(side && side.key);
    });
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
    const sides = match && match.handFoot && match.handFoot.sides;
    if (Array.isArray(sides) && sides.length) {
      return sides.filter(function (side) {
        return side && Array.isArray(side.members) && side.members.indexOf(playerName) !== -1;
      }).map(function (side) { return side.key; });
    }
    const keys = [];
    (match && match.rounds || []).forEach(function (round) {
      const parts = round && round.handFootParts || {};
      const scores = round && round.scores || {};
      if ((Object.prototype.hasOwnProperty.call(parts, playerName) || Object.prototype.hasOwnProperty.call(scores, playerName)) && keys.indexOf(playerName) === -1) {
        keys.push(playerName);
      }
    });
    return keys;
  }

  // A personal total uses the side that player was on, once. A team count
  // is not split across partners. Adding every partner's personal total
  // counts that side again.
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
    MIN_PLAYERS,
    MAX_PLAYERS,
    ROUNDS,
    MELDS,
    SCORE_DEFAULTS,
    usesStructuredScore,
    defaultFormat,
    canSwitchToSingles,
    sideKey,
    buildSides,
    parsePart,
    roundScore,
    persistSideParts,
    persistRound,
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
