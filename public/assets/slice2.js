/* Warm Porch Ledger interactions. Always loaded. */
(function () {
  const PICKER_FACES = {
    ...((window.BPGGames && BPGGames.CARD_FACES) || {
      '818': './assets/cards/818.webp',
      flip7: './assets/cards/flip7.webp',
      heat: './assets/cards/beat-the-heat.webp',
      canasta: './assets/cards/canasta.webp',
      rook: './assets/cards/rook.webp'
    }),
    five: './assets/cards/five-crowns-picker.webp',
    wizard: './assets/cards/wizard-picker.webp',
    flip7: './assets/cards/flip7-picker.webp',
    heat: './assets/cards/beat-the-heat-picker.webp'
  };

  function registryGames() {
    return (window.BPGGames && BPGGames.visibleGames()) || [];
  }

  const HOME_PICKER_ORDER = ['Five Crowns', 'Wizard', 'Hand and Foot', 'Flip 7 Vengeance', 'Beat the Heat', '818'];
  function homePickerGames() {
    const gamesById = new Map(registryGames().map((game) => [game.id, game]));
    return HOME_PICKER_ORDER.map((id) => gamesById.get(id)).filter(Boolean);
  }

  function cardAriaLabel(game, seated, selected) {
    const title = game.title || game.id;
    const detail = String(game.detail(seated) || '').toLowerCase();
    let summary;
    if (game.id === 'Beat the Heat') summary = `lowest heat wins, ${detail}`;
    else if (game.id === 'Rook') summary = 'highest total wins, teams';
    else if (game.id === 'Flip 7 Vengeance') summary = 'highest total wins, first to 200';
    else if (game.winLow) summary = `lowest total wins, ${detail}`;
    else summary = `highest total wins, ${detail}`;
    return `${title}, ${summary}${selected ? ', selected' : ''}`;
  }

  function displayGameName(id) {
    if (window.BPGGames && typeof BPGGames.displayName === 'function') return BPGGames.displayName(id);
    if (id === 'Hand and Foot') return 'Canasta';
    if (id === 'Flip 7 Vengeance') return 'Flip 7';
    return id || 'Match';
  }

  let selected = 'Five Crowns';
  let recordsPane = 'overview';
  let recordsGameFilter = '';
  let recordsPlayerFilter = '';
  let recordsPairFilter = '';
  const expandedNights = new Set();
  let wired = false;
  let seatPointer = null;
  let seatGrab = null;
  let anotherStep = null;
  let anotherParkOk = false;
  let unfinishedOpen = false;
  let addPicks = new Set();

  function state() {
    return slice2TableState();
  }

  function coerceMatchId(value) {
    if (value == null || value === '') return null;
    const raw = String(value);
    const asNum = Number(raw);
    return Number.isFinite(asNum) && String(asNum) === raw ? asNum : raw;
  }

  function gameMeta(id) {
    const games = registryGames();
    return games.find((game) => game.id === id) || window.BPGGames?.gameById(id) || games[0];
  }

  function dealerOf(table) {
    if (table.currentGame) return getCurrentDealerName(table.currentGame);
    return table.players[0] || '';
  }

  function liveRoundLabel(game) {
    const maxR = getMaxRoundsForGame(game);
    const round = shownRound(game, maxR);
    if (maxR && maxR < 900) return `Round ${round} of ${maxR}`;
    return `Round ${round}`;
  }

  function anotherMatchCopy(game) {
    const name = displayGameName(game && game.name);
    return `${name} (${liveRoundLabel(game)}) will be saved as unfinished. You can resume it later.`;
  }

  function historyAsGame(match) {
    return {
      name: (match && (match.game || match.name)) || '',
      currentRound: match && match.currentRound,
      maxRounds: match && match.maxRounds,
      originalRoster: (match && match.originalRoster) || []
    };
  }

  function unfinishedMatches(history) {
    return (history || [])
      .filter((match) => window.BPGScorebook && !BPGScorebook.isCompletedHistoryMatch(match))
      .slice()
      .sort((a, b) => (Number(b.parkedAt) || Number(b.id) || 0) - (Number(a.parkedAt) || Number(a.id) || 0));
  }

  function clearAnotherMatch() {
    anotherStep = null;
    anotherParkOk = false;
  }

  function takeAnotherParkOk() {
    const ok = anotherParkOk;
    if (ok) clearAnotherMatch();
    return ok;
  }

  function standingRows(game) {
    const roster = (typeof getRecordedPlayers === 'function' ? getRecordedPlayers(game) : getActivePlayers(game)).slice();
    const standing = window.BPGScorebook.scoreboardStandings(game, roster);
    const dealer = getCurrentDealerName(game);
    const ranked = standing.ordered.map((player) => {
      const place = standing.ranked ? standing.places[player] : null;
      const label = place ? homePlaceLabel(place) : '';
      const tone = place === 1 ? ' is-place-1' : place === 2 ? ' is-place-2' : place === 3 ? ' is-place-3' : (place ? ' is-place-rest' : '');
      const score = Number(game.totals && game.totals[player]) || 0;
      const isDealer = player === dealer;
      const badge = label
        ? `<span class="scoreboard-rank-badge${tone}">${escapeHtml(label)}</span>`
        : '<span class="s2-standing-unranked" aria-hidden="true"></span>';
      const dealerTag = isDealer
        ? '<span class="s2-dealer-tag">Dealer</span>'
        : '<span class="s2-dealer-tag s2-dealer-tag-empty" aria-hidden="true"></span>';
      const wheel = lifePreserverStatus(game, player);
      const wheelLabel = wheel ? wheelCopy()[wheel] : '';
      const spoken = [label, player, String(score), isDealer ? 'dealer' : '', wheelLabel].filter(Boolean).join(', ');
      return `<button type="button" class="s2-standing" data-s2-action="resume" data-s2-player="${escapeHtml(player)}" aria-label="${escapeHtml(spoken)}">
        ${badge}
        ${getStreakAvatarHtml(player, 'avatar-img')}
        <span class="s2-seat-who"><span class="s2-seat-name">${escapeHtml(player)}</span></span>
        <span class="s2-standing-status">
          ${dealerTag}
          ${wheel ? `<span class="wheel-badge wheel-badge-${wheel}" aria-hidden="true">${wheelIconSvg()}</span>` : ''}
        </span>
        <span class="s2-standing-score">${escapeHtml(String(score))}</span>
      </button>`;
    }).join('');
    const left = (game.retired || []).filter((player) => player && !standing.ordered.includes(player));
    const leftRows = left.map((player) => {
      const score = Number(game.totals && game.totals[player]) || 0;
      const spoken = ['Left early', player, String(score)].join(', ');
      return `<button type="button" class="s2-standing" data-s2-action="resume" data-s2-player="${escapeHtml(player)}" aria-label="${escapeHtml(spoken)}">
        <span class="scoreboard-rank-badge is-place-rest">Left early</span>
        ${getStreakAvatarHtml(player, 'avatar-img')}
        <span class="s2-seat-who"><span class="s2-seat-name">${escapeHtml(player)}</span></span>
        <span class="s2-standing-status" aria-hidden="true"></span>
        <span class="s2-standing-score">${escapeHtml(String(score))}</span>
      </button>`;
    }).join('');
    return ranked + leftRows;
  }

  function wheelCopy() {
    return window.BPGLifePreserver && BPGLifePreserver.BACK_PORCH_WHEEL;
  }

  function wheelIconSvg() {
    return '<svg class="wheel-badge-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 4v3"></path><path d="M12 17v3"></path><path d="M4 12h3"></path><path d="M17 12h3"></path></svg>';
  }

  function lifePreserverStatus(game, player) {
    const copy = wheelCopy();
    if (!copy || !game || !['Five Crowns', 'Wizard', '818', 'Flip 7 Vengeance'].includes(game.name) || typeof isHailMaryEligible !== 'function') return '';
    const used = (game.hailMaryUsed || []).includes(player);
    if (used) {
      return 'used';
    }
    const table = typeof getActivePlayers === 'function' ? getActivePlayers(game) : [];
    if (isHailMaryEligible(game, player, table, { gameOver: false })) {
      return 'ready';
    }
    return '';
  }

  function leaderBit(game) {
    if (!game || (game.currentRound || 1) <= 1 || !window.BPGScorebook) return '';
    const roster = typeof getRecordedPlayers === 'function' ? getRecordedPlayers(game) : getActivePlayers(game);
    if (!roster.length) return '';
    const standing = BPGScorebook.scoreboardStandings(game, roster);
    if (!standing.ranked || !standing.ordered.length) return '';
    const name = standing.ordered[0];
    return `Leader: ${name} (${game.totals[name] || 0} pts)`;
  }

  function matchSubtitle(game) {
    const bits = [];
    if (game.name === 'Five Crowns') {
      const wilds = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const wild = wilds[(game.currentRound || 1) - 1];
      if (wild) bits.push(`${wild}s wild`);
    }
    const dealer = getCurrentDealerName(game);
    if (dealer) bits.push(`${dealer} dealing`);
    const lead = leaderBit(game);
    if (lead) bits.push(lead);
    return bits.join(' · ');
  }

  function boardTitle(game) {
    return displayGameName(game.name);
  }

  function shownRound(game, maxR) {
    if (typeof isMatchOver === 'function' && isMatchOver(game) && maxR && maxR < 900) return maxR;
    return game.currentRound;
  }

  function boardLine(game) {
    const bits = [boardTitle(game)];
    const maxR = getMaxRoundsForGame(game);
    const round = shownRound(game, maxR);
    if (isEight18Game(game)) {
      const tricks = getRoundTrickCount(game);
      bits.push(`Round ${round} of ${maxR} (${tricks} trick${tricks === 1 ? '' : 's'})`);
    } else if (game.name === 'Wizard') {
      // Round line filled below when bids are in for a short single header.
      if (!(isBidTrickGame(game) && !isMatchOver(game) && getBidTrickPhase(game) === 'scoring')) {
        bits.push(`Round ${round} of ${maxR}`);
      }
    } else if (game.name === 'Five Crowns') {
      bits.push(`Round ${round} of ${maxR}`);
    } else if (maxR && maxR < 900) {
      bits.push(`Round ${round} of ${maxR}`);
    } else {
      bits.push(`Round ${round}`);
    }
    if (isBidTrickGame(game) && !isMatchOver(game)) {
      const phase = getBidTrickPhase(game);
      const tricks = getRoundTrickCount(game);
      const table = getActivePlayers(game);
      if (phase === 'scoring') {
        const sum = table.reduce((total, player) => total + (parseInt(game.currentBids?.[player], 10) || 0), 0);
        const delta = sum - tricks;
        const trickWord = tricks === 1 ? 'trick' : 'tricks';
        let note;
        if (delta === 0) note = 'exact';
        else if (delta > 0) note = `${delta} over`;
        else note = `${Math.abs(delta)} under`;
        if (game.name === 'Wizard') {
          bits.push(`Round ${round} of ${maxR} · ${tricks} ${trickWord} · bids total ${sum} (${note})`);
        } else {
          bits.push(`${tricks} ${trickWord} · bids total ${sum} (${note})`);
        }
      }
    }
    return bits.join(' · ');
  }

  function boardSubLine(game) {
    const bits = [];
    if (game.name === 'Five Crowns') {
      const wilds = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const wild = wilds[(game.currentRound || 1) - 1];
      if (wild) bits.push({ text: `${wild}s\u00a0wild`, kind: 'wild' });
    }
    const dealer = getCurrentDealerName(game);
    if (dealer) bits.push({ text: `Dealer:\u00a0${dealer}`, kind: 'dealer' });
    // Bidding context reads from across the room: who deals, and that bids are due for N tricks.
    if (isBidTrickGame(game) && !isMatchOver(game) && getBidTrickPhase(game) === 'bidding') {
      const tricks = getRoundTrickCount(game);
      bits.push({ text: `Bidding\u00a0·\u00a0${tricks}\u00a0${tricks === 1 ? 'trick' : 'tricks'} this round`, kind: 'bidding' });
    }
    return bits;
  }

  function phoneScoreboard() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 760px)').matches);
  }

  function enterLabel(game) {
    const round = game.currentRound;
    if (isMatchOver(game)) return 'Match complete';
    if (isBidTrickGame(game)) {
      const bidding = getBidTrickPhase(game) === 'bidding';
      if (phoneScoreboard()) return bidding ? 'Enter bids' : 'Enter tricks';
      return bidding ? `Enter round ${round} bids` : `Enter round ${round} tricks`;
    }
    return 'Enter scores';
  }

  function eligibleLifePreserverPlayers() {
    const { currentGame } = state();
    if (!currentGame) return [];
    const table = getActivePlayers(currentGame);
    if (isMatchOver(currentGame)) return [];
    return table.filter((player) => isHailMaryEligible(currentGame, player, table, { gameOver: false }));
  }

  function firstEligible() {
    return eligibleLifePreserverPlayers()[0] || null;
  }

  function andList(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  }

  function boardBarMarkup() {
    return `<div class="s2-board-identity">
        <img class="s2-board-mark" src="./assets/logo/back-porch-wordmark.png" alt="Back Porch Games" width="320" height="113">
        <span class="s2-board-rule" aria-hidden="true"></span>
        <button type="button" class="s2-btn s2-table-btn" id="slice2-table-btn" data-s2-action="table">Home</button>
        <div class="s2-board-copy">
          <div class="s2-board-title-row">
            <p id="slice2-board-line"></p>
            <p id="slice2-board-sub"></p>
          </div>
          <p id="slice2-score-legend"></p>
          <p id="slice2-score-note"></p>
        </div>
      </div>
      <div class="s2-board-actions">
        <button type="button" class="s2-btn s2-btn-primary" id="slice2-enter-btn" data-s2-action="enter-round"></button>
      </div>`;
  }

  function parkBoardChrome() {
    const actions = document.querySelector('#slice2-board-bar .s2-board-actions');
    const table = document.getElementById('slice2-table-btn');
    if (table) {
      table.textContent = 'Home';
      table.title = 'Leave the scorecard and go Home. The match stays on Resume.';
      table.setAttribute('aria-label', 'Home. Leaves the scorecard without ending the match.');
    }
    const endBtn = document.querySelector('#actions-menu .match-end-btn');
    if (endBtn) {
      endBtn.title = 'Leave game. Save for later, end the game, or keep playing.';
    }
    if (!actions) return;
    const menuWrap = document.querySelector('#game-screen .active-match-actions');
    if (menuWrap && menuWrap.parentElement !== actions) actions.appendChild(menuWrap);
  }

  function paintNav() {
    if (typeof updateNavButton === 'function') updateNavButton();
    const row = document.querySelector('#top-nav > div');
    const actions = row?.children?.[1];
    if (!actions) return;
    document.getElementById('slice2-saved')?.remove();
    const phoneNav = window.matchMedia('(max-width: 760px)').matches;
    const compactNav = window.matchMedia('(max-width: 1023px)').matches;
    actions.querySelectorAll('.nav-btn').forEach((button) => {
      const action = button.getAttribute('onclick') || '';
      if (action.includes('goHome')) button.textContent = 'Home';
      // No count here: the number mixed counted, uncounted and unfinished games and read like a record count.
      if (action.includes('showHistory')) button.textContent = 'Records';
      if (action.includes('showProfiles')) button.textContent = phoneNav || !compactNav ? 'Player Passports' : 'Profiles';
      if (action.includes('openSettings')) button.textContent = phoneNav || !compactNav ? 'Settings' : '⚙';
      button.classList.toggle('s2-nav-on', action.includes('goHome') && !document.getElementById('home-screen')?.classList.contains('hidden'));
    });
    parkSaveIndicator();
  }

  function ensureSaveIndicator() {
    let el = document.getElementById('save-indicator');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'save-indicator';
    el.textContent = '✓ Saved on this device';
    document.body.appendChild(el);
    return el;
  }

  function parkSaveIndicator() {
    const el = ensureSaveIndicator();
    if (window.__GN_DEMO_SKIP_PERSIST) {
      el.hidden = true;
      return;
    }
    // Only after a real save (or a blocked one, which warns). Never on a fresh load.
    const saveState = window.__bpSaveState || 'none';
    el.hidden = saveState === 'none';
    const game = document.getElementById('game-screen');
    const row = document.querySelector('#slice2-board-bar .s2-board-line-row');
    const onBoard = !!(game && !game.classList.contains('hidden') && row);
    if (onBoard) {
      if (el.parentElement !== row) row.appendChild(el);
      return;
    }
    const tableHead = document.querySelector('#slice2-home .s2-home-table .s2-panel-head');
    if (tableHead) {
      if (el.parentElement !== tableHead) tableHead.appendChild(el);
      return;
    }
    if (el.parentElement !== document.body) document.body.appendChild(el);
  }

  // Setup: the avatar is the Edit button (name, avatar, color, delete). Visible pencil, no hover needed.
  function avatarEditButton(player) {
    return `<button type="button" class="s2-avatar-edit" data-s2-action="edit-player" data-s2-player="${escapeHtml(player)}" aria-label="Edit ${escapeHtml(player)}">${getStreakAvatarHtml(player, 'avatar-img')}<span class="s2-edit-badge" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M10.6 2.6l2.8 2.8L6 12.8l-3.4.6.6-3.4z"/></svg></span></button>`;
  }

  function benchSelectionState(seated) {
    const count = addPicks.size;
    const games = window.BPGGames;
    const max = games?.seatLimit?.(selected, seated + count, 'seat');
    const room = games?.seatLimit?.(selected, seated + count + 1, 'seat');
    return {
      label: count ? `Add ${count} player${count === 1 ? '' : 's'}` : 'Add player',
      disabled: count > 0 && max?.ok === false,
      canAddMore: room?.ok !== false,
      note: games?.seatRoomMessage?.(selected, seated + count) || max?.message || room?.message || 'No room for another player.'
    };
  }

  function addPlayerPickerMarkup(bench, seated, seatsHtml) {
    const selection = benchSelectionState(seated);
    const rows = bench.map((player) => {
      const on = addPicks.has(player);
      const blocked = !on && !selection.canAddMore;
      return `<label class="s2-pick${on ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}">
        <input type="checkbox" data-s2-action="pick-add" data-s2-player="${escapeHtml(player)}" aria-label="${escapeHtml(player)}"${on ? ' checked' : ''}${blocked ? ' disabled' : ''}>
        ${avatarEditButton(player)}
        <span class="s2-pick-name">${escapeHtml(player)}</span>
        <span class="s2-pick-mark" aria-hidden="true">${on ? '✓' : ''}</span>
      </label>`;
    }).join('');
    // Seated vs not seated read as two labelled groups (Matt, Nov 15).
    const maxSeats = window.BPGGames?.gameById?.(selected)?.maxPlayers;
    const benchHint = selection.canAddMore
      ? 'Check names, then Add'
      : (Number.isFinite(maxSeats) ? `Table full (${maxSeats} max)` : 'Table full');
    const benchHtml = bench.length
      ? `<h3 class="s2-roster-label" id="s2-bench-label">On the bench <span class="s2-roster-count">${bench.length}</span><span class="s2-roster-hint">${escapeHtml(benchHint)}</span></h3><div class="s2-pick-list" role="group" aria-labelledby="s2-bench-label">${rows}</div>`
      : (seated ? '<p class="s2-sub">All saved players are seated.</p>' : '');
    // Tonight's table: seats and bench share one roster that scrolls inside
    // the panel on a laptop; Add stays below it, outside the scroll.
    const rosterHtml = seatsHtml == null
      ? benchHtml
      : `<div class="s2-roster" tabindex="0" role="region" aria-label="Seated and saved players">${seated ? `<h3 class="s2-roster-label" id="s2-seated-label">Ready to play <span class="s2-roster-count">${seated}</span></h3>` : ''}${seatsHtml}${benchHtml}</div><button type="button" class="s2-roster-more" data-s2-action="roster-more" hidden></button>`;
    return `<div class="s2-picker">
      ${!seated && !bench.length ? '' : rosterHtml}
      <p class="s2-sub s2-limit-note"${selection.canAddMore ? ' hidden' : ''}>${escapeHtml(selection.canAddMore ? '' : selection.note)}</p>
      <form class="s2-add" data-s2-action="add-form">
        <div class="player-suggest-wrap">
          <input id="quick-add-player" type="text" placeholder="Add someone new" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Add a player"
            oninput="updatePlayerSuggestions('home'); window.BPGSlice2 && BPGSlice2.filterAddPicker(this.value)"
            onfocus="updatePlayerSuggestions('home')"
            onblur="hidePlayerSuggestionsSoon('home')"
            onkeydown="handlePlayerSuggestKey(event,'home')">
          <div id="home-player-suggestions" class="player-suggest-menu hidden"></div>
        </div>
        <button type="submit" class="s2-btn s2-btn-primary" ${selection.disabled ? 'disabled' : ''}>${escapeHtml(selection.label)}</button>
      </form>
    </div>`;
  }

  function filterAddPicker(query) {
    const q = String(query || '').trim().toLowerCase();
    document.querySelectorAll('.s2-pick').forEach((row) => {
      const name = (row.querySelector('.s2-pick-name')?.textContent || '').toLowerCase();
      row.hidden = !!(q && !name.includes(q));
    });
  }

  function unfinishedBannerMarkup(open) {
    if (!open.length) return '';
    const top = open[0];
    const label = displayGameName(top.game || top.name);
    const round = liveRoundLabel(historyAsGame(top));
    return `<section class="s2-banner s2-unfinished-banner">
      <div class="s2-active-copy">
        <div class="s2-kicker">${escapeHtml((window.BPGScorebook && BPGScorebook.GAME_STATUS_LABELS && BPGScorebook.GAME_STATUS_LABELS.unfinished) || 'Unfinished')}</div>
        <h2>Resume unfinished: ${escapeHtml(label)} · ${escapeHtml(round)}</h2>
      </div>
      <div class="s2-banner-actions">
        <button type="button" class="s2-btn s2-btn-primary" data-s2-action="night-resume" data-s2-id="${escapeHtml(String(top.id || ''))}" aria-label="Resume unfinished ${escapeHtml(label)}">Resume</button>
      </div>
    </section>`;
  }

  function paintHome() {
    const home = document.getElementById('home-screen');
    if (!home) return;
    let root = document.getElementById('slice2-home');
    if (!root) {
      root = document.createElement('div');
      root.id = 'slice2-home';
      root.className = 's2-home';
      home.appendChild(root);
    }
    const table = state();
    if (!table.currentGame) clearAnotherMatch();
    const dealer = dealerOf(table);
    const picker = homePickerGames();
    if (!picker.some((game) => game.id === selected)) selected = picker[0]?.id || 'Five Crowns';
    const meta = gameMeta(selected);
    const live = table.currentGame;
    const seated = live ? getActivePlayers(live).length : table.players.length;
    const bench = table.allPlayers.filter((player) => !table.players.includes(player));
    addPicks = new Set([...addPicks].filter(player => bench.includes(player)));
    const banner = table.currentGame ? (() => {
      const game = table.currentGame;
      const maxR = getMaxRoundsForGame(game);
      const title = maxR && maxR < 900
        ? `Resume ${displayGameName(game.name)} · Round ${game.currentRound} of ${maxR} · ${getActivePlayers(game).length} players`
        : `Resume ${displayGameName(game.name)} · Round ${game.currentRound} · ${getActivePlayers(game).length} players`;
      return `<section class="s2-banner s2-active-banner">
        <div class="s2-active-copy">
          <div class="s2-kicker">Active match</div>
          <h2>${escapeHtml(title)}</h2>
          <p class="s2-sub">${escapeHtml(matchSubtitle(game))}</p>
        </div>
        <div class="s2-banner-actions">
          <button type="button" class="s2-btn s2-btn-primary" data-s2-action="resume">Resume</button>
        </div>
      </section>`;
    })() : unfinishedBannerMarkup(unfinishedMatches(table.history));
    // A long word shrinks to the seat width (about 0.56em per letter) so names wrap between words, not mid-word.
    const seatNameFit = (name) => {
      const longestWord = Math.max(0, ...String(name || '').split(/\s+/).map((word) => word.length));
      return longestWord < 8 ? 'class="s2-seat-name"' : `class="s2-seat-name is-fit" style="--fit-em:${(longestWord * 0.56).toFixed(2)}"`;
    };
    const seats = table.players.map((player, index) => {
      const tag = player === dealer ? `<span class="s2-dealer-tag">${table.currentGame ? 'Dealer' : 'Deals first'}</span>` : '';
      return `<article class="s2-seat" data-s2-index="${index}" data-s2-player="${escapeHtml(player)}">
        <span class="s2-seat-num">${index + 1}</span>
        ${avatarEditButton(player)}
        <span class="s2-seat-who">
          <span ${seatNameFit(player)}>${escapeHtml(player)}</span>
          ${tag}
        </span>
        <div class="s2-seat-tools">
          <button type="button" class="s2-seat-out" data-s2-action="seat-out" data-s2-index="${index}" aria-label="Unseat ${escapeHtml(player)} and move to the bench" title="Move to the bench">Bench</button>
          <button type="button" class="s2-seat-handle" data-s2-action="seat-handle" data-s2-index="${index}" aria-label="Reorder ${escapeHtml(player)}">
            <svg viewBox="0 0 12 16" aria-hidden="true"><circle cx="4" cy="3" r="1.3"/><circle cx="8" cy="3" r="1.3"/><circle cx="4" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="4" cy="13" r="1.3"/><circle cx="8" cy="13" r="1.3"/></svg>
          </button>
        </div>
      </article>`;
    }).join('');
    const cards = picker.map((game) => {
      const on = game.id === selected;
      return `<button type="button" class="s2-game${on ? ' is-selected' : ''}" data-s2-action="pick-game" data-s2-game="${escapeHtml(game.id)}" aria-pressed="${on}" aria-label="${escapeHtml(cardAriaLabel(game, seated, on))}">
        <span class="s2-card-frame" data-card-art="${escapeHtml(game.art)}">
          <img class="s2-card-photo" src="${PICKER_FACES[game.art] || ''}" alt="" draggable="false">
          ${on ? '<span class="s2-card-check" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 10.5l3.2 3.2L15 6.8"/></svg></span>' : ''}
        </span>
        <span class="s2-game-name">${escapeHtml(game.title)}</span>
      </button>`;
    }).join('');
    const emptyTable = !seated && !bench.length;
    const tableBlock = `<section class="s2-panel s2-home-table${emptyTable ? ' s2-home-empty' : ''}" aria-label="Tonight's table">
          <div class="s2-panel-head">
            <div>
              <h2>Tonight's table</h2>
              ${emptyTable
                ? `<p class="s2-sub" id="slice2-empty-table">Add a name to seat tonight's table. Then pick a game and tap Start.</p>`
                : dealer ? `<p class="s2-sub">${escapeHtml(dealer)} deals first</p>` : ''}
            </div>
          </div>
          <p id="slice2-seat-live" class="s2-seat-live" aria-live="polite"></p>
          ${addPlayerPickerMarkup(bench, seated, `<div class="s2-seat-grid">${seats}</div>`)}
          <p id="home-player-name-error" class="hidden inline-form-error text-sm font-semibold" style="color:var(--rose);"></p>
        </section>`;
    const limit = window.BPGGames && typeof BPGGames.seatLimit === 'function'
      ? BPGGames.seatLimit(selected, seated)
      : { ok: true, message: '' };
    const startSummary = limit.ok
      ? `${seated} ${seated === 1 ? 'player' : 'players'} · ${meta.detail(seated)}`
      : limit.message + (live ? ' Save the active match for later to change seats.' : '');
    const startBlock = `<section class="s2-panel s2-home-start" aria-label="Start a new match">
          <div class="s2-panel-head">
            <div>
              <h2>Start a new match</h2>
              <p class="s2-sub">${live
                ? 'You’ll be asked to save the active match before starting another.'
                : (seated ? `Choose a game for tonight's ${seated} seated ${seated === 1 ? 'player' : 'players'}` : 'Add players, pick a game, then tap start')}</p>
            </div>
            <label class="s2-rules-picker">
              <select class="bp-select s2-rules-select" data-s2-action="game-rules" aria-label="Game instructions">
                <option value="">Game instructions</option>
                ${picker.map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(game.title)}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="s2-game-grid">${cards}</div>
          <div class="s2-startbar">
            <p id="slice2-start-summary">${escapeHtml(startSummary)}</p>
            ${live && !limit.ok ? '<button type="button" class="s2-btn" data-s2-action="leave-active">Leave active match</button>' : ''}
            <button type="button" class="s2-btn${live ? ' s2-btn-start-secondary' : ' s2-btn-primary'}" id="slice2-start-btn" data-s2-action="start-game"${limit.ok ? '' : ' disabled'}>Start ${escapeHtml(meta.title)}</button>
          </div>
        </section>`;
    const liveBench = live ? getKnownPlayerNames().filter(player =>
      !live.originalRoster?.some(seat => seat.toLowerCase() === player.toLowerCase())) : [];
    const liveBenchMarkup = liveBench.length ? `<ul class="s2-live-bench-list">
      ${liveBench.map(name => `<li class="s2-live-bench-seat">${getStreakAvatarHtml(name, 'avatar-img')}<span>${escapeHtml(name)}</span></li>`).join('')}
      </ul>` : '<p class="s2-sub">Nobody on the bench</p>';
    const standings = live ? `<section class="s2-panel s2-home-table s2-home-standings" ${anotherStep === 'confirm' ? '' : 'data-s2-action="resume"'} aria-label="Current standings">
          <div class="s2-panel-head">
            <div>
              <h2>Current standings</h2>
              <p class="s2-sub">${escapeHtml(displayGameName(live.name))} · ${escapeHtml(liveRoundLabel(live))}</p>
            </div>
          </div>
          <div class="s2-standings${seated <= 4 ? ' s2-standings-roomy' : ''}" tabindex="0" role="region" aria-label="Standings and bench">
            ${standingRows(live)}
            <section class="s2-live-bench" aria-label="On the bench"><h3>On the bench</h3>${liveBenchMarkup}</section>
          </div>
          <div class="s2-standings-foot">
            <button type="button" class="s2-btn s2-btn-quiet s2-standings-more" data-s2-action="standings-more" hidden></button>
            <button type="button" class="s2-btn s2-btn-primary" data-s2-action="enter-round"${typeof isMatchOver === 'function' && isMatchOver(live) ? ' disabled' : ''}>Enter scores</button>
          </div>
        </section>` : '';
    const ask = live && anotherStep === 'confirm'
      ? `<div class="s2-another-layer" data-s2-action="another-cancel">
          <section class="s2-panel s2-another-ask bp-modal-panel bp-modal-panel--confirm" role="dialog" aria-labelledby="s2-another-title">
            <h2 id="s2-another-title">Start another match?</h2>
            <p>${escapeHtml(anotherMatchCopy(live))}</p>
            <div class="s2-another-actions">
              <button type="button" class="s2-btn s2-btn-quiet" data-s2-action="another-cancel">Cancel</button>
              <button type="button" class="s2-btn s2-btn-primary" data-s2-action="another-confirm">Save and start</button>
            </div>
          </section>
        </div>`
      : '';
    const left = live ? standings : tableBlock;
    root.innerHTML = `${banner}<div class="s2-home-grid">${left}${startBlock}</div>${ask}`;
    restoreSeatGrab(root);
    parkSaveIndicator();
    wireStandingsMore(root);
    wireRoster(root);
  }

  // The laptop roster scrolls inside Tonight's table. A soft fade on the edge
  // that has more players says so; whole rows snap into place.
  function rosterScroller(roster) {
    // Laptop: the whole roster scrolls. Phone: the page scrolls and only the
    // bench list does, so the cue follows whichever one actually scrolls.
    const list = roster.querySelector('.s2-pick-list');
    if (roster.scrollHeight > roster.clientHeight + 1) return roster;
    if (list && list.scrollHeight > list.clientHeight + 1) return list;
    return roster;
  }

  function syncRoster(roster) {
    if (!roster) return;
    const scroller = rosterScroller(roster);
    const scrolls = scroller.scrollHeight > scroller.clientHeight + 1;
    roster.classList.toggle('s2-roster-more-below', scroller === roster && scrolls && roster.scrollTop + roster.clientHeight < roster.scrollHeight - 2);
    roster.classList.toggle('s2-roster-more-above', scroller === roster && scrolls && roster.scrollTop > 2);
    const cue = roster.parentElement && roster.parentElement.querySelector('.s2-roster-more');
    if (!cue) return;
    const box = scroller.getBoundingClientRect();
    const rows = [...scroller.querySelectorAll('.s2-seat, .s2-pick')].filter((row) => !row.hidden);
    const below = rows.filter((row) => row.getBoundingClientRect().bottom > box.bottom + 2).length;
    if (scrolls && below > 0) {
      cue.textContent = `${below} more below ↓`;
      cue.dataset.dir = 'down';
      cue.hidden = false;
    } else if (scrolls) {
      cue.textContent = 'Back to top ↑';
      cue.dataset.dir = 'up';
      cue.hidden = false;
    } else {
      cue.hidden = true;
      cue.textContent = '';
    }
  }


  // Laptop roster height stops on a whole row, so nothing shows half cut.
  const ROSTER_FIT_QUERY = '(min-width: 861px) and (orientation: landscape) and (min-height: 700px)';
  function fitRoster(roster) {
    if (!roster) return;
    roster.style.removeProperty('max-height');
    const cue = roster.parentElement && roster.parentElement.querySelector('.s2-roster-more');
    if (window.matchMedia(ROSTER_FIT_QUERY).matches && document.documentElement.dataset.bpKb !== '1'
      && roster.scrollHeight > roster.clientHeight + 1) {
      // Leave room for the cue line before choosing the last whole row.
      if (cue) { cue.hidden = false; cue.textContent = 'More below ↓'; }
      const top = roster.getBoundingClientRect().top - roster.scrollTop;
      const limit = roster.clientHeight;
      const bottoms = [...roster.querySelectorAll('.s2-seat, .s2-pick')]
        .filter((row) => !row.hidden)
        .map((row) => row.getBoundingClientRect().bottom - top);
      const fits = bottoms.filter((bottom) => bottom <= limit);
      if (fits.length) roster.style.maxHeight = `${Math.ceil(Math.max(...fits)) + 4}px`;
    }
    syncRoster(roster);
  }

  function wireRoster(root) {
    const roster = root && root.querySelector('.s2-home-table .s2-roster');
    if (!roster) return;
    roster.addEventListener('scroll', () => syncRoster(roster), {passive: true});
    const list = roster.querySelector('.s2-pick-list');
    if (list) list.addEventListener('scroll', () => syncRoster(roster), {passive: true});
    fitRoster(roster);
    requestAnimationFrame(() => fitRoster(roster));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitRoster(roster)).catch(() => {});
    // Avatars and fonts can settle after paint; refit when the rows change height.
    if (typeof ResizeObserver === 'function') {
      let queued = false;
      const ro = new ResizeObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; if (roster.isConnected) fitRoster(roster); else ro.disconnect(); });
      });
      [...roster.children, roster.parentElement].forEach((node) => node && ro.observe(node));
    }
  }

  // When the standings list is taller than its card, say so: fade the last visible
  // row and show "N more below" beside Enter scores. Tapping it scrolls the list.
  function syncStandingsMore(list) {
    const panel = list && list.closest('.s2-home-standings');
    const cue = panel && panel.querySelector('.s2-standings-more');
    if (!cue) return;
    const box = list.getBoundingClientRect();
    const rows = [...list.querySelectorAll('.s2-standing, .s2-live-bench-seat')];
    const below = rows.filter((row) => row.getBoundingClientRect().bottom > box.bottom + 2).length;
    const above = rows.filter((row) => row.getBoundingClientRect().top < box.top - 2).length;
    const scrolls = list.scrollHeight > list.clientHeight + 1;
    panel.classList.toggle('s2-standings-has-more', scrolls && below > 0);
    if (scrolls && below > 0) {
      cue.textContent = `${below} more below ↓`;
      cue.dataset.dir = 'down';
      cue.hidden = false;
    } else if (scrolls && above > 0) {
      cue.textContent = 'Back to top ↑';
      cue.dataset.dir = 'up';
      cue.hidden = false;
    } else {
      cue.hidden = true;
      cue.textContent = '';
    }
  }

  function wireStandingsMore(root) {
    const list = root && root.querySelector('.s2-home-standings .s2-standings');
    if (!list) return;
    list.addEventListener('scroll', () => syncStandingsMore(list), {passive: true});
    syncStandingsMore(list);
    requestAnimationFrame(() => syncStandingsMore(list));
  }

  function moveSeatList(list, from, to) {
    const next = Array.isArray(list) ? list.slice() : [];
    if (!Number.isInteger(from) || !Number.isInteger(to)) return next;
    if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  function homePlaceLabel(place) {
    if (window.BPGRecords && typeof BPGRecords.densePlaceLabel === 'function') {
      return BPGRecords.densePlaceLabel(place);
    }
    const n = Number(place);
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    if (!Number.isFinite(n) || n < 1) return '';
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    const mod10 = n % 10;
    if (mod10 === 1) return `${n}st`;
    if (mod10 === 2) return `${n}nd`;
    if (mod10 === 3) return `${n}rd`;
    return `${n}th`;
  }

  function nightPodiumMarkup(match) {
    if (!window.BPGRecords || typeof BPGRecords.nightPodium !== 'function') return '';
    const podium = BPGRecords.nightPodium(match, {
      configs,
      getDisplayPlayers,
      getRecordedPlayers,
      sortPlayersByTotal,
      competitionPlaces,
      scorebook: window.BPGScorebook
    });
    if (!podium || podium.incomplete || !podium.places.length) return '';
    const spoken = podium.places.map((slot) => {
      const names = slot.people.map((person) => person.name).join(' and ');
      const rank = slot.place === 1 ? 'first' : slot.place === 2 ? 'second' : 'third';
      return `${names} ${rank}`;
    }).join(', ');
    const people = podium.places.flatMap((slot) => {
      const label = homePlaceLabel(slot.place);
      const tied = slot.people.length > 1;
      return slot.people.map((person) => {
        const tone = slot.place <= 3 ? ` is-place-${slot.place}` : ' is-place-rest';
        return `<span class="s2-podium-person" data-place="${slot.place}"${tied ? ' data-tied="true"' : ''}>
          ${getStreakAvatarHtml(person.name, 'avatar-img s2-podium-avatar')}
          <span class="s2-podium-meta">
            <span class="s2-podium-rank scoreboard-rank-badge${tone}">${escapeHtml(label)}</span>
            <span class="s2-podium-name">${escapeHtml(person.name)}</span>
          </span>
        </span>`;
      });
    }).join('');
    return `<span class="s2-night-podium" aria-label="Top three: ${escapeHtml(spoken)}">${people}</span>`;
  }

  function seatLive(text) {
    const el = document.getElementById('slice2-seat-live');
    if (el) el.textContent = text || '';
  }

  function restoreSeatGrab(root) {
    if (!seatGrab || !root) return;
    const handle = root.querySelector(`.s2-seat[data-s2-index="${seatGrab.from}"] .s2-seat-handle`);
    if (!handle) return;
    handle.classList.add('is-grabbed');
    handle.focus();
    paintSeatGrab();
  }

  function paintSeatGrab() {
    if (!seatGrab) return;
    const seats = document.querySelectorAll('#slice2-home .s2-seat');
    clearSeatDragStyles();
    seats[seatGrab.from]?.classList.add('is-dragging');
    seats[seatGrab.from]?.querySelector('.s2-seat-handle')?.classList.add('is-grabbed');
    if (seatGrab.index !== seatGrab.from) {
      seats[seatGrab.index]?.classList.add(seatGrab.index < seatGrab.from ? 'is-drop-before' : 'is-drop-after');
    }
    const count = seats.length;
    seatLive(`${seatGrab.name} would be seat ${seatGrab.index + 1} of ${count}.`);
  }

  function clearSeatDragStyles(keepTransforms) {
    document.querySelectorAll('#slice2-home .s2-seat.is-dragging, #slice2-home .s2-seat.is-drop-before, #slice2-home .s2-seat.is-drop-after').forEach((el) => {
      el.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
    });
    if (!keepTransforms) {
      document.querySelectorAll('#slice2-home .s2-seat').forEach((el) => { el.style.transform = ''; });
    }
    document.querySelectorAll('#slice2-home .s2-seat-handle.is-grabbed').forEach((el) => {
      el.classList.remove('is-grabbed');
    });
  }

  function seatIndexFromPoint(clientY) {
    // During a drag the rows are translated, so use the midpoints measured when the drag began.
    const mids = seatPointer?.mids;
    if (mids?.length) {
      const hit = mids.findIndex((mid) => clientY < mid);
      return hit === -1 ? mids.length - 1 : hit;
    }
    const seats = [...document.querySelectorAll('#slice2-home .s2-seat')];
    if (!seats.length) return -1;
    for (const seat of seats) {
      const box = seat.getBoundingClientRect();
      if (clientY < box.top + box.height / 2) return Number(seat.dataset.s2Index);
    }
    return Number(seats[seats.length - 1].dataset.s2Index);
  }

  function persistSeatMove(from, to) {
    if (typeof slice2MoveSeat === 'function') slice2MoveSeat(from, to);
    else if (typeof slice2ReorderSeat === 'function') {
      const dir = to > from ? 1 : -1;
      let cursor = from;
      while (cursor !== to) {
        slice2ReorderSeat(cursor, dir);
        cursor += dir;
      }
    }
    const table = state();
    const name = table.players[to] || 'Player';
    seatLive(`${name} is seat ${to + 1} of ${table.players.length}.`);
  }

  function paintBoard() {
    const screen = document.getElementById('game-screen');
    const { currentGame } = state();
    if (!screen || !currentGame) return;
    let bar = document.getElementById('slice2-board-bar');
    const cluster = document.querySelector('#game-screen .active-match-actions');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'slice2-board-bar';
      screen.insertBefore(bar, screen.firstChild);
    }
    if (!bar.querySelector('#slice2-table-btn') || !bar.querySelector('.s2-board-title-row')) {
      bar.innerHTML = boardBarMarkup();
    }
    const dest = bar.querySelector('.s2-board-actions');
    const enter = document.getElementById('slice2-enter-btn');
    if (cluster && dest && !dest.contains(cluster)) dest.appendChild(cluster);
    const copy = bar.querySelector('.s2-board-copy');
    const line = document.getElementById('slice2-board-line');
    if (copy && line) {
      let row = bar.querySelector('.s2-board-line-row');
      if (!row) {
        row = document.createElement('div');
        row.className = 's2-board-line-row';
        const titleRow = bar.querySelector('.s2-board-title-row') || line;
        copy.insertBefore(row, titleRow);
        row.appendChild(titleRow);
      }
    }
    parkSaveIndicator();
    parkBoardChrome();
    const legend = document.getElementById('slice2-score-legend');
    if (line) {
      const full = boardLine(currentGame);
      const title = boardTitle(currentGame);
      const rest = full.startsWith(`${title} · `) ? full.slice(title.length + 3) : full;
      const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => (
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])
      ));
      // Each part ("Round 3 of 7", "3 tricks", "bids total 5 (2 over)") stays whole; the line wraps between parts
      // so it never runs under the header buttons. textContent is unchanged.
      const parts = String(rest).split(' · ').map((part) => `<span class="s2-board-part">${esc(part)}</span>`).join(' · ');
      line.innerHTML = `<strong class="s2-board-title">${esc(title)}</strong><span class="s2-board-round"> · ${parts}</span>`;
    }
    const sub = document.getElementById('slice2-board-sub');
    if (sub) {
      const parts = boardSubLine(currentGame);
      const space = document.createElement('span');
      space.className = 's2-board-player-count-slot';
      space.setAttribute('aria-hidden', 'true');
      const pieces = parts.flatMap(({ text, kind }, index) => {
        const part = document.createElement('span');
        part.className = `s2-board-context s2-board-context-${kind}`;
        part.textContent = text;
        return index ? [document.createTextNode(' · '), part] : [part];
      });
      sub.replaceChildren(...pieces, space);
      sub.hidden = !parts.length;
    }
    if (legend) {
      const bidTrick = isBidTrickGame(currentGame);
      const scoring = bidTrick && getBidTrickPhase(currentGame) === 'scoring' && !isMatchOver(currentGame);
      // During scoring the board line already carries exact/over/under — no duplicate chip.
      const showExact = bidTrick && !scoring;
      legend.hidden = !showExact;
      legend.textContent = showExact
        ? (isEight18Game(currentGame) ? 'Exact bid · +10 bonus' : 'Exact bid')
        : '';
    }
    if (enter) {
      const label = enterLabel(currentGame);
      enter.textContent = label;
      enter.setAttribute('aria-label', label);
      enter.disabled = !!isMatchOver(currentGame);
    }
    const eligible = eligibleLifePreserverPlayers();
    const lpAction = document.getElementById('actions-life-preserver-btn');
    if (lpAction) {
      const label = lpAction.querySelector('span:last-child') || lpAction;
      const copy = wheelCopy();
      if (copy) label.textContent = copy.name;
    }
  }

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function scoreText(value, unit) {
    if (!finite(value)) return '-';
    return `${value} ${unit}`;
  }

  function recordsCompact() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 760px)').matches);
  }

  function setRecordsPane(pane) {
    if (pane === 'explore' || pane === 'nights' || pane === 'overview') recordsPane = pane;
    else recordsPane = 'overview';
    paintRecords();
  }

  function paintRecords() {
    const view = document.getElementById('hall-of-fame-view');
    if (!view || typeof getHallOfFame !== 'function') return;
    const table = state();
    if (window.BPGRecords && typeof BPGRecords.paint === 'function') {
      BPGRecords.paint({
        view,
        table,
        pane: recordsPane,
        hall: table.history.length ? getHallOfFame() : null,
        data: table.history.length ? getAllTimeRecords() : null,
        scorebook: window.BPGScorebook,
        configs,
        getDisplayPlayers,
        getRecordedPlayers,
        sortPlayersByTotal,
        competitionPlaces,
        escapeHtml,
        getAvatarImg,
        compact: recordsCompact(),
        gameFilter: recordsGameFilter,
        playerFilter: recordsPlayerFilter,
        pairFilter: recordsPairFilter,
        expandedNights
      });
    }
    if (!document.getElementById('history-screen')?.classList.contains('hidden')) switchTab('hall-of-fame-view');
  }

  function clearWheelCallouts() {
    const layer = document.getElementById('wheel-callouts');
    if (layer) layer.replaceChildren();
  }

  function sizeLifePreserverModal() {
    const modal = document.getElementById('wheel-modal');
    const dialog = modal?.querySelector('.life-preserver-dialog');
    const shell = dialog?.querySelector('.wheel-shell');
    if (!modal || !dialog || !shell || modal.classList.contains('hidden')) return null;
    // Measure the rendered panel with the wheel collapsed. The theme can cap
    // the panel width independently of the available viewport.
    shell.style.width = '0px';
    shell.style.height = '0px';
    const vw = window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const cs = getComputedStyle(dialog);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const dialogW = dialog.clientWidth;
    const dialogH = Math.min(vh - 8, parseFloat(cs.maxHeight) || vh - 8) - borderY;
    const chrome = dialog.scrollHeight;
    const availW = Math.max(0, dialogW - padX);
    const availH = Math.max(0, dialogH - chrome);
    let size = Math.floor(Math.min(availW, Math.max(144, availH - 8)));
    shell.style.width = `${size}px`;
    shell.style.height = `${size}px`;
    const contentOverflow = () => {
      const limit = Math.min(vh - 8, dialog.getBoundingClientRect().bottom - 6);
      let extra = 0;
      [...dialog.children].forEach((el) => {
        if (el.id === 'life-preserver-help' || el.classList.contains('hidden')) return;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (style.position === 'absolute' || style.position === 'fixed') return;
        extra = Math.max(extra, el.getBoundingClientRect().bottom - limit);
      });
      return extra;
    };
    for (let i = 0; i < 8; i++) {
      const overflow = contentOverflow();
      if (overflow <= 0) break;
      size = Math.max(Math.min(144, availW), size - Math.ceil(overflow + 4));
      shell.style.width = `${size}px`;
      shell.style.height = `${size}px`;
    }
    return { size, chrome, vw, vh, availW, availH, dialogW, dialogH };
  }

  function paintWoodBowl(context, cx, cy, radius) {
    // Rich mahogany/walnut outer rim with warm bevel and recessed ball track
    const rim = context.createRadialGradient(
      cx - radius * 0.16,
      cy - radius * 0.2,
      radius * 0.12,
      cx,
      cy,
      radius
    );
    rim.addColorStop(0, '#c8945e');
    rim.addColorStop(0.74, '#9a6136');
    rim.addColorStop(0.86, '#6e3e1f');
    rim.addColorStop(0.91, '#a96f3e');
    rim.addColorStop(0.955, '#5e3217');
    rim.addColorStop(0.985, '#7c4824');
    rim.addColorStop(1, '#3b1e0d');
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fillStyle = rim;
    context.fill();

    // Crisp outer specular bevel
    const bevel = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    bevel.addColorStop(0, 'rgba(255, 236, 200, 0.52)');
    bevel.addColorStop(0.45, 'rgba(218, 168, 108, 0.16)');
    bevel.addColorStop(1, 'rgba(32, 14, 4, 0.55)');
    context.beginPath();
    context.arc(cx, cy, radius * 0.988, 0, Math.PI * 2);
    context.strokeStyle = bevel;
    context.lineWidth = 9;
    context.stroke();

    // Recessed ivory/maple ball track groove
    const track = context.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 0.955);
    track.addColorStop(0, '#5a3117');
    track.addColorStop(0.28, '#b9834e');
    track.addColorStop(0.62, '#e6c697');
    track.addColorStop(0.86, '#9c6638');
    track.addColorStop(1, '#4c2710');
    context.beginPath();
    context.arc(cx, cy, radius * 0.922, 0, Math.PI * 2);
    context.strokeStyle = track;
    context.lineWidth = radius * 0.055;
    context.stroke();

    // Subtle brass pin deflectors at cardinal & diagonal points
    [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4, Math.PI, (Math.PI * 5) / 4, Math.PI * 1.5, (Math.PI * 7) / 4].forEach((angle, idx) => {
      const major = idx % 2 === 0;
      const r = radius * 0.952;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.shadowColor = 'rgba(28, 14, 5, 0.55)';
      context.shadowBlur = 4;
      context.shadowOffsetY = 2;
      const pinGrad = context.createLinearGradient(-8, -5, 8, 5);
      pinGrad.addColorStop(0, '#fff4d4');
      pinGrad.addColorStop(0.5, '#d9ab5a');
      pinGrad.addColorStop(1, '#8c5e23');
      context.fillStyle = pinGrad;
      if (major) {
        context.beginPath();
        context.moveTo(0, -7);
        context.lineTo(11, 0);
        context.lineTo(0, 7);
        context.lineTo(-11, 0);
        context.closePath();
        context.fill();
      } else {
        context.beginPath();
        context.arc(0, 0, 4.5, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });
  }

  function paintCone(context, cx, cy, inner, hub) {
    // Warm sculpted maple/cream concave inner bowl
    const cone = context.createRadialGradient(
      cx - inner * 0.2,
      cy - inner * 0.22,
      hub * 0.35,
      cx,
      cy,
      inner
    );
    cone.addColorStop(0, '#fffaf0');
    cone.addColorStop(0.45, '#f2dfb9');
    cone.addColorStop(0.78, '#d9b47a');
    cone.addColorStop(0.93, '#b8894c');
    cone.addColorStop(1, '#845929');
    context.beginPath();
    context.arc(cx, cy, inner, 0, Math.PI * 2);
    context.fillStyle = cone;
    context.fill();

    // Inner cast shadow ring under the raised pocket ring
    const lipShadow = context.createRadialGradient(cx, cy, inner * 0.88, cx, cy, inner);
    lipShadow.addColorStop(0, 'rgba(66, 38, 14, 0)');
    lipShadow.addColorStop(1, 'rgba(66, 38, 14, 0.38)');
    context.beginPath();
    context.arc(cx, cy, inner, 0, Math.PI * 2);
    context.fillStyle = lipShadow;
    context.fill();

    // Subtle turned lathe grooves
    [0.52, 0.42].forEach((frac, index) => {
      context.beginPath();
      context.arc(cx, cy, cx * frac, 0, Math.PI * 2);
      context.strokeStyle = index ? 'rgba(138, 94, 42, 0.28)' : 'rgba(110, 72, 28, 0.34)';
      context.lineWidth = index ? 2.5 : 4;
      context.stroke();
      context.beginPath();
      context.arc(cx, cy, cx * frac - 2, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(255, 248, 228, 0.42)';
      context.lineWidth = 1.5;
      context.stroke();
    });
  }

  function paintTurret(context, cx, cy, hub) {
    // Soft ground shadow beneath turret & spindle arms
    context.save();
    context.shadowColor = 'rgba(54, 30, 12, 0.42)';
    context.shadowBlur = 18;
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 8;
    context.beginPath();
    context.arc(cx, cy, hub * 1.06, 0, Math.PI * 2);
    context.fillStyle = '#7e5222';
    context.fill();
    context.restore();

    // Four sculpted metallic brass spindle arms with rounded finials
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + i * (Math.PI / 2);
      const len = hub * 1.48;
      context.save();
      context.translate(cx, cy);
      context.rotate(angle);
      context.shadowColor = 'rgba(48, 26, 10, 0.36)';
      context.shadowBlur = 7;
      context.shadowOffsetY = 3;
      const armGrad = context.createLinearGradient(0, -8, 0, 8);
      armGrad.addColorStop(0, '#fff3cf');
      armGrad.addColorStop(0.45, '#d5a454');
      armGrad.addColorStop(1, '#7a4f1e');
      context.beginPath();
      context.roundRect(hub * 0.72, -6.5, len - hub * 0.72, 13, 6.5);
      context.fillStyle = armGrad;
      context.fill();

      // Finial knob at tip of each arm
      const knobGrad = context.createRadialGradient(len - 3, -3, 1.5, len, 0, 11);
      knobGrad.addColorStop(0, '#fff8e2');
      knobGrad.addColorStop(0.5, '#dfb05d');
      knobGrad.addColorStop(1, '#7c511d');
      context.beginPath();
      context.arc(len, 0, 10.5, 0, Math.PI * 2);
      context.fillStyle = knobGrad;
      context.fill();
      context.restore();
    }

    // Stepped lathe-turned brass hub bezel
    const outerBrass = context.createRadialGradient(cx - hub * 0.32, cy - hub * 0.34, hub * 0.08, cx, cy, hub * 1.12);
    outerBrass.addColorStop(0, '#fff6db');
    outerBrass.addColorStop(0.35, '#e5bb6c');
    outerBrass.addColorStop(0.72, '#b07b36');
    outerBrass.addColorStop(1, '#684116');
    context.beginPath();
    context.arc(cx, cy, hub * 1.08, 0, Math.PI * 2);
    context.fillStyle = outerBrass;
    context.fill();

    // Inner bevel groove
    context.beginPath();
    context.arc(cx, cy, hub * 0.89, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(72, 42, 12, 0.55)';
    context.lineWidth = 4;
    context.stroke();

    // Deep-teal enamel center medallion with glossy top-left sheen
    const medallion = context.createRadialGradient(cx - hub * 0.28, cy - hub * 0.3, hub * 0.06, cx, cy, hub * 0.84);
    medallion.addColorStop(0, '#2a9c8e');
    medallion.addColorStop(0.45, '#117469');
    medallion.addColorStop(0.85, '#094f47');
    medallion.addColorStop(1, '#063732');
    context.beginPath();
    context.arc(cx, cy, hub * 0.84, 0, Math.PI * 2);
    context.fillStyle = medallion;
    context.fill();

    // Center brass cap stud
    const stud = context.createRadialGradient(cx - hub * 0.08, cy - hub * 0.09, 2, cx, cy, hub * 0.24);
    stud.addColorStop(0, '#fff8e4');
    stud.addColorStop(0.48, '#deb05e');
    stud.addColorStop(1, '#7c501c');
    context.beginPath();
    context.arc(cx, cy, hub * 0.22, 0, Math.PI * 2);
    context.fillStyle = stud;
    context.fill();
    context.strokeStyle = 'rgba(64, 38, 12, 0.45)';
    context.lineWidth = 2;
    context.stroke();
  }

  function paintWheel() {
    sizeLifePreserverModal();
    paintWheel._fitGen = (paintWheel._fitGen || 0) + 1;
    const fitGen = paintWheel._fitGen;
    const refit = () => {
      if (fitGen !== paintWheel._fitGen) return;
      if (document.getElementById('wheel-modal')?.classList.contains('hidden')) return;
      sizeLifePreserverModal();
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(refit);
    });
    window.setTimeout(refit, 80);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit).catch(() => {});
    const canvas = document.getElementById('wheel-canvas');
    const live = (typeof getWheelSlices === 'function' ? getWheelSlices() : []) || [];
    const slices = live.length ? live : (paintWheel.lastSlices || []);
    if (!canvas) return slices;
    const context = canvas.getContext('2d');
    clearWheelCallouts();
    if (!slices.length) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      paintWheel.lastLabels = [];
      return slices;
    }
    paintWheel.lastSlices = slices;
    const LP = window.BPGLifePreserver || {};
    const displayOf = (slice) => {
      if (typeof LP.sliceDisplayWeight === 'function') return LP.sliceDisplayWeight(slice);
      const display = Number(slice.displayWeight);
      return Number.isFinite(display) && display > 0 ? display : (Number(slice.weight) || 0);
    };
    const total = slices.reduce((sum, slice) => sum + displayOf(slice), 0) || 1;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const bowl = cx * (Number(LP.WHEEL_BOWL_FRAC) || 1);
    const outer = cx * (Number(LP.WHEEL_OUTER_FRAC) || 0.88);
    const inner = cx * (Number(LP.WHEEL_INNER_FRAC) || 0.62);
    const fretInner = cx * (Number(LP.WHEEL_FRET_INNER_FRAC) || 0.38);
    const hubR = cx * (Number(LP.WHEEL_HUB_FRAC) || 0.23);
    const cssWidth = canvas.clientWidth || canvas.width;
    context.clearRect(0, 0, canvas.width, canvas.height);
    paintWoodBowl(context, cx, cy, bowl);
    paintCone(context, cx, cy, inner, hubR);
    let angle = -Math.PI / 2;
    const labels = [];
    const highlightSlice = paintWheel.highlightSlice || null;
    const isHighlighted = (slice) => {
      if (!highlightSlice) return false;
      if (slice === highlightSlice) return true;
      return Number.isFinite(highlightSlice._start) && Number.isFinite(slice._start)
        && Math.abs(slice._start - highlightSlice._start) < 0.0005;
    };
    let winningSlice = null;
    slices.forEach((slice) => {
      const arc = (displayOf(slice) / total) * Math.PI * 2;
      const kind = typeof LP.wheelSliceKind === 'function'
        ? LP.wheelSliceKind(slice)
        : (slice.kind || (slice.adjustment === 0 ? 'zero' : 'good'));
      slice._start = angle;
      slice._end = angle + arc;
      context.beginPath();
      context.arc(cx, cy, outer, angle, angle + arc);
      context.arc(cx, cy, inner, angle + arc, angle, true);
      context.closePath();
      context.fillStyle = slice.color || (kind === 'good' ? '#1a8a7a' : (kind === 'bad' ? '#d07a68' : '#8a8278'));
      context.fill();
      if (isHighlighted(slice)) {
        winningSlice = slice;
      } else if (highlightSlice) {
        context.fillStyle = 'rgba(20, 14, 8, 0.22)';
        context.fill();
      }
      angle += arc;
    });

    // Subtle radial depth glaze across the pocket ring (cast shadow from outer wood rim)
    const ringDepth = context.createRadialGradient(cx, cy, inner, cx, cy, outer);
    ringDepth.addColorStop(0, 'rgba(18, 12, 6, 0.16)');
    ringDepth.addColorStop(0.22, 'rgba(255, 248, 232, 0.06)');
    ringDepth.addColorStop(0.84, 'rgba(255, 248, 232, 0)');
    ringDepth.addColorStop(1, 'rgba(28, 14, 4, 0.26)');
    context.beginPath();
    context.arc(cx, cy, outer, 0, Math.PI * 2);
    context.arc(cx, cy, inner, Math.PI * 2, 0, true);
    context.closePath();
    context.fillStyle = ringDepth;
    context.fill();

    // Metallic brass fret dividers
    angle = -Math.PI / 2;
    slices.forEach((slice) => {
      const arc = (displayOf(slice) / total) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * fretInner;
      const y1 = cy + Math.sin(angle) * fretInner;
      const x2 = cx + Math.cos(angle) * (outer + 2);
      const y2 = cy + Math.sin(angle) * (outer + 2);
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = 'rgba(72, 44, 16, 0.55)';
      context.lineWidth = 4.5;
      context.stroke();
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = 'rgba(244, 212, 144, 0.92)';
      context.lineWidth = 2;
      context.stroke();
      angle += arc;
    });

    // Outer & inner burnished brass bezel rings
    context.beginPath();
    context.arc(cx, cy, outer + 2, 0, Math.PI * 2);
    context.strokeStyle = '#6b4218';
    context.lineWidth = 9;
    context.stroke();
    context.beginPath();
    context.arc(cx, cy, outer + 2, 0, Math.PI * 2);
    context.strokeStyle = '#f2d38c';
    context.lineWidth = 4.5;
    context.stroke();

    context.beginPath();
    context.arc(cx, cy, inner, 0, Math.PI * 2);
    context.strokeStyle = '#6b4218';
    context.lineWidth = 7;
    context.stroke();
    context.beginPath();
    context.arc(cx, cy, inner, 0, Math.PI * 2);
    context.strokeStyle = '#ecd08c';
    context.lineWidth = 3;
    context.stroke();

    // Unmistakable gold/cream glow on the single landed pocket
    if (winningSlice) {
      context.save();
      context.beginPath();
      context.arc(cx, cy, outer - 1, winningSlice._start, winningSlice._end);
      context.arc(cx, cy, inner + 1, winningSlice._end, winningSlice._start, true);
      context.closePath();
      context.fillStyle = 'rgba(255, 232, 152, 0.34)';
      context.fill();
      context.shadowColor = 'rgba(255, 214, 96, 0.95)';
      context.shadowBlur = 18;
      context.strokeStyle = '#fff0b3';
      context.lineWidth = 7;
      context.stroke();
      context.restore();
    }

    slices.forEach((slice) => {
      const layout = typeof LP.labelLayout === 'function'
        ? LP.labelLayout(slice, {
          cx,
          cy,
          outer,
          inner,
          cssWidth,
          canvasWidth: canvas.width
        })
        : null;
      if (!layout) return;
      labels.push(layout);
      const isWin = winningSlice && slice === winningSlice;
      context.save();
      context.translate(layout.x, layout.y);
      context.rotate(layout.rotation);
      context.font = `900 ${layout.canvasFont}px "Nunito Sans", sans-serif`;
      context.fillStyle = isWin ? '#ffffff' : '#fff8ea';
      context.shadowColor = isWin ? 'rgba(42, 24, 6, 0.72)' : 'rgba(12, 24, 22, 0.42)';
      context.shadowBlur = isWin ? 5 : 3;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(layout.text, 0, 0);
      context.restore();
    });
    paintTurret(context, cx, cy, hubR);
    const hub = document.querySelector('.wheel-spinner-hub');
    const resultOpen = !document.getElementById('wheel-result')?.classList.contains('hidden');
    if (hub) hub.textContent = '';
    const mode = document.getElementById('wheel-mode-label');
    if (mode && !resultOpen) {
      const copy = wheelCopy();
      if (copy) mode.textContent = copy.name;
    }
    canvas.dataset.slice2Wheel = '1';
    paintWheel.lastLabels = labels;
    paintWheel.lastGeometry = { cx, cy, outer, inner, cssWidth, canvasWidth: canvas.width, bowl, hubR };
    if (paintWheel.ballReady == null) {
      placeLifePreserverBall(0, 46, 1);
      paintWheel.ballReady = true;
    }
    return slices;
  }

  function ballNodes() {
    return {
      orbit: document.getElementById('wheel-ball-orbit'),
      ball: document.getElementById('wheel-ball')
    };
  }

  function placeLifePreserverBall(angleDeg, radiusPct, opacity) {
    const { orbit, ball } = ballNodes();
    if (!orbit || !ball) return;
    orbit.style.transform = `rotate(${angleDeg}deg)`;
    ball.style.top = `calc(50% - ${radiusPct}%)`;
    ball.style.opacity = String(opacity);
    paintWheel.ballAngle = angleDeg;
    paintWheel.ballRadius = radiusPct;
  }

  function animateLifePreserverBall(landingDeg, options) {
    const { orbit, ball } = ballNodes();
    if (!orbit || !ball) return Promise.resolve();
    const reduce = !!(options && options.reduced);
    const end = Number(landingDeg) || 0;
    if (reduce) {
      orbit.style.transition = 'none';
      ball.style.transition = 'opacity 180ms ease-out';
      placeLifePreserverBall(end, 33.5, 0);
      ball.offsetHeight;
      placeLifePreserverBall(end, 33.5, 1);
      paintWheel.ballParked = true;
      return Promise.resolve();
    }
    const start = Number(paintWheel.ballAngle) || 0;
    const turns = 360 * 3 + end;
    if (paintWheel._ballTimer) {
      window.clearTimeout(paintWheel._ballTimer);
      paintWheel._ballTimer = null;
    }
    orbit.style.transition = 'transform 2.2s cubic-bezier(0.18, 0.82, 0.22, 1)';
    ball.style.transition = 'top 0.85s cubic-bezier(0.22, 0.9, 0.28, 1), opacity 120ms linear';
    placeLifePreserverBall(start, 46, 1);
    orbit.offsetHeight;
    placeLifePreserverBall(turns, 46, 1);
    paintWheel._ballTimer = window.setTimeout(() => {
      paintWheel._ballTimer = null;
      placeLifePreserverBall(turns, 33.5, 1);
      paintWheel.ballParked = true;
    }, 1680);
    return Promise.resolve();
  }

  function resetLifePreserverBall() {
    if (paintWheel._ballTimer) {
      window.clearTimeout(paintWheel._ballTimer);
      paintWheel._ballTimer = null;
    }
    const { orbit, ball } = ballNodes();
    if (orbit) orbit.style.transition = 'none';
    if (ball) ball.style.transition = 'none';
    paintWheel.ballParked = false;
    paintWheel.ballReady = true;
    paintWheel.highlightKey = null;
    paintWheel.highlightSlice = null;
    placeLifePreserverBall(0, 46, 1);
  }

  function highlightLifePreserverPocket(slice) {
    const LP = window.BPGLifePreserver || {};
    paintWheel.highlightSlice = slice || null;
    paintWheel.highlightKey = slice && typeof LP.outcomeKey === 'function'
      ? LP.outcomeKey(slice)
      : (slice ? `${slice.kind}:${slice.adjustment}` : null);
    paintWheel();
  }

  function settleLifePreserverBall(slice) {
    const target = slice || paintWheel.highlightSlice || null;
    const LP = window.BPGLifePreserver || {};
    if (!target || typeof LP.rotationDegreesForSlice !== 'function') return;
    if (paintWheel._ballTimer) {
      window.clearTimeout(paintWheel._ballTimer);
      paintWheel._ballTimer = null;
    }
    const { orbit, ball } = ballNodes();
    if (orbit) orbit.style.transition = 'none';
    if (ball) ball.style.transition = 'none';
    placeLifePreserverBall(LP.rotationDegreesForSlice(target), 33.5, 1);
    paintWheel.ballParked = true;
  }

  function wheelLabelReport() {
    const canvas = document.getElementById('wheel-canvas');
    const shell = document.querySelector('.wheel-shell');
    const spin = document.getElementById('btn-spin');
    const labels = paintWheel.lastLabels || [];
    const sized = sizeLifePreserverModal();
    const shellBox = shell?.getBoundingClientRect();
    const spinBox = spin?.getBoundingClientRect();
    return {
      callouts: document.querySelectorAll('.wheel-callout').length,
      calloutLayer: document.querySelectorAll('#wheel-callouts > *').length,
      labels: labels.map((item) => ({
        text: item.text,
        cssFont: item.cssFont,
        radialMode: item.radialMode,
        insideSegment: item.insideSegment,
        insidePie: item.insidePie
      })),
      wheel: shellBox ? Math.round(Math.min(shellBox.width, shellBox.height)) : 0,
      font: labels.length ? Math.round(Math.min(...labels.map((item) => item.cssFont)) * 10) / 10 : 0,
      maxFont: labels.length ? Math.round(Math.max(...labels.map((item) => item.cssFont)) * 10) / 10 : 0,
      chrome: sized?.chrome || 0,
      dialog: sized ? { width: sized.dialogW, height: sized.dialogH } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      spinInView: !!(spinBox && spinBox.top >= -1 && spinBox.bottom <= window.innerHeight + 1 && spinBox.left >= -1 && spinBox.right <= window.innerWidth + 1 && spinBox.width > 8),
      diameterShare: sized && sized.size
        ? sized.size / Math.min(window.innerWidth, window.innerHeight - sized.chrome)
        : 0,
      pockets: labels.length,
      ball: !!(document.getElementById('wheel-ball')),
      ballRadius: paintWheel.ballRadius || 0
    };
  }

  function enterRound() {
    const { currentGame } = state();
    if (!currentGame || isMatchOver(currentGame)) return;
    if (currentGame.name === 'Rook') {
      document.querySelector('#rook-round-panel .btn-primary')?.click();
      return;
    }
    document.getElementById('submit-action-btn')?.click();
  }

  function onClick(event) {
    const cell = event.target.closest?.('.score-cell-input');
    if (cell && document.documentElement.classList.contains('slice2-tv')) {
      const name = cell.closest('tr')?.querySelector('.scoreboard-player-name')?.textContent?.trim() || 'Player';
      const note = document.getElementById('slice2-score-note');
      if (note) note.textContent = `Selected · ${name} · ${cell.value || 'blank'}`;
    }
    const target = event.target.closest?.('[data-s2-action]');
    if (!target) return;
    const action = target.dataset.s2Action;
    if (action === 'seat-up' || action === 'seat-down') {
      const from = Number(target.dataset.s2Index);
      persistSeatMove(from, from + (action === 'seat-up' ? -1 : 1));
    } else if (action === 'seat-out') {
      const table = state();
      const player = table.players[Number(target.dataset.s2Index)];
      if (player && typeof unseatTonightPlayer === 'function') unseatTonightPlayer(player);
      else if (player) moveToBench(player);
    } else if (action === 'deck-add') {
      moveToLineup(target.dataset.s2Player || '');
    } else if (action === 'edit-player') {
      event.preventDefault();
      const name = target.dataset.s2Player || '';
      if (name && typeof openPlayerEditSheet === 'function') openPlayerEditSheet(name);
    } else if (action === 'pick-game') {
      selected = target.dataset.s2Game || selected;
      paintHome();
    } else if (action === 'another-cancel') {
      if (target.closest('.s2-another-ask') && target.dataset.s2Action !== 'another-cancel') return;
      clearAnotherMatch();
      paintHome();
    } else if (action === 'another-confirm') {
      anotherParkOk = true;
      anotherStep = null;
      startGame(selected);
    } else if (action === 'start-game') {
      startGame(selected);
    } else if (action === 'leave-active') {
      requestLeaveGame();
    } else if (action === 'unfinished-all') {
      unfinishedOpen = true;
      paintHome();
    } else if (action === 'unfinished-close') {
      if (target.closest('.s2-chooser') && target.dataset.s2Action !== 'unfinished-close') return;
      unfinishedOpen = false;
      paintHome();
    } else if (action === 'resume' || action === 'scorecard') {
      goActiveMatch();
    } else if (action === 'night-open' || action === 'night-scorecard') {
      const id = coerceMatchId(target.dataset.s2Id);
      if (id != null && typeof openScorecard === 'function') openScorecard(id);
    } else if (action === 'count-toggle') {
      const id = coerceMatchId(target.dataset.s2Id);
      if (id != null && typeof toggleCountResult === 'function' && toggleCountResult(id)) paintRecords();
    } else if (action === 'night-delete') {
      event.preventDefault();
      event.stopPropagation();
      const id = coerceMatchId(target.dataset.s2Id);
      const table = state();
      if (id == null) return;
      if (table.currentGame && String(table.currentGame.id) === String(id)) {
        if (typeof toast === 'function') toast('The live match stays on the table.');
        return;
      }
      const match = (table.history || []).find((row) => row && String(row.id) === String(id));
      const rawLabel = match && (match.game || match.name) ? String(match.game || match.name) : '';
      const label = rawLabel && typeof displayGameName === 'function' ? displayGameName(rawLabel) : (rawLabel || 'saved');
      if (!window.confirm(`Delete this past ${label} game? It leaves Past nights and Records. The live match is not deleted.`)) return;
      if (typeof deletePastNight === 'function') deletePastNight(id);
      paintRecords();
    } else if (action === 'night-resume') {
      const id = coerceMatchId(target.dataset.s2Id);
      if (id != null && typeof resumeMatch === 'function') resumeMatch(id);
    } else if (action === 'table') {
      if (typeof leaveMatchToTable === 'function') leaveMatchToTable();
    } else if (action === 'life-preserver') {
      if (typeof openLifePreserverEntry === 'function') openLifePreserverEntry();
      else if (typeof openLifePreserverRules === 'function') openLifePreserverRules();
    } else if (action === 'history') {
      openAuditLog();
    } else if (action === 'roster-more') {
      const roster = target.parentElement?.querySelector('.s2-roster');
      const scroller = roster && rosterScroller(roster);
      if (scroller) scroller.scrollTo({top: target.dataset.dir === 'up' ? 0 : scroller.scrollTop + scroller.clientHeight * 0.8, behavior: 'smooth'});
    } else if (action === 'standings-more') {
      const list = target.closest('.s2-home-standings')?.querySelector('.s2-standings');
      if (list) list.scrollTo({top: target.dataset.dir === 'up' ? 0 : list.scrollHeight, behavior: 'smooth'});
    } else if (action === 'enter-round') {
      enterRound();
    } else if (action === 'records-start') {
      if (typeof goHome === 'function') goHome();
    } else if (action === 'show-fame' || action === 'show-shame' || action === 'show-nights') {
      setRecordsPane(action === 'show-shame' ? 'explore' : (action === 'show-nights' ? 'nights' : 'overview'));
    } else if (action === 'night-expand') {
      const id = String(target.dataset.s2Id || '');
      if (id) expandedNights.add(id);
      paintRecords();
    } else if (action === 'open-profile') {
      const name = target.dataset.s2Player || '';
      if (name && typeof openProfileDetail === 'function') {
        if (typeof showProfiles === 'function') showProfiles();
        openProfileDetail(name);
      }
    }
  }

  function onSubmit(event) {
    const form = event.target.closest?.('[data-s2-action="add-form"]');
    if (!form) return;
    event.preventDefault();
    const typed = (form.querySelector('#quick-add-player')?.value || '').trim();
    const picks = [...addPicks];
    addPicks = new Set();
    picks.forEach((name) => {
      if (typeof moveToLineup === 'function') moveToLineup(name);
    });
    if (typed && typeof addPlayerToAll === 'function') {
      const input = document.getElementById('quick-add-player');
      if (input) input.value = typed;
      addPlayerToAll();
    } else {
      paintHome();
    }
  }

  function onChange(event) {
    const rules = event.target.closest?.('[data-s2-action="game-rules"]');
    if (rules) {
      const name = rules.value;
      if (name && typeof openGameRules === 'function') openGameRules(name);
      rules.value = '';
      return;
    }
    const target = event.target.closest?.('[data-s2-action]');
    if (!target) return;
    const action = target.dataset.s2Action;
    if (action === 'pick-add') {
      const picker = target.closest('.s2-picker');
      if (!picker) return;
      const checkboxes = [...picker.querySelectorAll('[data-s2-action="pick-add"]')];
      addPicks = new Set(checkboxes.filter(input => input.checked).map(input => input.dataset.s2Player));
      const selection = benchSelectionState(state().players.length);
      checkboxes.forEach(input => {
        const row = input.closest('.s2-pick');
        input.disabled = !input.checked && !selection.canAddMore;
        row.classList.toggle('is-on', input.checked);
        row.classList.toggle('is-blocked', input.disabled);
        row.querySelector('.s2-pick-mark').textContent = input.checked ? '✓' : '';
      });
      const button = picker.querySelector('.s2-add button[type="submit"]');
      button.textContent = selection.label;
      button.disabled = selection.disabled;
      const note = picker.querySelector('.s2-limit-note');
      note.hidden = selection.canAddMore;
      note.textContent = selection.canAddMore ? '' : selection.note;
    } else if (action === 'filter-game') {
      recordsGameFilter = target.value || '';
      paintRecords();
    } else if (action === 'filter-player') {
      recordsPlayerFilter = target.value || '';
      paintRecords();
    } else if (action === 'filter-pair') {
      recordsPairFilter = target.value || '';
      paintRecords();
    }
  }

  function onPointerDown(event) {
    if (event.button != null && event.button !== 0) return;
    const seat = event.target.closest?.('#slice2-home .s2-seat');
    if (!seat || event.target.closest?.('.s2-seat-out, .s2-avatar-edit, a, input, select, textarea')) return;
    if (event.pointerType === 'touch' && !event.target.closest?.('.s2-seat-handle')) return;
    const from = Number(seat.dataset.s2Index);
    if (!Number.isInteger(from)) return;
    event.preventDefault();
    if (seat.setPointerCapture) {
      try { seat.setPointerCapture(event.pointerId); } catch (error) {}
    }
    const startRects = [...document.querySelectorAll('#slice2-home .s2-seat')].map((el) => el.getBoundingClientRect());
    seatPointer = {
      from, over: from, pointerId: event.pointerId, startY: event.clientY, active: false,
      mids: startRects.map((box) => box.top + box.height / 2),
      pitch: startRects.length > 1 ? startRects[1].top - startRects[0].top : 0,
    };
  }

  function onPointerMove(event) {
    if (!seatPointer || event.pointerId !== seatPointer.pointerId) return;
    if (!seatPointer.active && Math.abs(event.clientY - seatPointer.startY) < 8) return;
    seatPointer.active = true;
    const over = seatIndexFromPoint(event.clientY);
    if (!Number.isInteger(over) || over < 0) return;
    seatPointer.over = over;
    clearSeatDragStyles(true);
    const seats = [...document.querySelectorAll('#slice2-home .s2-seat')];
    const from = seatPointer.from;
    const dragged = seats[from];
    dragged?.classList.add('is-dragging');
    if (over !== from) {
      seats[over]?.classList.add(over < from ? 'is-drop-before' : 'is-drop-after');
    }
    // Smooth feedback: the held row follows the finger; the rows it passes slide one seat to make room.
    const pitch = seatPointer.pitch || 0;
    if (dragged) dragged.style.transform = `translateY(${event.clientY - seatPointer.startY}px)`;
    seats.forEach((seat, index) => {
      if (index === from) return;
      let shift = 0;
      if (from < over && index > from && index <= over) shift = -pitch;
      if (from > over && index < from && index >= over) shift = pitch;
      seat.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  }

  function onPointerUp(event) {
    if (!seatPointer || event.pointerId !== seatPointer.pointerId) return;
    const { from, over, active } = seatPointer;
    seatPointer = null;
    clearSeatDragStyles();
    if (active && Number.isInteger(over) && over !== from) persistSeatMove(from, over);
  }

  function onKeyDown(event) {
    const handle = event.target.closest?.('.s2-seat-handle');
    if (!handle || !handle.closest('#slice2-home')) return;
    const seat = handle.closest('.s2-seat');
    const index = Number(seat?.dataset.s2Index);
    const table = state();
    const name = table.players[index] || 'Player';
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!seatGrab) {
        seatGrab = { from: index, index, name };
        paintSeatGrab();
        seatLive(`Grabbed ${name}. Use arrows to move, Space to drop, Escape to cancel.`);
        return;
      }
      const from = seatGrab.from;
      const to = seatGrab.index;
      seatGrab = null;
      clearSeatDragStyles();
      if (from !== to) persistSeatMove(from, to);
      else seatLive(`Cancelled moving ${name}.`);
    } else if (event.key === 'Escape' && seatGrab) {
      event.preventDefault();
      seatGrab = null;
      clearSeatDragStyles();
      handle.classList.remove('is-grabbed');
      seatLive(`Cancelled moving ${name}.`);
    } else if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && seatGrab) {
      event.preventDefault();
      const next = seatGrab.index + (event.key === 'ArrowUp' ? -1 : 1);
      if (next < 0 || next >= table.players.length) return;
      seatGrab = { from: seatGrab.from, index: next, name: seatGrab.name };
      paintSeatGrab();
    }
  }

  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    if (window.matchMedia) {
      window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
        paintNav();
        paintRecords();
        paintBoard();
        syncPhoneBoardViewport();
      });
      window.matchMedia('(max-width: 1023px)').addEventListener('change', () => {
        paintNav();
      });
    }
    window.addEventListener('resize', () => {
      syncHomeChrome();
      syncStandingsMore(document.querySelector('#slice2-home .s2-home-standings .s2-standings'));
      fitRoster(document.querySelector('#slice2-home .s2-home-table .s2-roster'));
      syncPhoneBoardViewport();
      if (typeof scheduleScorecardColumnTrimAll === 'function') scheduleScorecardColumnTrimAll();
      if (document.getElementById('wheel-modal')?.classList.contains('hidden')) return;
      sizeLifePreserverModal();
      paintWheel();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        syncHomeChrome();
        syncPhoneBoardViewport();
        if (typeof scheduleScorecardColumnTrimAll === 'function') scheduleScorecardColumnTrimAll();
      });
      window.visualViewport.addEventListener('scroll', () => syncPhoneBoardViewport());
    }
    const dialog = document.querySelector('#wheel-modal .life-preserver-dialog');
    if (dialog && typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => {
        if (document.getElementById('wheel-modal')?.classList.contains('hidden')) return;
        sizeLifePreserverModal();
      });
      ro.observe(dialog);
    }
  }

  function syncPhoneBoardViewport() {
    const root = document.documentElement;
    const phone = phoneScoreboard() && document.body.classList.contains('active-match-view');
    if (!phone) {
      root.style.removeProperty('--bp-vv-height');
      root.style.removeProperty('--bp-vv-top');
      root.style.removeProperty('--bp-board-bottom');
      return;
    }
    const vv = window.visualViewport;
    const height = Math.max(1, Math.round((vv && vv.height) || window.innerHeight || 0));
    const top = Math.max(0, Math.round((vv && vv.offsetTop) || 0));
    root.style.setProperty('--bp-vv-height', `${height}px`);
    root.style.setProperty('--bp-vv-top', `${top}px`);
    const bar = document.getElementById('slice2-board-bar');
    const enter = document.getElementById('slice2-enter-btn');
    const bottoms = [bar, enter].filter(Boolean).map((el) => el.getBoundingClientRect().bottom);
    if (bottoms.length) {
      root.style.setProperty('--bp-board-bottom', `${Math.round(Math.max(...bottoms))}px`);
    }
  }

  function syncHomeChrome() {
    const root = document.documentElement;
    const nav = document.getElementById('top-nav');
    const navH = nav ? Math.ceil(nav.getBoundingClientRect().height) : 72;
    root.style.setProperty('--bp-nav-offset', `${navH}px`);
    const shell = document.querySelector('.bp-app-shell');
    if (shell) {
      const shellTop = Math.max(0, Math.round(shell.getBoundingClientRect().top));
      root.style.setProperty('--bp-shell-top', `${shellTop}px`);
    }
    const demoBar = document.getElementById('bpg-try-demo-bar');
    const demoTip = document.getElementById('bpg-try-demo-tip');
    let demoOffset = 0;
    if (demoBar) demoOffset += Math.ceil(demoBar.getBoundingClientRect().height);
    if (demoTip && !demoTip.hidden && getComputedStyle(demoTip).display !== 'none') {
      demoOffset += Math.ceil(demoTip.getBoundingClientRect().height);
    }
    root.style.setProperty('--bp-demo-offset', `${demoOffset}px`);
    const vv = window.visualViewport;
    const keyboard = !!(vv && window.innerHeight - vv.height > 140);
    root.dataset.bpKb = keyboard ? '1' : '0';
  }

  function refresh(which) {
    wire();
    syncPhoneBoardViewport();
    syncHomeChrome();
    const all = !which || which === 'all';
    try { if (all || which === 'home' || which === 'game' || which === 'records') paintNav(); } catch (error) { console.error(error); }
    try { if (all || which === 'home') paintHome(); } catch (error) { console.error(error); }
    try { if (all || which === 'game') paintBoard(); } catch (error) { console.error(error); }
    try { if (all || which === 'records') paintRecords(); } catch (error) { console.error(error); }
  }

  function whenReady() {
    const params = new URLSearchParams(location.search);
    if (!params.has('gnqa')) return Promise.resolve();
    if (document.body.dataset.gnQaReady === 'true' || document.body.dataset.gnQaReady === 'error') return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        observer.disconnect();
        clearTimeout(timer);
        resolve();
      };
      const observer = new MutationObserver(() => {
        const ready = document.body.dataset.gnQaReady;
        if (ready === 'true' || ready === 'error') done();
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-gn-qa-ready'] });
      const timer = setTimeout(done, 8000);
    });
  }

  function applyDeepLink() {
    const view = new URLSearchParams(location.search).get('slice2view');
    if (view === 'home') goHome();
    else if (view === 'records') showHistory();
    else if (view === 'entry') openScoreEntryModal();
    else if (view === 'wheel') {
      const player = firstEligible();
      if (player) authorizeHailMary(player);
    } else if (view === 'editor') {
      document.querySelector('#scorecard-body .score-cell-input')?.click();
    }
  }

  async function boot() {
    if (new URLSearchParams(location.search).has('gnqa')) document.documentElement.classList.add('slice2-qa');
    await whenReady();
    try { applyDeepLink(); } catch (error) { console.error(error); }
    refresh('all');
  }

  window.BPGSlice2 = {
    refresh,
    takeAnotherParkOk,
    syncPhoneBoardViewport,
    paintWheel,
    parkSaveIndicator,
    parkBoardChrome,
    setRecordsPane,
    moveSeatList,
    sizeLifePreserverModal,
    wheelLabelReport,
    animateLifePreserverBall,
    resetLifePreserverBall,
    placeLifePreserverBall,
    highlightLifePreserverPocket,
    settleLifePreserverBall,
    filterAddPicker
  };
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', () => { boot(); });
})();
