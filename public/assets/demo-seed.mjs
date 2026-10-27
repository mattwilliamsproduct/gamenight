/* TEMP: demo seed (remove before merge). Preview and localhost only. */
import {cloneScenario, QA_SCENARIOS} from '../qa/fixtures.mjs';

export const DEMO_FLAG = 'gn_demo_seeded';
export const DEMO_VERSION = '4';
export const DEMO_BLOCKED_COPY = 'This device already has history. Demo data was not loaded.';

export const DEMO_VIEW_IDS = [
  'home',
  'active-match',
  'scorecard-fivecrowns',
  'scorecard-wizard',
  'scorecard-818',
  'scorecard-flip7',
  'scorecard-beattheheat',
  'scorecard-rook',
  'entry-fivecrowns',
  'entry-wizard',
  'entry-818',
  'entry-flip7',
  'entry-beattheheat',
  'entry-rook',
  'keypad-8p',
  'lifepreserver',
  'lifepreserver-after',
  'lifepreserver-low',
  'records',
  'records-overview',
  'records-explore',
  'records-nights',
  'records-shame',
  'rook-contract',
  'rook-call',
  'settings',
  'settings-backup',
  'history',
  'profiles',
  'empty-home',
  'empty-records',
  'error-entry',
  'game',
  'bids-wizard',
  'podium-tie',
  'past-night',
  'add-player-m'
];

const WRITE_VIEWS = new Set([
  'entry-fivecrowns',
  'entry-wizard',
  'entry-818',
  'entry-flip7',
  'entry-beattheheat',
  'entry-rook',
  'keypad-8p',
  'lifepreserver',
  'lifepreserver-after',
  'lifepreserver-low',
  'rook-contract',
  'rook-call',
  'settings-backup',
  'error-entry'
]);

const GAME_SCENARIO = {
  fivecrowns: 'demo-seed',
  wizard: 'demo-wizard',
  '818': 'demo-818',
  flip7: 'demo-flip7',
  beattheheat: 'beat-the-heat-close',
  rook: 'rook-bid-setup'
};

function previewHostPattern(){
  return /^.+-mattwilliamsproducts-projects\.vercel\.app$/;
}

export function demoHostAllowed(hostname){
  const host = String(hostname || '');
  if (host === 'cardknight.vercel.app') return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  return previewHostPattern().test(host);
}

function readJson(storage, key){
  try{
    return JSON.parse(storage.getItem(key));
  }catch(error){
    return null;
  }
}

export function deviceHasSavedData(storage){
  const history = readJson(storage, 'gn_history');
  if (Array.isArray(history) && history.length) return true;
  const current = readJson(storage, 'gn_current');
  return !!(current && typeof current === 'object' && current.name);
}

export function isDemoSeeded(storage){
  return storage.getItem(DEMO_FLAG) === DEMO_VERSION;
}

const NEUTRAL_AVATARS = [
  'neutral-01.svg',
  'neutral-02.svg',
  'neutral-03.svg',
  'neutral-04.svg',
  'neutral-05.svg',
  'neutral-06.svg',
  'neutral-07.svg',
  'neutral-08.svg',
  'neutral-09.svg',
  'neutral-10.svg',
  'neutral-11.svg',
  'neutral-12.svg'
];

export function applyNeutralDemoProfiles(data){
  if (!data) return data;
  const names = [...new Set([
    ...(data.allPlayers || []),
    ...(data.players || []),
    ...Object.keys(data.playerProfiles || {})
  ])].filter(Boolean);
  data.playerProfiles = Object.fromEntries(names.map((name, index) => {
    const prev = data.playerProfiles?.[name] || {};
    return [name, {
      avatar: NEUTRAL_AVATARS[index % NEUTRAL_AVATARS.length],
      color: prev.color || ((index % 8) + 1)
    }];
  }));
  return data;
}

export function buildDemoPayload(){
  return applyNeutralDemoProfiles(cloneScenario('demo-seed').data);
}

export function writeDemoPayload(storage, data){
  storage.setItem('gn_all_players', JSON.stringify(data.allPlayers || []));
  storage.setItem('gn_players_v2', JSON.stringify(data.players || []));
  storage.setItem('gn_history', JSON.stringify(data.history || []));
  storage.setItem('gn_profiles', JSON.stringify(data.playerProfiles || {}));
  if (data.currentGame) storage.setItem('gn_current', JSON.stringify(data.currentGame));
  else storage.removeItem('gn_current');
  storage.setItem(DEMO_FLAG, DEMO_VERSION);
}

export function stripDemoSearch(href){
  const url = new URL(href, 'http://local.test');
  url.searchParams.delete('demo');
  url.searchParams.delete('view');
  url.searchParams.delete('game');
  const search = url.searchParams.toString();
  return url.pathname + (search ? `?${search}` : '') + url.hash;
}

