(function (root) {
  'use strict';

  const KNOWN_GAMES = Object.freeze([
    'Five Crowns',
    'Wizard',
    '818',
    'Flip 7 Vengeance',
    'Beat the Heat',
    'Rook'
  ]);

  function gameCounts(history) {
    const counts = {};
    KNOWN_GAMES.forEach(name => { counts[name] = 0; });
    (history || []).forEach(match => {
      const name = match && match.game ? String(match.game) : 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }

  function displayGameName(name) {
    if (name === 'Flip 7 Vengeance') return 'Flip 7';
    return name || 'Unknown';
  }

  function formatGameCounts(counts) {
    const entries = Object.entries(counts || {}).filter(([, n]) => n > 0);
    if (!entries.length) return 'No finished games.';
    return entries
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
      .map(([name, n]) => `${displayGameName(name)} ${n}`)
      .join(' · ');
  }

  function summarizeHistory(history) {
    const counts = gameCounts(history);
    const total = (history || []).length;
    if (!total) {
      return {
        total: 0,
        counts,
        line: 'This copy has no finished games yet.'
      };
    }
    return {
      total,
      counts,
      line: `${total} finished game${total === 1 ? '' : 's'} · ${formatGameCounts(counts)}`
    };
  }

  function buildBackup(state) {
    const history = Array.isArray(state?.history) ? state.history : [];
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      gameCounts: gameCounts(history),
      allPlayers: Array.isArray(state?.allPlayers) ? state.allPlayers : [],
      players: Array.isArray(state?.players) ? state.players : [],
      history,
      playerProfiles: state?.playerProfiles && typeof state.playerProfiles === 'object'
        ? state.playerProfiles
        : {},
      currentGame: Object.prototype.hasOwnProperty.call(state || {}, 'currentGame')
        ? (state.currentGame || null)
        : null,
      prefs: state?.prefs && typeof state.prefs === 'object' ? state.prefs : null,
      uiScale: Number.isFinite(Number(state?.uiScale)) ? Number(state.uiScale) : null
    };
  }

  function parseBackup(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('invalid-backup');
    }
    const hasPlayers = Array.isArray(data.allPlayers) || Array.isArray(data.players);
    const hasHistory = Array.isArray(data.history);
    const hasProfiles = data.playerProfiles && typeof data.playerProfiles === 'object';
    if (!hasPlayers && !hasHistory && !hasProfiles) {
      throw new Error('invalid-backup');
    }
    return data;
  }

  function mergeBackup(current, incoming) {
    const next = {
      allPlayers: [...(current?.allPlayers || [])],
      players: [...(current?.players || [])],
      history: [...(current?.history || [])],
      playerProfiles: Object.assign({}, current?.playerProfiles || {}),
      currentGame: Object.prototype.hasOwnProperty.call(incoming || {}, 'currentGame')
        ? (incoming.currentGame || null)
        : (current?.currentGame || null),
      prefs: incoming?.prefs && typeof incoming.prefs === 'object' ? incoming.prefs : current?.prefs || null,
      uiScale: incoming?.uiScale != null ? incoming.uiScale : current?.uiScale
    };
    const added = {
      players: 0,
      games: 0,
      byGame: gameCounts([]),
      incoming: summarizeHistory(incoming?.history)
    };

    (incoming?.allPlayers || []).forEach(name => {
      if (name && !next.allPlayers.includes(name)) {
        next.allPlayers.push(name);
        added.players += 1;
      }
    });
    (incoming?.players || []).forEach(name => {
      if (name && !next.players.includes(name)) next.players.push(name);
    });

    const seen = new Set(next.history.map(match => match && match.id));
    (incoming?.history || []).forEach(match => {
      if (!match || seen.has(match.id)) return;
      next.history.push(match);
      seen.add(match.id);
      added.games += 1;
      const name = match.game || 'Unknown';
      added.byGame[name] = (added.byGame[name] || 0) + 1;
    });
    if (incoming?.playerProfiles && typeof incoming.playerProfiles === 'object') {
      Object.assign(next.playerProfiles, incoming.playerProfiles);
    }
    added.device = summarizeHistory(next.history);
    return { next, added };
  }

  function mergeCloud(local, remote) {
    if (!remote || typeof remote !== 'object') {
      return mergeBackup(local || {}, {});
    }
    const incoming = Object.assign({}, remote);
    if (local?.currentGame && local.currentGame.name) {
      delete incoming.currentGame;
    }
    return mergeBackup(local || {}, incoming);
  }

  const api = {
    KNOWN_GAMES,
    gameCounts,
    formatGameCounts,
    summarizeHistory,
    buildBackup,
    parseBackup,
    mergeBackup,
    mergeCloud
  };

  root.BPGBackup = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
