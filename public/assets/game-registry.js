(function (root) {
  'use strict';

  const GAMES = Object.freeze([
    Object.freeze({ id: 'Five Crowns', title: 'Five Crowns', art: 'five', line: '11 rounds · Lowest total wins', detail: function () { return '11 rounds'; }, winLow: true, hidden: false }),
    Object.freeze({ id: '818', title: '818', art: '818', line: '15 rounds · Highest total wins', detail: function () { return '15 rounds'; }, winLow: false, hidden: false }),
    Object.freeze({ id: 'Wizard', title: 'Wizard', art: 'wizard', line: 'Highest total wins', detail: function (count) { return Math.max(1, Math.floor(60 / Math.max(count, 1))) + ' rounds'; }, winLow: false, hidden: false }),
    Object.freeze({ id: 'Flip 7 Vengeance', title: 'Flip 7', art: 'flip7', line: 'Highest total wins · Open match', detail: function () { return 'Open match'; }, winLow: false, hidden: false }),
    Object.freeze({ id: 'Beat the Heat', title: 'Beat the Heat', art: 'heat', line: 'Lowest heat wins · Ends at 66', detail: function () { return 'Ends at 66'; }, winLow: true, hidden: false }),
    Object.freeze({ id: 'Hand and Foot', title: 'Canasta', art: 'canasta', line: '4 rounds · Highest total wins', detail: function () { return '4 rounds'; }, winLow: false, hidden: false, demoKey: 'canasta' }),
    Object.freeze({ id: 'Rook', title: 'Rook', art: 'rook', line: 'Highest total wins · Teams', detail: function () { return 'Teams'; }, winLow: false, hidden: true, demoKey: 'rook' })
  ]);

  const DEMO_GAMES_KEY = 'gn_demo_games';

  function searchParams(search) {
    try {
      return new URLSearchParams(search == null ? (typeof location !== 'undefined' ? location.search : '') : search);
    } catch (error) {
      return new URLSearchParams();
    }
  }

  function storedDemoGames() {
    try {
      if (typeof sessionStorage === 'undefined') return '';
      return sessionStorage.getItem(DEMO_GAMES_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function rememberDemoGames(search) {
    const params = searchParams(search);
    if (!params.has('demo')) return storedDemoGames();
    const games = params.get('games') || '';
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (games) sessionStorage.setItem(DEMO_GAMES_KEY, games);
        else sessionStorage.removeItem(DEMO_GAMES_KEY);
      }
    } catch (error) {
      /* ignore quota / private-mode */
    }
    return games;
  }

  function isDemo(search) {
    return searchParams(search).has('demo');
  }

  function demoGameKeys(search) {
    const fromUrl = searchParams(search).get('games') || '';
    if (fromUrl) return fromUrl;
    return storedDemoGames();
  }

  function gameById(id) {
    return GAMES.find(function (game) { return game.id === id; }) || null;
  }

  function isHiddenGameVisible(game, search) {
    if (!game) return false;
    if (!game.hidden) return true;
    rememberDemoGames(search);
    if (!isDemo(search) && !storedDemoGames()) return false;
    const keys = demoGameKeys(search).split(',').map(function (key) { return key.trim().toLowerCase(); }).filter(Boolean);
    const demoKey = String(game.demoKey || game.id || '').toLowerCase();
    const idKey = String(game.id || '').toLowerCase();
    return keys.indexOf(demoKey) !== -1 || keys.indexOf(idKey) !== -1;
  }

  function visibleGames(search) {
    rememberDemoGames(search);
    return GAMES.filter(function (game) { return isHiddenGameVisible(game, search); });
  }

  function displayName(id) {
    if (id === 'Flip 7') return 'Flip 7';
    const game = gameById(id);
    return (game && game.title) || id || 'Unknown';
  }

  function winLow(id) {
    const game = gameById(id);
    if (game) return !!game.winLow;
    return id === 'Five Crowns' || id === 'Beat the Heat';
  }

  const api = {
    GAMES,
    gameById,
    visibleGames,
    isHiddenGameVisible,
    displayName,
    winLow,
    isDemo,
    demoGameKeys,
    rememberDemoGames
  };

  root.BPGGames = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
