/* Warm Porch Ledger interactions. Always loaded. */
(function () {
  function registryGames() {
    return (window.BPGGames && BPGGames.visibleGames()) || [];
  }

  function displayGameName(id) {
    if (window.BPGGames && typeof BPGGames.displayName === 'function') return BPGGames.displayName(id);
    if (id === 'Hand and Foot') return 'Canasta';
    if (id === 'Flip 7 Vengeance') return 'Flip 7';
    return id || 'Match';
  }

  let editing = false;
  let selected = 'Five Crowns';
  let shamePane = false;
  let wired = false;

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

  function leaderBit(game) {
    if (!game || (game.currentRound || 1) <= 1) return '';
    const table = getActivePlayers(game);
    if (!table.length) return '';
    const low = window.BPGGames ? BPGGames.winLow(game.name) : (game.name === 'Five Crowns' || game.name === 'Beat the Heat');
    const sorted = [...table].sort((a, b) => low ? (game.totals[a] || 0) - (game.totals[b] || 0) : (game.totals[b] || 0) - (game.totals[a] || 0));
    const name = sorted[0];
    return `Leader: ${name} (${game.totals[name] || 0} pts)`;
  }

  function matchSubtitle(game) {
    const bits = [];
    if (game.name === 'Five Crowns') {
      const wilds = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const wild = wilds[(game.currentRound || 1) - 1];
      if (wild) bits.push(`${wild}s Wild`);
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

  function boardLine(game) {
    const bits = [boardTitle(game)];
    const maxR = getMaxRoundsForGame(game);
    if (isEight18Game(game)) {
      const tricks = getRoundTrickCount(game);
      bits.push(`Round ${game.currentRound} of ${maxR} (${tricks} trick${tricks === 1 ? '' : 's'})`);
    } else if (game.name === 'Wizard') {
      bits.push(`Round ${game.currentRound} of ${maxR}`);
    } else if (game.name === 'Five Crowns') {
      bits.push(`Round ${game.currentRound} of ${maxR}`);
    } else if (maxR && maxR < 900) {
      bits.push(`Round ${game.currentRound} of ${maxR}`);
    } else {
      bits.push(`Round ${game.currentRound}`);
    }
    if (isBidTrickGame(game) && !isMatchOver(game)) {
      const phase = getBidTrickPhase(game);
      const tricks = getRoundTrickCount(game);
      const table = getActivePlayers(game);
      if (phase === 'scoring') {
        const sum = table.reduce((total, player) => total + (parseInt(game.currentBids?.[player], 10) || 0), 0);
        const delta = sum - tricks;
        const note = delta === 0 ? 'exact' : (delta > 0 ? `+${delta} over` : `${delta} under`);
        bits.push(`Bids ${sum}/${tricks} (${note})`);
      }
    }
    return bits.join(' · ');
  }

  function boardSubLine(game) {
    const bits = [];
    if (game.name === 'Five Crowns') {
      const wilds = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const wild = wilds[(game.currentRound || 1) - 1];
      if (wild) bits.push(`${wild}s\u00a0Wild`);
    }
    const dealer = getCurrentDealerName(game);
    if (dealer) bits.push(`Dealer:\u00a0${dealer}`);
    return bits.join(' · ');
  }

  function enterLabel(game) {
    const round = game.currentRound;
    if (isMatchOver(game)) return 'Match complete';
    if (game.name === 'Rook') return `Enter Round ${round}`;
    if (isBidTrickGame(game)) return getBidTrickPhase(game) === 'bidding' ? `Enter Round ${round} Bids` : `Enter Round ${round} Tricks`;
    if (game.name === 'Beat the Heat') return `Enter Round ${round} Heat`;
    return `Enter Round ${round} Scores`;
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
        <button type="button" class="s2-btn s2-table-btn" id="slice2-table-btn" data-s2-action="table">← Table</button>
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

  function paintNav() {
    const table = state();
    const row = document.querySelector('#top-nav > div');
    const actions = row?.children?.[1];
    if (!actions) return;
    document.getElementById('slice2-saved')?.remove();
    const phone = window.matchMedia('(max-width: 760px)').matches;
    actions.querySelectorAll('.nav-btn').forEach((button) => {
      const action = button.getAttribute('onclick') || '';
      if (action.includes('goHome')) button.textContent = phone ? 'Table' : "Tonight's Table";
      if (action.includes('showHistory')) button.textContent = phone ? 'Records' : `Records (${table.history.length})`;
      if (action.includes('showProfiles')) button.textContent = phone ? 'Profiles' : `Player Passports (${table.allPlayers.length})`;
      if (action.includes('openSettings')) button.textContent = phone ? '⚙' : 'Settings';
      button.classList.toggle('s2-nav-on', action.includes('goHome') && !document.getElementById('home-screen')?.classList.contains('hidden'));
    });
    parkSaveIndicator();
  }

  function parkSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    const game = document.getElementById('game-screen');
    const row = document.querySelector('#slice2-board-bar .s2-board-line-row');
    const onBoard = !!(game && !game.classList.contains('hidden') && row);
    if (onBoard) {
      if (el.parentElement !== row) row.appendChild(el);
      return;
    }
    if (el.parentElement !== document.body) document.body.appendChild(el);
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
    const dealer = dealerOf(table);
    const picker = registryGames();
    if (!picker.some((game) => game.id === selected)) selected = picker[0]?.id || 'Five Crowns';
    const meta = gameMeta(selected);
    const seated = table.players.length;
    const bench = table.allPlayers.filter((player) => !table.players.includes(player));
    const banner = table.currentGame ? (() => {
      const game = table.currentGame;
      const maxR = getMaxRoundsForGame(game);
      const title = maxR && maxR < 900
        ? `Resume ${displayGameName(game.name)} · Round ${game.currentRound} of ${maxR} · ${getActivePlayers(game).length} Players`
        : `Resume ${displayGameName(game.name)} · Round ${game.currentRound} · ${getActivePlayers(game).length} Players`;
      return `<section class="s2-banner">
        <div>
          <div class="s2-kicker">Active match</div>
          <h2>${escapeHtml(title)}</h2>
          <p class="s2-sub">${escapeHtml(matchSubtitle(game))}</p>
        </div>
        <div class="s2-banner-actions">
          <button type="button" class="s2-btn s2-btn-primary" data-s2-action="resume">Resume</button>
        </div>
      </section>`;
    })() : '';
    const seats = table.players.map((player, index) => {
      const controls = editing ? `<div class="s2-seat-actions">
        <button type="button" class="s2-btn" data-s2-action="seat-up" data-s2-index="${index}" aria-label="Move ${escapeHtml(player)} earlier">Earlier</button>
        <button type="button" class="s2-btn" data-s2-action="seat-down" data-s2-index="${index}" aria-label="Move ${escapeHtml(player)} later">Later</button>
        <button type="button" class="s2-btn" data-s2-action="seat-out" data-s2-index="${index}" aria-label="Move ${escapeHtml(player)} to on deck">Remove</button>
      </div>` : '';
      const tag = player === dealer ? `<span class="s2-dealer-tag">${table.currentGame ? 'Dealer' : 'Deals first'}</span>` : '';
      return `<article class="s2-seat">
        <span class="s2-seat-num">${index + 1}</span>
        ${getStreakAvatarHtml(player, 'avatar-img')}
        <span class="s2-seat-name">${escapeHtml(player)}</span>
        ${tag}
        ${controls}
      </article>`;
    }).join('') || '<p class="s2-sub">Add players to fill tonight\'s table.</p>';
    const chips = bench.map((player) => `<button type="button" class="s2-chip" data-s2-action="deck-add" data-s2-player="${escapeHtml(player)}">+ ${escapeHtml(player)}</button>`).join('');
    const cards = registryGames().map((game) => {
      const on = game.id === selected;
      return `<button type="button" class="s2-game${on ? ' is-selected' : ''}" data-s2-action="pick-game" data-s2-game="${escapeHtml(game.id)}" aria-pressed="${on}">
        <span class="s2-game-art s2-art-${game.art}" aria-hidden="true"></span>
        <span class="s2-game-copy">
          <strong>${escapeHtml(game.title)}</strong>
          <em>${escapeHtml(game.id === 'Wizard' ? `${game.detail(seated)} · Highest total wins` : game.line)}</em>
          ${on ? '<span class="s2-selected-pill">Selected</span>' : ''}
        </span>
      </button>`;
    }).join('');
    const nights = table.history.slice(0, 4).map((match) => {
      const winner = (match.winners && match.winners[0]) || 'Tied';
      const label = displayGameName(match.game);
      const incomplete = window.BPGScorebook && !BPGScorebook.isCompletedHistoryMatch(match);
      const status = incomplete ? 'Incomplete' : (winner ? winner : '');
      return `<button type="button" class="s2-night" data-s2-action="night-open" data-s2-id="${escapeHtml(String(match.id || ''))}">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(match.date || '')}${status ? ` · ${escapeHtml(status)}` : ''}</span>
      </button>`;
    }).join('');
    root.innerHTML = `${banner}
      <div class="s2-home-grid">
        <section class="s2-panel" aria-label="Tonight's table">
          <div class="s2-panel-head">
            <div>
              <h2>Tonight's Table · ${seated} Seated</h2>
              <p class="s2-sub">${dealer ? escapeHtml(dealer) + (table.currentGame ? ' is dealing' : ' deals first') : 'In dealing order'}</p>
            </div>
            <button type="button" class="s2-btn" id="slice2-edit-seating" data-s2-action="edit-seating">${editing ? 'Done' : 'Edit Seating'}</button>
          </div>
          <div class="s2-seat-grid">${seats}</div>
          <div class="s2-deck">${chips}</div>
          <form class="s2-add" data-s2-action="add-form">
            <input id="slice2-add-name" type="text" placeholder="Add a player" autocomplete="off" aria-label="Add a player">
            <button type="submit" class="s2-btn s2-btn-primary">Add Player</button>
          </form>
        </section>
        <section class="s2-panel" aria-label="Start a new match">
          <div class="s2-panel-head">
            <div>
              <h2>Start a New Match</h2>
              <p class="s2-sub">Choose a game for tonight's ${seated} seated ${seated === 1 ? 'player' : 'players'}</p>
            </div>
            <label class="s2-rules-picker">
              <select class="s2-rules-select" data-s2-action="game-rules" aria-label="Game instructions">
                <option value="">Game Instructions</option>
                ${picker.map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(game.title)}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="s2-game-grid">${cards}</div>
          <div class="s2-startbar">
            <p id="slice2-start-summary">${escapeHtml(meta.title)} · ${seated} ${seated === 1 ? 'player' : 'players'} · ${escapeHtml(meta.detail(seated))}</p>
            <button type="button" class="s2-btn s2-btn-primary" id="slice2-start-btn" data-s2-action="start-game">Start ${escapeHtml(meta.title)}</button>
          </div>
        </section>
      </div>
      ${nights ? `<section class="s2-nights"><div class="s2-nights-head"><h2>Recent nights</h2></div><div class="s2-night-list">${nights}</div></section>` : ''}`;
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
    if (cluster && dest && !dest.contains(cluster)) dest.insertBefore(cluster, enter || null);
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
    const legend = document.getElementById('slice2-score-legend');
    if (line) {
      const full = boardLine(currentGame);
      const title = boardTitle(currentGame);
      const rest = full.startsWith(`${title} · `) ? full.slice(title.length + 3) : full;
      const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => (
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])
      ));
      line.innerHTML = `<strong class="s2-board-title">${esc(title)}</strong><span class="s2-board-round"> · ${esc(rest)}</span>`;
    }
    const sub = document.getElementById('slice2-board-sub');
    if (sub) {
      const wild = boardSubLine(currentGame);
      sub.textContent = wild;
      sub.hidden = !wild;
    }
    if (legend) {
      const showExact = isBidTrickGame(currentGame);
      legend.hidden = !showExact;
      legend.textContent = showExact
        ? (isEight18Game(currentGame) ? 'Exact bid · +10 bonus' : 'Exact bid')
        : '';
    }
    if (enter) {
      enter.textContent = enterLabel(currentGame);
      enter.disabled = !!isMatchOver(currentGame);
    }
    const eligible = eligibleLifePreserverPlayers();
    const lpAction = document.getElementById('actions-life-preserver-btn');
    if (lpAction) {
      const label = lpAction.querySelector('span:last-child') || lpAction;
      if (eligible.length) label.textContent = 'Life Preserver…';
      else label.textContent = 'Life Preserver';
    }
  }

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function scoreText(value, unit) {
    if (!finite(value)) return '—';
    return `${value} ${unit}`;
  }

  function paintRecords() {
    const view = document.getElementById('hall-of-fame-view');
    if (!view || typeof getHallOfFame !== 'function') return;
    const table = state();
    const hidden = view.classList.contains('hidden');
    if (!table.history.length) {
      view.className = `s2-ledger${hidden ? ' hidden' : ''}`;
      view.innerHTML = '<section class="s2-panel"><h2>Hall of Fame</h2><p class="s2-sub local-storage-statement">Scores and history are saved in this browser on this device.</p><p class="s2-sub">Play a few nights to fill the ledger.</p></section>';
      return;
    }
    const hall = getHallOfFame();
    const data = getAllTimeRecords();
    const wins = data.allTime?.mostWins?.[0];
    const rate = data.allTime?.bestWinRate?.[0];
    const streak = data.allTime?.longestWinningStreak;
    const rateFallback = !rate && hall.Overall?.bestWinRatePlayer && hall.Overall.bestWinRatePlayer !== '-'
      ? { player: hall.Overall.bestWinRatePlayer, value: hall.Overall.bestWinRate, label: 'Best win rate' }
      : rate;
    const podium = [
      wins ? { kicker: 'Most wins', value: String(wins.value), name: wins.player, sub: 'porch titles' } : null,
      rateFallback ? { kicker: 'Win rate', value: `${rateFallback.value}%`, name: rateFallback.player, sub: rateFallback.label || '' } : null,
      streak ? { kicker: 'Win streak', value: `${streak.value}W`, name: streak.player, sub: streak.label || 'in a row' } : null
    ].filter(Boolean);
    const shelf = (window.BPGGames ? BPGGames.GAMES : []).map((game) => [
      game.id,
      game.title,
      game.id === 'Beat the Heat' ? 'heat' : 'pts',
      game.art
    ]);
    const rows = shelf.map(([id, title, unit, art]) => {
      const card = hall[id] || {};
      const round = data.games?.[id]?.bestRound;
      const coverage = hall._coverage?.[id];
      const noUnassisted = !!(coverage && coverage.assisted > 0 && coverage.unassisted === 0);
      const matchValue = noUnassisted ? '—' : scoreText(card.bestScore, unit);
      const matchWho = noUnassisted ? 'No unassisted matches yet' : (card.bestPlayer && card.bestPlayer !== '-' ? card.bestPlayer : '');
      const roundValue = round && finite(round.value) ? scoreText(round.value, unit) : '—';
      const roundWho = round?.player || '';
      return `<div class="s2-ledger-row">
        <div class="s2-ledger-game"><span class="s2-ledger-mark s2-art-${art}" aria-hidden="true"></span><div><strong>${escapeHtml(title)}</strong></div></div>
        <div class="s2-ledger-stat"><strong>${escapeHtml(matchValue)}</strong><small>${escapeHtml(matchWho)}</small></div>
        <div class="s2-ledger-stat"><strong>${escapeHtml(roundValue)}</strong><small>${escapeHtml(roundWho)}</small></div>
      </div>`;
    }).join('');
    const shameNames = new Set(['The Disaster Award', 'The Crash and Burn', 'The 818 Brick', 'The Meltdown', 'The Overconfident', 'The Invisible Man', 'The Slow Learner']);
    const shame = (data.shameAwards || []).filter((award) => award.record && shameNames.has(award.name)).slice(0, 5).map((award) => {
      const record = award.record;
      const detail = typeof award.stat === 'function' ? award.stat(record) : (record.label || '');
      return `<article class="s2-shame-card">
        ${getAvatarImg(record.player || '', 'avatar-img')}
        <div><b>${escapeHtml(award.name)}</b><p>${escapeHtml(detail)}</p><small>${escapeHtml(record.player || '')}</small></div>
        <strong>${escapeHtml(finite(record.value) ? String(record.value) : '—')}</strong>
      </article>`;
    }).join('');
    const rival = data.rivalries?.top?.[0];
    const rivalText = rival
      ? `${rival.a} vs ${rival.b} · ${rival.edgePlayer && rival.edgePlayer !== 'Even' ? `${rival.edgePlayer} leads ${Math.max(rival.aWins, rival.bWins)}–${Math.min(rival.aWins, rival.bWins)}` : 'Even'} · ${rival.together} nights`
      : '';
    const nightsHtml = table.history.map((match) => {
      const label = displayGameName(match.game);
      const incomplete = window.BPGScorebook && !BPGScorebook.isCompletedHistoryMatch(match);
      const assisted = window.BPGScorebook && BPGScorebook.isAssistedMatch(match);
      const bits = [match.date || ''];
      if (incomplete) bits.push('Incomplete');
      if (assisted) bits.push('Assisted');
      const retired = (match.retired || []).filter(Boolean);
      if (retired.length) bits.push(`Retired · ${retired.join(', ')}`);
      return `<article class="s2-night"${assisted ? ' data-assisted-match="true"' : ''}>
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(bits.filter(Boolean).join(' · '))}</span>
        </div>
        <div class="s2-night-actions">
          <button type="button" class="s2-btn" data-s2-action="night-scorecard" data-s2-id="${escapeHtml(String(match.id || ''))}">Scorecard</button>
          <button type="button" class="s2-btn" data-s2-action="night-resume" data-s2-id="${escapeHtml(String(match.id || ''))}">Resume</button>
        </div>
      </article>`;
    }).join('');
    view.className = `s2-ledger${shamePane ? ' s2-pane-shame' : ''}${hidden ? ' hidden' : ''}`;
    view.innerHTML = `<div class="s2-segment" role="tablist" aria-label="Records">
        <button type="button" class="s2-btn${shamePane ? '' : ' is-on'}" id="slice2-show-fame" data-s2-action="show-fame">Hall of Fame</button>
        <button type="button" class="s2-btn${shamePane ? ' is-on' : ''}" id="slice2-show-shame" data-s2-action="show-shame">Shame & Rivalries</button>
      </div>
      <div class="s2-ledger-grid">
        <section class="s2-panel s2-fame-col">
          <div class="s2-podium">${podium.map((card) => `<article><small>${escapeHtml(card.kicker)}</small><strong>${escapeHtml(card.value)}</strong><span>${escapeHtml(card.name)}</span><small>${escapeHtml(card.sub)}</small>${getAvatarImg(card.name, 'avatar-img')}</article>`).join('')}</div>
          <div class="s2-panel-head"><h2>Game Championship Ledger</h2><span class="s2-sub">${table.history.length} nights</span></div>
          <div class="s2-ledger-table">
            <div class="s2-ledger-row is-head"><span>Game</span><span>Best match <small class="s2-unassisted-note">Unassisted matches only</small></span><span>Best round</span></div>
            ${rows}
          </div>
        </section>
        <section class="s2-panel s2-shame-col">
          <div class="s2-panel-head"><h2>Hall of Shame</h2></div>
          ${shame || '<p class="s2-sub">No infamous nights yet.</p>'}
          ${rivalText ? `<article class="s2-rival"><small class="s2-kicker">Head-to-head</small><p class="s2-sub">${escapeHtml(rivalText)}</p></article>` : ''}
        </section>
      </div>
      <section class="s2-panel s2-nights-col">
        <div class="s2-panel-head"><h2>Past nights</h2></div>
        <p class="s2-sub local-storage-statement">Scores and history are saved in this browser on this device.</p>
        <div class="s2-night-list">${nightsHtml || '<p class="s2-sub">No nights saved yet.</p>'}</div>
      </section>`;
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
    shell.style.width = '';
    shell.style.height = '';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gutter = 8;
    const landscape = vw > vh;
    const dialogW = Math.floor(landscape ? Math.min(vw - gutter, vh - gutter) : vw - gutter);
    const dialogH = Math.floor(vh - gutter);
    dialog.style.width = `${dialogW}px`;
    dialog.style.maxWidth = `${dialogW}px`;
    dialog.style.maxHeight = `${dialogH}px`;
    dialog.style.minHeight = landscape ? `${dialogH}px` : '';
    const cs = getComputedStyle(dialog);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    let chrome = padY;
    [...dialog.children].forEach((el) => {
      if (el === shell || el.id === 'life-preserver-help') return;
      if (el.classList.contains('hidden')) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (style.position === 'absolute' || style.position === 'fixed') return;
      const box = el.getBoundingClientRect();
      if (box.height < 1) return;
      chrome += box.height;
      chrome += (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
    });
    const availW = Math.max(168, dialogW - padX);
    const availH = Math.max(168, dialogH - chrome);
    const size = Math.floor(Math.min(availW, availH));
    shell.style.width = `${size}px`;
    shell.style.height = `${size}px`;
    return { size, chrome, vw, vh, availW, availH, dialogW, dialogH };
  }

  function paintWoodBowl(context, cx, cy, radius) {
    const wood = context.createRadialGradient(cx - radius * 0.2, cy - radius * 0.24, radius * 0.08, cx, cy, radius);
    wood.addColorStop(0, '#f6e7c8');
    wood.addColorStop(0.38, '#e8c992');
    wood.addColorStop(0.72, '#d3a86a');
    wood.addColorStop(0.88, '#f3e6c8');
    wood.addColorStop(0.95, '#c9955c');
    wood.addColorStop(1, '#8d6236');
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fillStyle = wood;
    context.fill();
    context.beginPath();
    context.arc(cx, cy, radius * 0.985, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(143, 98, 52, 0.35)';
    context.lineWidth = 10;
    context.stroke();
    context.beginPath();
    context.arc(cx, cy, radius * 0.91, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255, 248, 232, 0.7)';
    context.lineWidth = 14;
    context.stroke();
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
      const r = radius * 0.955;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.beginPath();
      context.roundRect(-7, -5, 14, 10, 4);
      context.fillStyle = '#fff8ea';
      context.fill();
      context.restore();
    });
  }

  function paintCone(context, cx, cy, inner, hub) {
    const cone = context.createRadialGradient(cx - hub * 0.28, cy - hub * 0.3, hub * 0.2, cx, cy, inner);
    cone.addColorStop(0, '#fff7ea');
    cone.addColorStop(0.55, '#f0ddb8');
    cone.addColorStop(1, '#e2c48d');
    context.beginPath();
    context.arc(cx, cy, inner, 0, Math.PI * 2);
    context.fillStyle = cone;
    context.fill();
    [0.56, 0.44].forEach((frac, index) => {
      context.beginPath();
      context.arc(cx, cy, cx * frac, 0, Math.PI * 2);
      context.strokeStyle = index ? 'rgba(201, 149, 86, 0.35)' : 'rgba(138, 106, 50, 0.28)';
      context.lineWidth = index ? 3 : 5;
      context.stroke();
    });
  }

  function paintTurret(context, cx, cy, hub) {
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + i * ((Math.PI * 2) / 3);
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * hub * 0.18, cy + Math.sin(angle) * hub * 0.18);
      context.lineTo(cx + Math.cos(angle) * hub * 1.42, cy + Math.sin(angle) * hub * 1.42);
      context.strokeStyle = 'rgba(143, 98, 52, 0.35)';
      context.lineWidth = 14;
      context.lineCap = 'round';
      context.stroke();
    }
    const wood = context.createRadialGradient(cx - hub * 0.25, cy - hub * 0.3, hub * 0.1, cx, cy, hub * 1.05);
    wood.addColorStop(0, '#fff6e4');
    wood.addColorStop(0.45, '#e8c992');
    wood.addColorStop(1, '#b88448');
    context.beginPath();
    context.arc(cx, cy, hub * 1.08, 0, Math.PI * 2);
    context.fillStyle = wood;
    context.fill();
    context.beginPath();
    context.arc(cx, cy, hub * 0.82, 0, Math.PI * 2);
    context.fillStyle = '#0e7468';
    context.fill();
  }

  function paintWheel() {
    sizeLifePreserverModal();
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
    const inner = cx * (Number(LP.WHEEL_INNER_FRAC) || 0.7);
    const fretInner = cx * (Number(LP.WHEEL_FRET_INNER_FRAC) || 0.36);
    const hubR = cx * (Number(LP.WHEEL_HUB_FRAC) || 0.22);
    const cssWidth = canvas.clientWidth || canvas.width;
    context.clearRect(0, 0, canvas.width, canvas.height);
    paintWoodBowl(context, cx, cy, bowl);
    paintCone(context, cx, cy, inner, hubR);
    let angle = -Math.PI / 2;
    const labels = [];
    const highlightKey = paintWheel.highlightKey;
    slices.forEach((slice) => {
      const arc = (displayOf(slice) / total) * Math.PI * 2;
      const kind = typeof LP.wheelSliceKind === 'function'
        ? LP.wheelSliceKind(slice)
        : (slice.kind || (slice.adjustment === 0 ? 'zero' : 'good'));
      const key = typeof LP.outcomeKey === 'function' ? LP.outcomeKey(slice) : `${kind}:${slice.adjustment}`;
      context.beginPath();
      context.arc(cx, cy, outer, angle, angle + arc);
      context.arc(cx, cy, inner, angle + arc, angle, true);
      context.closePath();
      context.fillStyle = slice.color || (kind === 'good' ? '#1a8a7a' : (kind === 'bad' ? '#d07a68' : '#8a8278'));
      context.fill();
      if (highlightKey && key === highlightKey) {
        context.save();
        context.fillStyle = 'rgba(255, 248, 232, 0.32)';
        context.fill();
        context.strokeStyle = 'rgba(255, 246, 228, 0.95)';
        context.lineWidth = 7;
        context.stroke();
        context.restore();
      }
      slice._start = angle;
      slice._end = angle + arc;
      angle += arc;
    });
    angle = -Math.PI / 2;
    slices.forEach((slice) => {
      const arc = (displayOf(slice) / total) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * fretInner;
      const y1 = cy + Math.sin(angle) * fretInner;
      const x2 = cx + Math.cos(angle) * (outer + 3);
      const y2 = cy + Math.sin(angle) * (outer + 3);
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = 'rgba(143, 98, 52, 0.28)';
      context.lineWidth = 4;
      context.stroke();
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = 'rgba(255, 248, 232, 0.88)';
      context.lineWidth = 2;
      context.stroke();
      angle += arc;
    });
    context.beginPath();
    context.arc(cx, cy, outer + 2, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255, 246, 228, 0.95)';
    context.lineWidth = 8;
    context.stroke();
    context.beginPath();
    context.arc(cx, cy, inner, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(143, 98, 52, 0.28)';
    context.lineWidth = 5;
    context.stroke();
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
      context.save();
      context.translate(layout.x, layout.y);
      context.rotate(layout.rotation);
      context.font = `900 ${layout.canvasFont}px "Nunito Sans", sans-serif`;
      context.fillStyle = '#fff8ea';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(layout.text, 0, 0);
      context.restore();
    });
    paintTurret(context, cx, cy, hubR);
    const hub = document.querySelector('.wheel-spinner-hub');
    const resultOpen = !document.getElementById('wheel-result')?.classList.contains('hidden');
    if (hub) hub.textContent = resultOpen ? '' : 'SPIN';
    const mode = document.getElementById('wheel-mode-label');
    if (mode && !resultOpen) mode.textContent = 'Life Preserver';
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
      placeLifePreserverBall(end, 39, 0);
      ball.offsetHeight;
      placeLifePreserverBall(end, 39, 1);
      paintWheel.ballParked = true;
      return Promise.resolve();
    }
    const start = Number(paintWheel.ballAngle) || 0;
    const turns = 360 * 3 + end;
    orbit.style.transition = 'transform 2.2s cubic-bezier(0.18, 0.82, 0.22, 1)';
    ball.style.transition = 'top 0.85s cubic-bezier(0.22, 0.9, 0.28, 1), opacity 120ms linear';
    placeLifePreserverBall(start, 46, 1);
    orbit.offsetHeight;
    placeLifePreserverBall(turns, 46, 1);
    window.setTimeout(() => {
      placeLifePreserverBall(turns, 39, 1);
      paintWheel.ballParked = true;
    }, 1680);
    return Promise.resolve();
  }

  function resetLifePreserverBall() {
    const { orbit, ball } = ballNodes();
    if (orbit) orbit.style.transition = 'none';
    if (ball) ball.style.transition = 'none';
    paintWheel.ballParked = false;
    paintWheel.ballReady = true;
    paintWheel.highlightKey = null;
    placeLifePreserverBall(0, 46, 1);
  }

  function highlightLifePreserverPocket(slice) {
    const LP = window.BPGLifePreserver || {};
    paintWheel.highlightKey = slice && typeof LP.outcomeKey === 'function'
      ? LP.outcomeKey(slice)
      : (slice ? `${slice.kind}:${slice.adjustment}` : null);
    paintWheel();
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
    if (action === 'edit-seating') {
      editing = !editing;
      paintHome();
    } else if (action === 'seat-up' || action === 'seat-down') {
      slice2ReorderSeat(Number(target.dataset.s2Index), action === 'seat-up' ? -1 : 1);
    } else if (action === 'seat-out') {
      const table = state();
      const player = table.players[Number(target.dataset.s2Index)];
      if (player) moveToBench(player);
    } else if (action === 'deck-add') {
      moveToLineup(target.dataset.s2Player || '');
    } else if (action === 'pick-game') {
      selected = target.dataset.s2Game || selected;
      paintHome();
    } else if (action === 'start-game') {
      startGame(selected);
    } else if (action === 'resume' || action === 'scorecard') {
      goActiveMatch();
    } else if (action === 'night-open' || action === 'night-scorecard') {
      const id = coerceMatchId(target.dataset.s2Id);
      if (id != null && typeof openScorecard === 'function') openScorecard(id);
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
    } else if (action === 'enter-round') {
      enterRound();
    } else if (action === 'show-fame' || action === 'show-shame') {
      shamePane = action === 'show-shame';
      paintRecords();
    }
  }

  function onSubmit(event) {
    const form = event.target.closest?.('[data-s2-action="add-form"]');
    if (!form) return;
    event.preventDefault();
    const field = document.getElementById('slice2-add-name');
    const input = document.getElementById('quick-add-player');
    if (!field || !input) return;
    input.value = field.value;
    addPlayerToAll();
    field.value = '';
  }

  function onChange(event) {
    const select = event.target.closest?.('[data-s2-action="game-rules"]');
    if (!select) return;
    const name = select.value;
    if (!name) return;
    if (typeof openGameRules === 'function') openGameRules(name);
    select.value = '';
  }

  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    if (window.matchMedia) {
      window.matchMedia('(max-width: 760px)').addEventListener('change', () => paintNav());
    }
    window.addEventListener('resize', () => {
      if (document.getElementById('wheel-modal')?.classList.contains('hidden')) return;
      sizeLifePreserverModal();
      paintWheel();
    });
  }

  function refresh(which) {
    wire();
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
    paintWheel,
    parkSaveIndicator,
    sizeLifePreserverModal,
    wheelLabelReport,
    animateLifePreserverBall,
    resetLifePreserverBall,
    placeLifePreserverBall,
    highlightLifePreserverPocket
  };
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', () => { boot(); });
})();