export function parseDemoRequest(search, hostname){
  const params = new URLSearchParams(search || '');
  return {
    wantsDemo: params.has('demo'),
    view: params.get('view') || 'home',
    game: params.get('game') || '',
    games: params.get('games') || '',
    lpTable: params.get('lp') || '',
    allowed: demoHostAllowed(hostname)
  };
}

function cloneData(data){
  return JSON.parse(JSON.stringify(data || {}));
}

function scenarioData(id){
  return applyNeutralDemoProfiles(cloneData(cloneScenario(id).data));
}

function gameKey(raw){
  const key = String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key === 'fivecrowns' || key === 'crowns') return 'fivecrowns';
  if (key === 'wizard') return 'wizard';
  if (key === '818' || key === 'eight18') return '818';
  if (key === 'flip7' || key === 'flip7vengeance') return 'flip7';
  if (key === 'beattheheat' || key === 'heat') return 'beattheheat';
  if (key === 'rook') return 'rook';
  if (key === 'handandfoot' || key === 'canasta' || key === 'handfoot') return 'handandfoot';
  return key || '';
}

function displayGameName(key){
  return {
    fivecrowns: 'Five Crowns',
    wizard: 'Wizard',
    '818': '818',
    flip7: 'Flip 7 Vengeance',
    beattheheat: 'Beat the Heat',
    rook: 'Rook',
    handandfoot: 'Hand and Foot'
  }[key] || '';
}

function scenarioIdForGame(key){
  if (GAME_SCENARIO[key]) return GAME_SCENARIO[key];
  const wanted = displayGameName(key).replace(/\s+/g, '').toLowerCase();
  if (!wanted) return '';
  for (const [id, scenario] of Object.entries(QA_SCENARIOS || {})) {
    const live = scenario?.data?.currentGame;
    const name = String(live?.name || live?.game || '').replace(/\s+/g, '').toLowerCase();
    if (name && name === wanted) return id;
  }
  return '';
}

function payloadForGame(key){
  const id = scenarioIdForGame(key);
  if (id) return scenarioData(id);
  return null;
}

function parseTypedView(view){
  const raw = String(view || 'home');
  if (raw.startsWith('scorecard-')) return {kind: 'scorecard', game: gameKey(raw.slice(10))};
  if (raw.startsWith('entry-')) return {kind: 'entry', game: gameKey(raw.slice(6))};
  return {kind: raw, game: ''};
}

function emptyPayload(){
  return {allPlayers: [], players: [], history: [], playerProfiles: {}, currentGame: null};
}

function ensureBannerStyle(){
  if (document.getElementById('demo-seed-style')) return;
  const style = document.createElement('style');
  style.id = 'demo-seed-style';
  style.textContent = `
    #demo-seed-msg{position:sticky;top:0;z-index:240;margin:0;padding:0.7rem 1rem;background:#7a1f1f;color:#fff7ed;font:700 0.92rem/1.35 "Plus Jakarta Sans",sans-serif;text-align:center}
    html.gn-demo-pending body{visibility:hidden}
  `;
  document.head.appendChild(style);
}

export function showDemoBlockedMessage(){
  ensureBannerStyle();
  let el = document.getElementById('demo-seed-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'demo-seed-msg';
    el.setAttribute('role', 'status');
    document.body.prepend(el);
  }
  el.textContent = DEMO_BLOCKED_COPY;
  el.hidden = false;
}

function stripDemoFromLocation(){
  if (!window.history || typeof window.history.replaceState !== 'function') return;
  window.history.replaceState(null, '', stripDemoSearch(location.href));
}

function applyRookCallState(data){
  if (!data.currentGame) return data;
  data.currentGame.rookPhase = 'calling';
  data.currentGame.rookHighBidder = data.currentGame.rookHighBidder || (data.currentGame.originalRoster || [])[0] || 'Megan';
  data.currentGame.rookHighBid = data.currentGame.rookHighBid || 90;
  data.currentGame.rookBidAmountDraft = data.currentGame.rookHighBid;
  return data;
}

function applyRookEntryState(data){
  if (!data.currentGame) return data;
  data.currentGame.rookPhase = 'results';
  data.currentGame.rookHighBidder = data.currentGame.rookHighBidder || (data.currentGame.originalRoster || [])[0] || 'Megan';
  data.currentGame.rookHighBid = data.currentGame.rookHighBid || 90;
  data.currentGame.rookTrump = data.currentGame.rookTrump || 'Red';
  data.currentGame.rookCalledCard = data.currentGame.rookCalledCard || '14 Green';
  data.currentGame.rookPartner = data.currentGame.rookPartner || (data.currentGame.originalRoster || [])[1] || 'Matt';
  return data;
}

