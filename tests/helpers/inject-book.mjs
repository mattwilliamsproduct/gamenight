import {
  buildDemoPayload,
  emptyPayload,
  payloadForView,
  writeDemoPayload
} from '../../public/assets/demo-seed.mjs';

function bookForView(view, game) {
  if (view === 'empty-home' || view === 'empty-records') return emptyPayload();
  return payloadForView(view, buildDemoPayload(), game);
}

export async function injectBook(page, book, {persist = true} = {}) {
  await page.addInitScript(({payload, persistOn}) => {
    ['gn_all_players', 'gn_players_v2', 'gn_history', 'gn_profiles', 'gn_current', 'gn_demo_seeded'].forEach((key) => {
      localStorage.removeItem(key);
    });
    if (payload) {
      localStorage.setItem('gn_all_players', JSON.stringify(payload.allPlayers || []));
      localStorage.setItem('gn_players_v2', JSON.stringify(payload.players || []));
      localStorage.setItem('gn_history', JSON.stringify(payload.history || []));
      localStorage.setItem('gn_profiles', JSON.stringify(payload.playerProfiles || {}));
      if (payload.currentGame) localStorage.setItem('gn_current', JSON.stringify(payload.currentGame));
    }
    window.__GN_DEMO_SKIP_PERSIST = persistOn ? false : true;
  }, {payload: book, persistOn: persist});
}

export async function openTestView(page, view, {game, persist = true, path = '/'} = {}) {
  const book = bookForView(view, game);
  await injectBook(page, book, {persist});
  await page.goto(path, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goHome === 'function' || typeof goActiveMatch === 'function', null, {timeout: 20000});
  await page.evaluate(async ({viewId, gameId}) => {
    const {openDemoView} = await import('/assets/demo-seed.mjs');
    if (gameId === 'rook' && window.BPGGames && typeof window.BPGGames.revealHiddenGames === 'function') {
      window.BPGGames.revealHiddenGames('rook');
    }
    openDemoView(viewId);
    document.body.dataset.gnTestView = viewId;
    document.body.dataset.gnTestReady = '1';
  }, {viewId: view, gameId: game || ''});
}

export {writeDemoPayload, bookForView};
