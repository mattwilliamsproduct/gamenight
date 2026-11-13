(function (root) {
  'use strict';

  const GAMES = Object.freeze([
    Object.freeze({ id: 'Five Crowns', title: 'Five Crowns', art: 'five', line: '11 rounds · Lowest total wins', detail: function () { return '11 rounds'; }, winLow: true, hidden: false, players: { min: 1, max: 7 } }),
    Object.freeze({ id: '818', title: '818', art: '818', line: '15 rounds · Highest total wins', detail: function () { return '15 rounds'; }, winLow: false, hidden: false, players: { min: 1 } }),
    Object.freeze({ id: 'Wizard', title: 'Wizard', art: 'wizard', line: 'Highest total wins', detail: function (count) { return Math.max(1, Math.floor(60 / Math.max(count, 1))) + ' rounds'; }, winLow: false, hidden: false, players: { min: 1 } }),
    Object.freeze({ id: 'Flip 7 Vengeance', title: 'Flip 7', art: 'flip7', line: 'Highest total wins. Plays to 200.', detail: function () { return 'Plays to 200'; }, winLow: false, hidden: false, players: { min: 1 } }),
    Object.freeze({ id: 'Beat the Heat', title: 'Beat the Heat', art: 'heat', line: 'Lowest heat wins · Ends at 66', detail: function () { return 'Ends at 66'; }, winLow: true, hidden: false, players: { min: 1 } }),
    Object.freeze({ id: 'Hand and Foot', title: 'Canasta', art: 'canasta', line: '4 rounds · Highest total wins', detail: function () { return '4 rounds'; }, winLow: false, hidden: false, demoKey: 'canasta', players: { min: 2, max: 6 } }),
    Object.freeze({ id: 'Rook', title: 'Rook', art: 'rook', line: 'Highest total wins · Teams', detail: function () { return 'Teams'; }, winLow: false, hidden: false, demoKey: 'rook', players: { min: 4 } })
  ]);

  const DEMO_GAMES_KEY = 'gn_demo_games';
  let extraHiddenKeys = '';

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

  function rememberDemoGames() {
    return extraHiddenKeys || storedDemoGames();
  }

  function revealHiddenGames(keys) {
    extraHiddenKeys = String(keys || '');
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (extraHiddenKeys) sessionStorage.setItem(DEMO_GAMES_KEY, extraHiddenKeys);
        else sessionStorage.removeItem(DEMO_GAMES_KEY);
      }
    } catch (error) {
      /* ignore quota / private-mode */
    }
    return extraHiddenKeys;
  }

  function isDemo() {
    return false;
  }

  function demoGameKeys(search) {
    const fromUrl = searchParams(search).get('games') || '';
    if (fromUrl) return fromUrl;
    return storedDemoGames();
  }

  function gameById(id) {
    return GAMES.find(function (game) { return game.id === id; }) || null;
  }

  function isHiddenGameVisible(game) {
    if (!game) return false;
    if (!game.hidden) return true;
    const keys = (extraHiddenKeys || storedDemoGames()).split(',').map(function (key) { return key.trim().toLowerCase(); }).filter(Boolean);
    const demoKey = String(game.demoKey || game.id || '').toLowerCase();
    const idKey = String(game.id || '').toLowerCase();
    return keys.indexOf(demoKey) !== -1 || keys.indexOf(idKey) !== -1;
  }

  function visibleGames() {
    return GAMES.filter(function (game) { return isHiddenGameVisible(game); });
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

  function seatLimit(id, count, gate) {
    const game = gameById(id);
    const title = (game && game.title) || id || 'This game';
    const range = (game && game.players) || { min: 1 };
    const min = range.min == null ? 1 : range.min;
    const max = range.max == null ? null : range.max;
    const seated = Number(count) || 0;
    if (seated < min) {
      const need = min - seated;
      const message = title + ' needs at least ' + min + ' players. Seat ' + need + ' more.';
      if (gate === 'seat') return { ok: true, message: '' };
      return { ok: false, message: message };
    }
    const extra = seatExtra(id, seated);
    if (extra > 0) {
      return { ok: false, message: title + ' plays up to ' + max + '. Unseat ' + extra + ' player' + (extra === 1 ? '' : 's') + '.' };
    }
    return { ok: true, message: '' };
  }

  // One count for every "Unseat N" message: seated minus the game's max, never below 0.
  function seatExtra(id, count) {
    const game = gameById(id);
    const max = game && game.players && game.players.max != null ? game.players.max : null;
    if (max == null) return 0;
    return Math.max(0, (Number(count) || 0) - max);
  }

  // Note under the add-player list. Over the max it is the same message as the start bar;
  // exactly at the max it says the table is full instead of asking for an unseat.
  function seatRoomMessage(id, count) {
    if (seatExtra(id, count) > 0) return seatLimit(id, count).message;
    const game = gameById(id);
    const max = game && game.players && game.players.max != null ? game.players.max : null;
    if (max != null && (Number(count) || 0) >= max) {
      return ((game && game.title) || id) + ' plays up to ' + max + '. The table is full.';
    }
    return '';
  }

  const CARD_FACES = Object.freeze({
    five: './assets/cards/five-crowns.webp',
    '818': './assets/cards/818.webp',
    wizard: './assets/cards/wizard.webp',
    flip7: './assets/cards/flip7.webp',
    heat: './assets/cards/beat-the-heat.webp',
    canasta: './assets/cards/canasta.webp',
    rook: './assets/cards/rook.webp'
  });

  function cardFace(art) {
    return CARD_FACES[art] || '';
  }

  function thumbnailSrc(id) {
    const game = gameById(id);
    return cardFace(game && game.art) || '';
  }

  function thumbnailHtml(id, className) {
    const src = thumbnailSrc(id);
    if (!src) return '';
    const cls = className || 's2-game-thumb';
    return '<img class="' + cls + '" src="' + src + '" alt="" draggable="false">';
  }

  const api = {
    GAMES,
    CARD_FACES,
    cardFace,
    thumbnailSrc,
    thumbnailHtml,
    gameById,
    visibleGames,
    isHiddenGameVisible,
    displayName,
    winLow,
    seatLimit,
    seatExtra,
    seatRoomMessage,
    isDemo,
    demoGameKeys,
    rememberDemoGames,
    revealHiddenGames
  };

  root.BPGGames = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