function payloadForView(view, base, gameRaw){
  const typed = parseTypedView(view);
  if (view === 'empty-home' || view === 'empty-records') return emptyPayload();
  if (view === 'keypad-8p' || view === 'error-entry') return scenarioData('demo-seed');
  if (view === 'lifepreserver') return scenarioData('eight18-porch-lp');
  if (view === 'lifepreserver-after') return scenarioData('eight18-porch-lp');
  if (view === 'lifepreserver-low') return scenarioData('demo-seed');
  if (view === 'rook-contract') return scenarioData('rook-bid-setup');
  if (view === 'rook-call') return applyRookCallState(scenarioData('rook-bid-setup'));
  if (view === 'bids-wizard') return scenarioData('demo-wizard');
  if (view === 'podium-tie') return scenarioData('wizard-tied-places');
  if (view === 'past-night') return scenarioData('home-party');
  if (view === 'add-player-m') return scenarioData('five-crowns-comeback');
  if (view === 'game' || typed.kind === 'game') {
    return payloadForGame(gameKey(gameRaw) || 'fivecrowns') || cloneData(base);
  }
  if (typed.kind === 'scorecard' && GAME_SCENARIO[typed.game]) return scenarioData(GAME_SCENARIO[typed.game]);
  if (typed.kind === 'entry' && typed.game === 'rook') return applyRookEntryState(scenarioData('rook-bid-setup'));
  if (typed.kind === 'entry' && GAME_SCENARIO[typed.game]) return scenarioData(GAME_SCENARIO[typed.game]);
  return cloneData(base);
}

function openRecordsPane(pane){
  if (typeof showHistory === 'function') showHistory();
  if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') {
    window.BPGSlice2.setRecordsPane(pane);
    return;
  }
  const ids = {overview: 'slice2-show-fame', explore: 'slice2-show-shame', nights: 'slice2-show-nights'};
  document.getElementById(ids[pane] || ids.overview)?.click();
}

function readLiveGame(){
  return (typeof window !== 'undefined' && window.BPGDemoLiveGame && window.BPGDemoLiveGame()) || null;
}

function openDemoView(view){
  const typed = parseTypedView(view);
  if (view === 'empty-home' || view === 'home') {
    if (typeof goHome === 'function') goHome();
    return;
  }
  if (view === 'empty-records' || view === 'records' || view === 'records-overview') {
    openRecordsPane('overview');
    return;
  }
  if (view === 'records-shame' || view === 'records-explore') {
    openRecordsPane('explore');
    return;
  }
  if (view === 'records-nights') {
    openRecordsPane('nights');
    return;
  }
  if (view === 'history') {
    if (typeof navigateTo === 'function') navigateTo('history-screen');
    if (typeof renderHistoryList === 'function') renderHistoryList();
    if (typeof switchTab === 'function') switchTab('history-list-view');
    return;
  }
  if (view === 'profiles') {
    if (typeof showProfiles === 'function') showProfiles();
    return;
  }
  if (view === 'settings' || view === 'settings-backup') {
    if (typeof openSettings === 'function') openSettings();
    if (view === 'settings-backup') {
      document.getElementById('backup-device-summary')?.scrollIntoView({block: 'center'});
    }
    return;
  }
  if (view === 'active-match' || typed.kind === 'scorecard' || view === 'rook-contract') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    return;
  }
  if (view === 'rook-call') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    const game = readLiveGame();
    const bidder = game?.rookHighBidder || 'Megan';
    const bid = game?.rookHighBid || 90;
    if (typeof openRookCallModal === 'function') openRookCallModal(bidder, bid);
    return;
  }
  if (view === 'entry-rook') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    if (typeof openRookResultsModal === 'function') openRookResultsModal();
    return;
  }
  if (typed.kind === 'entry' || view === 'keypad-8p' || view === 'error-entry') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
    if (view === 'error-entry' && typeof showScoreEntryError === 'function') {
      showScoreEntryError('Five Crowns scores must be 0 or more.');
    }
    return;
  }
  if (view === 'lifepreserver') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    if (typeof authorizeHailMary === 'function') authorizeHailMary('Cat');
    return;
  }
  if (view === 'lifepreserver-low') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    if (typeof authorizeHailMary === 'function') authorizeHailMary('Linda');
    return;
  }
  if (view === 'bids-wizard') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    const game = readLiveGame();
    if (game) game.wizardPhase = 'bidding';
    if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
    return;
  }
  if (view === 'podium-tie') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    document.documentElement.classList.add('s2-standings-only');
    return;
  }
  if (view === 'past-night') {
    if (typeof goHome === 'function') goHome();
    const match = (typeof history !== 'undefined' && Array.isArray(history)) ? history[0] : null;
    if (match && typeof openScorecard === 'function') openScorecard(match.id);
    return;
  }
  if (view === 'add-player-m') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    if (typeof addPlayerMidGame === 'function') addPlayerMidGame();
    const input = document.getElementById('midgame-add-player-input');
    if (input) {
      input.value = 'm';
      if (typeof updatePlayerSuggestions === 'function') updatePlayerSuggestions('midgame');
    }
    return;
  }
  if (view === 'game') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    return;
  }
  if (view === 'lifepreserver-after') {
    if (typeof goActiveMatch === 'function') goActiveMatch();
    if (typeof authorizeHailMary === 'function') authorizeHailMary('Cat');
    if (typeof showLifePreserverResult === 'function') {
      const game = readLiveGame();
      const before = Number(game?.totals?.Cat);
      const beforeTotal = Number.isFinite(before) ? before : 41;
      showLifePreserverResult({
        player: 'Cat',
        label: '+20 · Help',
        adj: 20,
        beforeTotal,
        total: beforeTotal + 20,
        beforePlace: 3,
        place: 2,
        winLow: false,
        leaderGapBefore: 39,
        leaderGapAfter: 19
      });
    }
    if (typeof openModal === 'function') openModal('wheel-modal');
    return;
  }
  if (typeof goHome === 'function') goHome();
}

