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
    meldForRound,
    scoringKeys,
    recordedKeys,
    totalForSides,
    renameMember
  };

  root.BPGHandFoot = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
