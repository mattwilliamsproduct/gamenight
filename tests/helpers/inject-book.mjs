import {
  buildDemoPayload,
  emptyPayload,
  payloadForView,
  writeDemoPayload
} from './demo-seed.mjs';

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
  await page.evaluate(({viewId, gameId}) => {
    if (gameId === 'rook' && window.BPGGames && typeof window.BPGGames.revealHiddenGames === 'function') {
      window.BPGGames.revealHiddenGames('rook');
    }
    const readStoredGame = () => {
      try {
        return JSON.parse(localStorage.getItem('gn_current'));
      } catch (error) {
        return null;
      }
    };
    const openRecordsPane = (pane) => {
      if (typeof showHistory === 'function') showHistory();
      if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') {
        window.BPGSlice2.setRecordsPane(pane);
        return;
      }
      const ids = {overview: 'slice2-show-fame', explore: 'slice2-show-shame', nights: 'slice2-show-nights'};
      document.getElementById(ids[pane] || ids.overview)?.click();
    };
    const raw = String(viewId || 'home');
    const kind = raw.startsWith('scorecard-') ? 'scorecard' : raw.startsWith('entry-') ? 'entry' : raw;
    if (viewId === 'empty-home' || viewId === 'home') {
      if (typeof goHome === 'function') goHome();
    } else if (viewId === 'empty-records' || viewId === 'records' || viewId === 'records-overview') {
      openRecordsPane('overview');
    } else if (viewId === 'records-shame' || viewId === 'records-explore') {
      openRecordsPane('explore');
    } else if (viewId === 'records-nights') {
      openRecordsPane('nights');
    } else if (viewId === 'history') {
      if (typeof navigateTo === 'function') navigateTo('history-screen');
      if (typeof renderHistoryList === 'function') renderHistoryList();
      if (typeof switchTab === 'function') switchTab('history-list-view');
    } else if (viewId === 'profiles') {
      if (typeof showProfiles === 'function') showProfiles();
    } else if (viewId === 'settings' || viewId === 'settings-backup') {
      if (typeof openSettings === 'function') openSettings();
      if (viewId === 'settings-backup') {
        document.getElementById('backup-device-summary')?.scrollIntoView({block: 'center'});
      }
    } else if (viewId === 'active-match' || viewId === 'demo-path' || kind === 'scorecard' || viewId === 'rook-contract') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
    } else if (viewId === 'rook-call') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      const game = readStoredGame();
      if (typeof openRookCallModal === 'function') openRookCallModal(game?.rookHighBidder || 'Megan', game?.rookHighBid || 90);
    } else if (viewId === 'entry-rook') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      if (typeof openRookResultsModal === 'function') openRookResultsModal();
    } else if (kind === 'entry' || viewId === 'keypad-8p' || viewId === 'error-entry') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
      if (viewId === 'error-entry' && typeof showScoreEntryError === 'function') {
        showScoreEntryError('Five Crowns scores must be 0 or more.');
      }
    } else if (viewId === 'lifepreserver') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      if (typeof authorizeHailMary === 'function') authorizeHailMary('Cat');
    } else if (viewId === 'lifepreserver-low') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      if (typeof authorizeHailMary === 'function') authorizeHailMary('Linda');
    } else if (viewId === 'bids-wizard') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
    } else if (viewId === 'podium-tie') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      document.documentElement.classList.add('s2-standings-only');
    } else if (viewId === 'past-night') {
      if (typeof goHome === 'function') goHome();
      let match = null;
      try {
        const stored = JSON.parse(localStorage.getItem('gn_history') || '[]');
        match = Array.isArray(stored) ? stored[0] : null;
      } catch (error) {
        match = null;
      }
      if (match && typeof openScorecard === 'function') openScorecard(match.id);
    } else if (viewId === 'add-player-m') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      if (typeof addPlayerMidGame === 'function') addPlayerMidGame();
      const input = document.getElementById('midgame-add-player-input');
      if (input) {
        input.value = 'm';
        if (typeof updatePlayerSuggestions === 'function') updatePlayerSuggestions('midgame');
      }
    } else if (viewId === 'game') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
    } else if (viewId === 'lifepreserver-after') {
      if (typeof goActiveMatch === 'function') goActiveMatch();
      if (typeof authorizeHailMary === 'function') authorizeHailMary('Cat');
      if (typeof showLifePreserverResult === 'function') {
        const game = readStoredGame();
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
    } else if (typeof goHome === 'function') {
      goHome();
    }
    document.body.dataset.gnTestView = viewId;
    document.body.dataset.gnTestReady = '1';
  }, {viewId: view, gameId: game || ''});
}

export {writeDemoPayload, bookForView};
