/* Warm Porch Ledger interactions. Always loaded. */
(function () {
  const GAMES = [
    { id: 'Five Crowns', title: 'Five Crowns', art: 'five', line: '11 rounds · Lowest total wins', detail: () => '11 rounds' },
    { id: '818', title: '818', art: '818', line: '15 rounds · Highest total wins', detail: () => '15 rounds' },
    { id: 'Wizard', title: 'Wizard', art: 'wizard', line: 'Highest total wins', detail: (count) => `${Math.max(1, Math.floor(60 / Math.max(count, 1)))} rounds` },
    { id: 'Flip 7 Vengeance', title: 'Flip 7', art: 'flip7', line: 'Highest total wins · Open match', detail: () => 'Open match' },
    { id: 'Beat the Heat', title: 'Beat the Heat', art: 'heat', line: 'Lowest heat wins · Ends at 66', detail: () => 'Ends at 66' },
    { id: 'Rook', title: 'Rook', art: 'rook', line: 'Highest total wins · Teams', detail: () => 'Teams' }
  ];

  let editing = false;
  let selected = 'Five Crowns';
  let recordsPane = 'overview';
  let recordsGameFilter = '';
  let recordsPlayerFilter = '';
  const expandedNights = new Set();
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
    return GAMES.find((game) => game.id === id) || GAMES[0];
  }

  function dealerOf(table) {
    if (table.currentGame) return getCurrentDealerName(table.currentGame);
    return table.players[0] || '';
  }

  function leaderBit(game) {
    if (!game || (game.currentRound || 1) <= 1) return '';
    const table = getActivePlayers(game);
    if (!table.length) return '';
    const low = game.name === 'Five Crowns' || game.name === 'Beat the Heat';
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

  function boardLine(game) {
    const bits = [game.name === 'Flip 7 Vengeance' ? 'Flip 7' : game.name];
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
          <p id="slice2-board-line"></p>
          <p id="slice2-board-sub"></p>
          <p id="slice2-score-legend"></p>
          <p id="slice2-score-note"></p>
        </div>
      </div>
      <div class="s2-board-actions">
        <div id="slice2-lp-wrap" hidden>
          <button type="button" class="s2-btn" id="slice2-lp-btn" data-s2-action="life-preserver">Life Preserver</button>
          <p id="slice2-lp-explain"></p>
        </div>
        <button type="button" class="s2-btn" id="slice2-history-btn" data-s2-action="history">Audit Log</button>
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
    const meta = gameMeta(selected);
    const seated = table.players.length;
    const bench = table.allPlayers.filter((player) => !table.players.includes(player));
    const banner = table.currentGame ? (() => {
      const game = table.currentGame;
      const maxR = getMaxRoundsForGame(game);
      const title = maxR && maxR < 900
        ? `Resume ${game.name === 'Flip 7 Vengeance' ? 'Flip 7' : game.name} · Round ${game.currentRound} of ${maxR} · ${getActivePlayers(game).length} Players`
        : `Resume ${game.name === 'Flip 7 Vengeance' ? 'Flip 7' : game.name} · Round ${game.currentRound} · ${getActivePlayers(game).length} Players`;
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
    const cards = GAMES.map((game) => {
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
      const label = match.game === 'Flip 7 Vengeance' ? 'Flip 7' : (match.game || 'Match');
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
    if (!bar.querySelector('#slice2-table-btn')) {
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
        copy.insertBefore(row, line);
        row.appendChild(line);
      }
    }
    parkSaveIndicator();
    const legend = document.getElementById('slice2-score-legend');
    const historyButton = document.getElementById('slice2-history-btn');
    const lpWrap = document.getElementById('slice2-lp-wrap');
    const lpBtn = document.getElementById('slice2-lp-btn');
    const lpExplain = document.getElementById('slice2-lp-explain');
    if (line) line.textContent = boardLine(currentGame);
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
    if (historyButton) {
      const count = (currentGame.auditLog || []).length || (currentGame.rounds || []).length;
      historyButton.textContent = count ? `Audit Log (${count})` : 'Audit Log';
    }
    const eligible = eligibleLifePreserverPlayers();
    if (lpWrap) lpWrap.hidden = eligible.length === 0;
    if (lpBtn) {
      lpBtn.hidden = eligible.length === 0;
      lpBtn.textContent = eligible.length
        ? `Life Preserver · ${eligible.length} eligible`
        : 'Life Preserver';
    }
    if (lpExplain) {
      lpExplain.hidden = eligible.length === 0;
      lpExplain.textContent = eligible.length
        ? `${andList(eligible)} can spin. One spin per player per match.`
        : '';
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
        sortPlayersByTotal,
        competitionPlaces,
        escapeHtml,
        getAvatarImg,
        compact: recordsCompact(),
        gameFilter: recordsGameFilter,
        playerFilter: recordsPlayerFilter,
        expandedNights
      });
    }
    if (!document.getElementById('history-screen')?.classList.contains('hidden')) switchTab('hall-of-fame-view');
  }

  function placeWheelCallouts(canvas, context, callouts, outer) {
    let layer = document.getElementById('wheel-callouts');
    if (!layer && canvas.parentElement) {
      layer = document.createElement('div');
      layer.id = 'wheel-callouts';
      layer.className = 'wheel-callouts';
      canvas.parentElement.appendChild(layer);
    }
    if (!layer) return;
    layer.replaceChildren();
    if (!callouts.length) return;
    const shellW = canvas.clientWidth;
    const shellH = canvas.clientHeight;
    if (!shellW || !shellH || shellW < 80) {
      if (!placeWheelCallouts._retry) {
        placeWheelCallouts._retry = true;
        requestAnimationFrame(() => {
          placeWheelCallouts._retry = false;
          placeWheelCallouts(canvas, context, callouts, outer);
        });
      }
      return;
    }
    const shell = canvas.parentElement;
    const layerW = (shell && shell.clientWidth) || shellW;
    const layerH = (shell && shell.clientHeight) || shellH;
    const canvasLeft = canvas.offsetLeft || 0;
    const canvasTop = canvas.offsetTop || 0;
    const cssCx = canvasLeft + shellW / 2;
    const cssCy = canvasTop + shellH / 2;
    const scale = canvas.width / shellW;
    const bandR = (outer / canvas.width) * shellW;
    const pad = 6;
    const boxes = [];
    const clamp = (value, min, max) => {
      if (min > max) return (min + max) / 2;
      return Math.min(max, Math.max(min, value));
    };
    const overlap = (a, b) => (
      a.x < b.x + b.w + 6 && a.x + a.w + 6 > b.x && a.y < b.y + b.h + 6 && a.y + a.h + 6 > b.y
    );
    const shellBox = (shell && shell.getBoundingClientRect()) || canvas.getBoundingClientRect();
    const pointerEl = (shell && shell.querySelector('.wheel-pointer')) || document.querySelector('.wheel-pointer');
    const pointerPad = 10;
    let pointerBox = { x: cssCx - 22, y: -4, w: 44, h: 40 };
    if (pointerEl) {
      const pointer = pointerEl.getBoundingClientRect();
      pointerBox = {
        x: pointer.left - shellBox.left - pointerPad,
        y: pointer.top - shellBox.top - pointerPad,
        w: pointer.width + pointerPad * 2,
        h: pointer.height + pointerPad * 2
      };
    }
    const hitsPointer = (box) => overlap(box, pointerBox);
    callouts.forEach((item, index) => {
      const el = document.createElement('span');
      el.className = `wheel-callout is-${item.kind || 'zero'}`;
      el.textContent = item.signed;
      layer.appendChild(el);
      const bw = Math.max(el.getBoundingClientRect().width, el.offsetWidth, 36);
      const bh = Math.max(el.getBoundingClientRect().height, el.offsetHeight, 20);
      const minX = pad + bw / 2;
      const maxX = layerW - pad - bw / 2;
      const minY = pad + bh / 2;
      const maxY = layerH - pad - bh / 2;
      const left = Math.cos(item.mid) < -0.18;
      const right = Math.cos(item.mid) > 0.18;
      const low = Math.sin(item.mid) > 0.12;
      const high = Math.sin(item.mid) < -0.12;
      const topCone = Math.sin(item.mid) < -0.55;
      const gutter = bandR + 10 + Math.max(bw, bh) / 2;
      const stack = index * (bh + 8);
      const side = Math.cos(item.mid) >= 0 ? 1 : -1;
      const candidates = [];
      if (topCone || high) {
        candidates.push(
          { x: clamp(cssCx + side * Math.max(52, bw + 18), minX, maxX), y: minY + 4 },
          { x: clamp(cssCx - side * Math.max(52, bw + 18), minX, maxX), y: minY + 4 },
          { x: clamp(cssCx + side * Math.max(52, bw + 18), minX, maxX), y: minY + bh + 12 }
        );
      }
      if (left) {
        candidates.push({ x: minX, y: clamp(cssCy + (low ? 28 + stack : high ? -28 - stack : (index % 2 ? 22 : -22)), minY, maxY) });
      }
      if (right) {
        candidates.push({ x: maxX, y: clamp(cssCy + (low ? 28 + stack : high ? -28 - stack : (index % 2 ? 22 : -22)), minY, maxY) });
      }
      [gutter, gutter + 8, gutter + 16].forEach((radius) => {
        const ang = topCone ? item.mid + side * 0.55 : item.mid;
        candidates.push({
          x: cssCx + Math.cos(ang) * radius,
          y: cssCy + Math.sin(ang) * radius
        });
      });
      let chosen = {
        x: clamp(cssCx + side * Math.max(52, bw + 18), minX, maxX),
        y: topCone ? minY + 4 : clamp(cssCy, minY, maxY)
      };
      candidates.some((spot) => {
        const x = clamp(spot.x, minX, maxX);
        const y = clamp(spot.y, minY, maxY);
        const box = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
        const onBand = Math.hypot(x - cssCx, y - cssCy) < bandR + 4;
        if (onBand || hitsPointer(box) || boxes.some((other) => overlap(box, other))) return false;
        chosen = { x, y };
        return true;
      });
      chosen.x = clamp(chosen.x, minX, maxX);
      chosen.y = clamp(chosen.y, minY, maxY);
      const nudges = [
        { x: chosen.x + 36, y: chosen.y },
        { x: chosen.x - 36, y: chosen.y },
        { x: chosen.x, y: chosen.y + 28 },
        { x: chosen.x, y: chosen.y - 28 },
        { x: chosen.x + 48, y: chosen.y + 20 },
        { x: chosen.x - 48, y: chosen.y + 20 }
      ];
      let safe = { x: chosen.x - bw / 2, y: chosen.y - bh / 2, w: bw, h: bh };
      if (hitsPointer(safe) || boxes.some((other) => overlap(safe, other))) {
        nudges.some((spot) => {
          const x = clamp(spot.x, minX, maxX);
          const y = clamp(spot.y, minY, maxY);
          const box = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
          if (hitsPointer(box) || boxes.some((other) => overlap(box, other))) return false;
          chosen = { x, y };
          return true;
        });
      }
      el.style.left = `${chosen.x}px`;
      el.style.top = `${chosen.y}px`;
      const box = { x: chosen.x - bw / 2, y: chosen.y - bh / 2, w: bw, h: bh, cx: chosen.x, cy: chosen.y };
      boxes.push(box);
      const fromX = (canvas.width / 2) + Math.cos(item.mid) * (outer - 4);
      const fromY = (canvas.height / 2) + Math.sin(item.mid) * (outer - 4);
      const toX = (box.cx - canvasLeft) * scale;
      const toY = (box.cy - canvasTop) * scale;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.hypot(dx, dy) || 1;
      const stop = ((Math.min(bw, bh) / 2) + 10) * scale;
      const t = Math.max(0, (dist - stop) / dist);
      if (t > 0.08) {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(fromX + dx * t, fromY + dy * t);
        context.strokeStyle = 'rgba(8, 87, 79, 0.4)';
        context.lineWidth = 2;
        context.stroke();
      }
    });
  }

  function paintWheel() {
    const canvas = document.getElementById('wheel-canvas');
    const live = (typeof getWheelSlices === 'function' ? getWheelSlices() : []) || [];
    const slices = live.length ? live : (paintWheel.lastSlices || []);
    if (!canvas) return slices;
    const context = canvas.getContext('2d');
    if (!slices.length) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const empty = document.getElementById('wheel-callouts');
      if (empty) empty.replaceChildren();
      return slices;
    }
    paintWheel.lastSlices = slices;
    const total = slices.reduce((sum, slice) => sum + (Number(slice.weight) || 0), 0) || 1;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = canvas.clientWidth ? canvas.width / canvas.clientWidth : 1;
    const outer = cx * 0.70;
    const inner = cx * 0.14;
    const midR = (inner + outer) / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.arc(cx, cy, cx * 0.98, 0, Math.PI * 2);
    context.fillStyle = '#f4efe4';
    context.fill();
    let angle = -Math.PI / 2;
    const callouts = [];
    slices.forEach((slice) => {
      const arc = ((Number(slice.weight) || 0) / total) * Math.PI * 2;
      const kind = (window.BPGLifePreserver && typeof BPGLifePreserver.wheelSliceKind === 'function')
        ? BPGLifePreserver.wheelSliceKind(slice)
        : (slice.kind || (slice.adjustment === 0 ? 'zero' : 'good'));
      context.beginPath();
      context.arc(cx, cy, outer, angle, angle + arc);
      context.arc(cx, cy, inner, angle + arc, angle, true);
      context.closePath();
      context.fillStyle = slice.color || (kind === 'good' ? '#34d399' : (kind === 'bad' ? '#f0a394' : '#c4b8ae'));
      context.fill();
      context.strokeStyle = 'rgba(8, 87, 79, 0.35)';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      context.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      context.stroke();
      const mid = angle + arc / 2;
      const signed = (window.BPGLifePreserver && typeof BPGLifePreserver.formatSignedPoints === 'function')
        ? BPGLifePreserver.formatSignedPoints(slice.adjustment)
        : String(slice.adjustment || '0');
      const chord = 2 * Math.sin(arc / 2) * midR;
      const font = Math.max(34, Math.min(52, 18 * scale, chord * 0.5));
      context.font = `800 ${font}px "Nunito Sans", sans-serif`;
      const textW = context.measureText(signed).width;
      const roomy = kind !== 'bad' && arc >= Math.PI * 2 * 0.10 && textW < chord * 0.78;
      context.fillStyle = kind === 'bad' ? '#3b1410' : (kind === 'good' ? '#04332e' : '#3f3a36');
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      if (roomy) {
        context.fillText(signed, cx + Math.cos(mid) * midR, cy + Math.sin(mid) * midR);
      } else {
        callouts.push({ mid, signed, kind, font: Math.max(32, 16 * scale) });
      }
      slice._start = angle;
      slice._end = angle + arc;
      angle += arc;
    });
    placeWheelCallouts(canvas, context, callouts, outer);
    context.beginPath();
    context.arc(cx, cy, outer, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(138, 106, 50, 0.7)';
    context.lineWidth = 3;
    context.stroke();
    context.beginPath();
    context.arc(cx, cy, inner - 2, 0, Math.PI * 2);
    context.fillStyle = '#f7f3ea';
    context.fill();
    context.strokeStyle = 'rgba(138, 106, 50, 0.4)';
    context.lineWidth = 4;
    context.stroke();
    const hub = document.querySelector('.wheel-spinner-hub');
    const resultOpen = !document.getElementById('wheel-result')?.classList.contains('hidden');
    if (hub) hub.textContent = resultOpen ? '' : 'SPIN';
    const mode = document.getElementById('wheel-mode-label');
    if (mode && !resultOpen) mode.textContent = 'Life Preserver';
    canvas.dataset.slice2Wheel = '1';
    return slices;
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
      const player = firstEligible();
      if (player) authorizeHailMary(player);
      else openLifePreserverRules();
    } else if (action === 'history') {
      openAuditLog();
    } else if (action === 'enter-round') {
      enterRound();
    } else if (action === 'show-fame' || action === 'show-shame' || action === 'show-nights') {
      setRecordsPane(action === 'show-shame' ? 'explore' : (action === 'show-nights' ? 'nights' : 'overview'));
    } else if (action === 'night-expand') {
      const id = String(target.dataset.s2Id || '');
      if (id) expandedNights.add(id);
      paintRecords();
    } else if (action === 'open-profile') {
      const name = target.dataset.s2Player || '';
      if (name && typeof openProfileDetail === 'function') openProfileDetail(name);
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
    const target = event.target.closest?.('[data-s2-action]');
    if (!target) return;
    const action = target.dataset.s2Action;
    if (action === 'filter-game') {
      recordsGameFilter = target.value || '';
      paintRecords();
    } else if (action === 'filter-player') {
      recordsPlayerFilter = target.value || '';
      paintRecords();
    }
  }

  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onChange);
    if (window.matchMedia) {
      window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
        paintNav();
        paintRecords();
      });
    }
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
    else if (view === 'records-shame') {
      shamePane = true;
      showHistory();
      paintRecords();
    } else if (view === 'entry') openScoreEntryModal();
    else if (view === 'error-entry') {
      if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
      if (typeof showScoreEntryError === 'function') {
        showScoreEntryError('Bids must be whole numbers from 0 through this round.');
      }
    } else if (view === 'settings-backup') {
      if (typeof openSettings === 'function') openSettings();
      document.querySelector('.local-storage-statement, #backup-device-summary')?.scrollIntoView({block: 'center'});
    } else if (view === 'rook-contract') {
      if (typeof openRookSetupModal === 'function') openRookSetupModal();
    } else if (view === 'rook-call') {
      const bidder = currentGame?.rookHighBidder || (typeof getActivePlayers === 'function' ? getActivePlayers(currentGame)[0] : '');
      const bid = currentGame?.rookHighBid || currentGame?.rookConfig?.minBid || 70;
      if (typeof openRookCallModal === 'function') openRookCallModal(bidder, bid);
    } else if (view === 'rook-results') {
      if (typeof openRookResultsModal === 'function') openRookResultsModal();
    } else if (view === 'wheel') {
      const player = firstEligible();
      if (player) authorizeHailMary(player);
    } else if (view === 'wheel-after') {
      const used = (currentGame?.hailMaryUsed || [])[0];
      const player = used || firstEligible();
      if (player && typeof authorizeHailMary === 'function' && !(currentGame?.hailMaryUsed || []).includes(player)) {
        authorizeHailMary(player);
      } else if (player && typeof authorizeHailMary === 'function') {
        wheelPlayer = player;
        if (typeof drawWheel === 'function') drawWheel();
        if (typeof openModal === 'function') openModal('wheel-modal');
      }
      if (typeof showLifePreserverResult === 'function') {
        const adj = 20;
        const total = (Number(currentGame?.totals?.[player]) || 0);
        showLifePreserverResult({player, adj, label: '+20', total, place: 2});
      }
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

  window.BPGSlice2 = { refresh, paintWheel, parkSaveIndicator, setRecordsPane };
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', () => { boot(); });
})();