export function decideDemoAction({hostname, search, storage}){
  const req = parseDemoRequest(search, hostname);
  if (!req.wantsDemo) return {status: 'idle', view: '', persist: false, blocked: false, payload: null};
  if (!req.allowed) return {status: 'ignored', view: req.view, persist: false, blocked: false, payload: null};
  const view = DEMO_VIEW_IDS.includes(req.view) ? req.view : 'home';
  const isolatedEmpty = view === 'empty-home' || view === 'empty-records';
  if (isolatedEmpty) {
    return {status: 'empty', view, persist: false, blocked: false, payload: emptyPayload()};
  }
  const seeded = isDemoSeeded(storage);
  const demoDevice = !!storage.getItem(DEMO_FLAG);
  const hasData = deviceHasSavedData(storage);
  if (hasData && !demoDevice) {
    return {status: 'blocked', view, persist: false, blocked: true, payload: null};
  }
  if (seeded && hasData) {
    const live = {
      allPlayers: readJson(storage, 'gn_all_players') || [],
      players: readJson(storage, 'gn_players_v2') || [],
      history: readJson(storage, 'gn_history') || [],
      playerProfiles: readJson(storage, 'gn_profiles') || {},
      currentGame: readJson(storage, 'gn_current')
    };
    return {status: 'seeded', view, persist: false, blocked: false, payload: payloadForView(view, live, req.game), game: req.game};
  }
  const base = buildDemoPayload();
  return {status: 'seeded', view, persist: true, blocked: false, payload: payloadForView(view, base, req.game), seed: base, game: req.game};
}

function viewUsesLiveSeed(view){
  return view === 'home'
    || view === 'active-match'
    || view === 'records'
    || view === 'records-overview'
    || view === 'records-explore'
    || view === 'records-nights'
    || view === 'records-shame'
    || view === 'history'
    || view === 'profiles'
    || view === 'settings'
    || view === 'settings-backup';
}

export async function bootDemoSeed(api){
  const action = decideDemoAction({
    hostname: api.hostname,
    search: api.search,
    storage: api.storage
  });
  const req = parseDemoRequest(api.search, api.hostname);
  if (req.lpTable === 'proposed' && typeof window !== 'undefined') {
    window.BPG_LP_TABLE = 'proposed';
  }
  if (action.status === 'idle' || action.status === 'ignored') {
    api.ready?.(action.status, action.view || '', action.game || req.game || '');
    return action;
  }

  const blockedWrite = action.blocked && WRITE_VIEWS.has(action.view);
  if (action.persist && action.seed) writeDemoPayload(api.storage, action.seed);

  if (action.status === 'empty') {
    api.skipPersist?.(true);
    api.applyState(action.payload);
  } else if (!action.blocked && action.payload) {
    if (!action.persist || !viewUsesLiveSeed(action.view)) api.skipPersist?.(true);
    api.applyState(action.payload);
  }

  if (action.blocked) showDemoBlockedMessage();
  stripDemoFromLocation();

  action.open = () => {
    if (blockedWrite) {
      if (typeof goHome === 'function') goHome();
    } else {
      openDemoView(action.view);
    }
    api.ready?.(action.status, action.view, action.game || '');
  };
  return action;
}
