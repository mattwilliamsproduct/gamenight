(function (root) {
  'use strict';

  const KNOWN_GAMES = Object.freeze([
    'Five Crowns',
    'Wizard',
    '818',
    'Flip 7 Vengeance',
    'Beat the Heat',
    'Rook',
    'Hand and Foot'
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
    if (root.BPGGames && typeof root.BPGGames.displayName === 'function') return root.BPGGames.displayName(name);
    if (name === 'Flip 7 Vengeance') return 'Flip 7';
    if (name === 'Hand and Foot') return 'Canasta';
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

  function liveMatch(game) {
    return game && typeof game === 'object' && (game.name || game.game) ? game : null;
  }

  function sameLiveMatch(a, b) {
    const left = liveMatch(a);
    const right = liveMatch(b);
    if (!left || !right) return false;
    const leftId = left.id != null ? left.id : left.gameId;
    const rightId = right.id != null ? right.id : right.gameId;
    if (leftId != null && rightId != null) return String(leftId) === String(rightId);
    const leftName = left.name || left.game;
    const rightName = right.name || right.game;
    return !!(leftName && leftName === rightName);
  }

  function parkLiveMatch(game) {
    const live = liveMatch(game);
    if (!live) return null;
    const parked = Object.assign({}, live);
    parked.game = parked.game || parked.name;
    parked.outcome = 'paused';
    parked.completed = false;
    parked.gameOver = false;
    parked.winners = [];
    parked.countResult = false;
    return parked;
  }

  function mergeBackup(current, incoming) {
    const next = {
      allPlayers: [...(current?.allPlayers || [])],
      players: [...(current?.players || [])],
      history: [...(current?.history || [])],
      playerProfiles: Object.assign({}, current?.playerProfiles || {}),
      currentGame: liveMatch(current?.currentGame),
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
    const incomingHasTable = !!(incoming && Object.prototype.hasOwnProperty.call(incoming, 'currentGame'));
    const incomingLive = incomingHasTable ? liveMatch(incoming.currentGame) : null;
    const localLive = liveMatch(current?.currentGame);
    if (incomingLive && localLive && !sameLiveMatch(localLive, incomingLive)) {
      const parked = parkLiveMatch(localLive);
      const parkedId = parked.id != null ? parked.id : parked.gameId;
      const already = parkedId != null && next.history.some(match => {
        if (!match) return false;
        return String(match.id) === String(parkedId) || String(match.gameId) === String(parkedId);
      });
      if (!already) {
        next.history.unshift(parked);
        added.games += 1;
        const name = parked.game || 'Unknown';
        added.byGame[name] = (added.byGame[name] || 0) + 1;
      }
      added.parked = true;
      next.currentGame = incomingLive;
    } else if (incomingLive) {
      next.currentGame = incomingLive;
    }
    added.device = summarizeHistory(next.history);
    return { next, added };
  }

  function listAdded(currentList, incomingList) {
    const have = new Set((currentList || []).filter(Boolean));
    const added = [];
    (incomingList || []).forEach(name => {
      if (name && !have.has(name) && !added.includes(name)) added.push(name);
    });
    return added;
  }

  function photoOverwriteNames(current, incoming) {
    const cur = current?.playerProfiles || {};
    const inc = incoming?.playerProfiles && typeof incoming.playerProfiles === 'object'
      ? incoming.playerProfiles
      : {};
    return Object.keys(inc).filter(name => {
      const next = inc[name] || {};
      const prev = cur[name] || {};
      const avatarChanged = String(next.avatar || '') !== String(prev.avatar || '');
      const colorChanged = next.color != null && next.color !== prev.color;
      return avatarChanged || colorChanged;
    });
  }

  function restoreChangeLines(current, incoming) {
    const { next, added } = mergeBackup(current, incoming);
    const lines = [];
    const players = listAdded(current?.allPlayers, incoming?.allPlayers);
    lines.push(players.length
      ? `Adds ${players.length} player${players.length === 1 ? '' : 's'}: ${players.join(', ')}.`
      : 'Adds no new players.');
    const seated = listAdded(current?.players, incoming?.players);
    lines.push(seated.length
      ? `Seats ${seated.join(', ')} tonight. People already seated stay seated.`
      : 'Does not change who is seated tonight.');
    lines.push(added.games
      ? `Adds ${added.games} game${added.games === 1 ? '' : 's'}. A game already on this device with the same id stays as it is.`
      : 'Adds no games. A game already on this device with the same id stays as it is.');
    const incomingHasTable = !!(incoming && Object.prototype.hasOwnProperty.call(incoming, 'currentGame'));
    const incomingLive = incomingHasTable ? liveMatch(incoming.currentGame) : null;
    const localLive = liveMatch(current?.currentGame);
    if (incomingLive && localLive && !sameLiveMatch(localLive, incomingLive)) {
      lines.push(`Saves the match on this table, then puts ${incomingLive.name || incomingLive.game} on the table. Neither match is discarded.`);
    } else if (incomingLive && !localLive) {
      lines.push(`Puts ${incomingLive.name || incomingLive.game} on the table.`);
    } else {
      lines.push('Leaves the match on this table. An empty table in the file does not clear it.');
    }
    const photos = photoOverwriteNames(current, incoming);
    lines.push(photos.length
      ? `Overwrites photos for ${photos.join(', ')}.`
      : 'Does not overwrite any photos.');
    if (incoming && Number.isFinite(Number(incoming.uiScale))) {
      lines.push(`Sets text size to ${Number(incoming.uiScale)}.`);
    }
    if (incoming?.prefs && typeof incoming.prefs === 'object') {
      const bits = [];
      if (typeof incoming.prefs.lineupIntro === 'boolean') bits.push(`lineup intro ${incoming.prefs.lineupIntro ? 'on' : 'off'}`);
      if (typeof incoming.prefs.statMontage === 'boolean') bits.push(`path replay ${incoming.prefs.statMontage ? 'on' : 'off'}`);
      if (typeof incoming.prefs.dealerRoll === 'boolean') bits.push(`dealer roll ${incoming.prefs.dealerRoll ? 'on' : 'off'}`);
      if (bits.length) lines.push(`Sets ${bits.join(', ')}.`);
    }
    return { next, added, lines };
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
    mergeCloud,
    restoreChangeLines
  };

  root.BPGBackup = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
