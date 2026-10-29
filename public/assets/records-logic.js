/* Records book helpers. Presentation plus the definitions tests lock. */
(function (root) {
  'use strict';

  // Win rate leaders need this many completed matches. Career rows still print
  // the raw fraction. Matt can move this threshold; keep the denominator.
  const WIN_RATE_MIN_GAMES = 5;

  // Saved Canasta nights keep the Hand and Foot game id.
  const GAMES = [
    { id: 'Five Crowns', title: 'Five Crowns', unit: 'pts', winLow: true, art: 'five' },
    { id: '818', title: '818', unit: 'pts', winLow: false, art: '818' },
    { id: 'Wizard', title: 'Wizard', unit: 'pts', winLow: false, art: 'wizard' },
    { id: 'Flip 7 Vengeance', title: 'Flip 7', unit: 'pts', winLow: false, art: 'flip7' },
    { id: 'Beat the Heat', title: 'Beat the Heat', unit: 'heat', winLow: true, art: 'heat' },
    { id: 'Hand and Foot', title: 'Canasta', unit: 'pts', winLow: false, art: 'canasta' },
    { id: 'Rook', title: 'Rook', unit: 'pts', winLow: false, art: 'rook', hidden: true }
  ];

  // Single-match exact-bid rate needs this many classified bids. Career Wizard
  // exact rate still uses 10. No older floor existed on the one-match rows.
  const SINGLE_MATCH_BID_RATE_MIN = 5;

  function singleMatchBidRateEligible(bidTotal) {
    return (Number(bidTotal) || 0) >= SINGLE_MATCH_BID_RATE_MIN;
  }

  const WIZARD_PLAYER_COUNTS = [4, 5, 6, 7, 8];

  // Primary labels are the claim. Fun subtitles stay on a few Shame rows only.
  const SHAME_CATALOG = [
    { id: 'fc-worst-final', name: 'Worst final score · Five Crowns', subtitle: '', oldName: 'The Disaster Award' },
    { id: 'fc-worst-round', name: 'Highest single-round score', subtitle: 'Crash and Burn', oldName: 'The Crash and Burn' },
    { id: 'e818-worst-final', name: 'Worst final score · 818', subtitle: '', oldName: 'The 818 Brick' },
    { id: 'heat-worst-final', name: 'Worst final score · Beat the Heat', subtitle: 'Meltdown', oldName: 'The Meltdown' },
    { id: 'wizard-missed', name: 'Most missed bids · Wizard', subtitle: '', oldName: 'The Overconfident' },
    { id: 'no-wins', name: 'Most games without a win', subtitle: '', oldName: 'The Invisible Man' },
    { id: 'last-streak', name: 'Most consecutive last-place finishes', subtitle: '', oldName: 'The Slow Learner' },
    { id: 'wizard-exact', name: 'Best career exact-bid rate · Wizard', subtitle: '', oldName: 'The Sharp Shooter' },
    { id: 'comeback-wins', name: 'Wins from a stored-halftime deficit', subtitle: '', oldName: 'The Comeback Kid' },
    { id: 'win-streak', name: 'Longest winning streak', subtitle: '', oldName: 'The Streaker' }
  ];

  function gameMeta(id) {
    return GAMES.find((game) => game.id === id) || GAMES[0];
  }

  function gameTitle(id) {
    return gameMeta(id).title;
  }

  function isWinLow(id) {
    return !!gameMeta(id).winLow;
  }

  function parseHistoryDate(value) {
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const raw = String(value || '').trim();
    if (!raw) return null;
    const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (us) {
      const month = Number(us[1]);
      const day = Number(us[2]);
      let year = Number(us[3]);
      if (year < 100) year += 2000;
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }
    const iso = new Date(raw);
    return isNaN(iso.getTime()) ? null : iso;
  }

  function nightTime(match) {
    const parsed = parseHistoryDate(match && match.date);
    if (parsed) return parsed.getTime();
    const id = Number(match && match.id);
    return Number.isFinite(id) ? id : 0;
  }

  function compareNightsByDate(a, b) {
    const delta = nightTime(b) - nightTime(a);
    if (delta) return delta;
    return (Number(b && b.id) || 0) - (Number(a && a.id) || 0);
  }

  function sortNights(history) {
    return (history || []).slice().sort(compareNightsByDate);
  }

  function eveningKey(match) {
    const parsed = parseHistoryDate(match && match.date);
    if (!parsed) return String(match && match.date || 'undated');
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  function eveningLabel(match) {
    const parsed = parseHistoryDate(match && match.date);
    if (!parsed) return String(match && match.date || '');
    return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function groupNightsByEvening(history) {
    const groups = [];
    const seen = new Map();
    sortNights(history).forEach((match) => {
      const key = eveningKey(match);
      if (!seen.has(key)) {
        const group = { key, label: eveningLabel(match), matches: [] };
        seen.set(key, group);
        groups.push(group);
      }
      seen.get(key).matches.push(match);
    });
    return groups;
  }

  function winRateEligible(games, min) {
    return (Number(games) || 0) >= (min == null ? WIN_RATE_MIN_GAMES : min);
  }

  function formatNightCount(n) {
    const count = Math.max(0, Number(n) || 0);
    return count === 1 ? '1 night' : `${count} nights`;
  }

  function formatCompletedMatches(n) {
    return formatPlural(n, 'completed match', 'completed matches');
  }

  function formatPlural(n, singular, plural) {
    const count = Math.max(0, Number(n) || 0);
    const word = count === 1 ? singular : (plural || `${singular}s`);
    return `${count} ${word}`;
  }

  function formatWinsGames(wins, games) {
    return `${formatPlural(wins, 'win')} · ${formatPlural(games, 'game')}`;
  }

  function visibleRecordGames(history) {
    const Games = (typeof globalThis !== 'undefined' && globalThis.BPGGames) || null;
    return GAMES.filter((game) => {
      if (!game.hidden) return true;
      const hasCompleted = (history || []).some((match) => match && match.game === game.id && isCompletedMatch(match));
      if (hasCompleted) return true;
      if (Games && typeof Games.isHiddenGameVisible === 'function') {
        const meta = Games.gameById ? Games.gameById(game.id) : null;
        return meta ? Games.isHiddenGameVisible(meta) : false;
      }
      return false;
    });
  }

  function formatWinRate(wins, games) {
    const played = Number(games) || 0;
    const taken = Number(wins) || 0;
    if (played <= 0) return '';
    const pct = Math.round((taken / played) * 100);
    return `${pct}% · ${taken} of ${played}`;
  }

  function formatWinRateDenom(wins, games) {
    const played = Number(games) || 0;
    const taken = Number(wins) || 0;
    if (played <= 0) return '';
    return `${taken} of ${played}`;
  }

  function rankWinRates(players, min) {
    const floor = min == null ? WIN_RATE_MIN_GAMES : min;
    const eligible = (players || []).filter((player) => winRateEligible(player.games, floor));
    eligible.sort((a, b) => {
      const ar = a.games ? a.wins / a.games : 0;
      const br = b.games ? b.wins / b.games : 0;
      return br - ar || b.wins - a.wins || b.games - a.games || String(a.name || a.player).localeCompare(String(b.name || b.player));
    });
    if (!eligible.length) return { leader: null, ties: [] };
    const topRate = eligible[0].wins / eligible[0].games;
    const ties = eligible.filter((player) => player.games && player.wins / player.games === topRate);
    return {
      leader: ties[0],
      ties,
      label: formatWinRate(ties[0].wins, ties[0].games)
    };
  }

  function formatTiedNames(records, nameOf) {
    const names = (records || []).map((row) => nameOf ? nameOf(row) : (row.player || row.name || '')).filter(Boolean);
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  }

  function keepBestWithTies(current, next, better) {
    if (!next) return current || null;
    if (!current) return Object.assign({}, next, { ties: [next] });
    if (next.value === current.value) {
      const existing = current.ties || [current];
      const name = next.player || next.name;
      if (name && existing.some((row) => (row.player || row.name) === name)) return current;
      return Object.assign({}, current, { ties: existing.concat([next]) });
    }
    if (better(next, current)) return Object.assign({}, next, { ties: [next] });
    return current;
  }

  function pairKey(a, b) {
    return [a, b].slice().sort().join('|||');
  }

  function addPairFinish(map, a, b, winner, match) {
    const key = pairKey(a, b);
    if (!map[key]) {
      const names = [a, b].slice().sort();
      map[key] = { a: names[0], b: names[1], together: 0, aWins: 0, bWins: 0, events: [] };
    }
    const pair = map[key];
    pair.together += 1;
    if (winner === pair.a) pair.aWins += 1;
    if (winner === pair.b) pair.bWins += 1;
    pair.events.push({
      date: match && match.date,
      id: match && match.id,
      winner: winner || null,
      game: match && match.game
    });
    return pair;
  }

  function pairWinnerFromScores(gameId, scoreA, scoreB, nameA, nameB) {
    if (scoreA === scoreB) return null;
    const low = isWinLow(gameId);
    if (low) return scoreA < scoreB ? nameA : nameB;
    return scoreA > scoreB ? nameA : nameB;
  }

  function collectPairFinishes(history, options) {
    const map = {};
    const completed = options && options.isCompleted ? options.isCompleted : function () { return true; };
    (history || []).forEach((match) => {
      if (!completed(match) || !match || !match.totals) return;
      const names = Object.keys(match.totals).filter(Boolean);
      for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
          const a = names[i];
          const b = names[j];
          const winner = pairWinnerFromScores(match.game, match.totals[a], match.totals[b], a, b);
          addPairFinish(map, a, b, winner, match);
        }
      }
    });
    return map;
  }

  // Head-to-head is who finished ahead in a shared completed match, not who
  // took the night. Ties do not move the count. Names stay alphabetical on the
  // pair so aWins always belongs to pair.a.
  function headToHeadLead(pair) {
    if (!pair) return { leader: '', leaderWins: 0, trailerWins: 0, even: true, text: 'Even', together: 0, ties: 0, scoreline: '' };
    const aWins = Number(pair.aWins) || 0;
    const bWins = Number(pair.bWins) || 0;
    const together = Number(pair.together) || 0;
    const ties = Math.max(0, together - aWins - bWins);
    const even = aWins === bWins;
    const leader = even ? '' : (aWins > bWins ? pair.a : pair.b);
    const leaderWins = Math.max(aWins, bWins);
    const trailerWins = Math.min(aWins, bWins);
    const scoreline = `${pair.a} ${aWins} · ${pair.b} ${bWins}${ties ? ` · Tied ${ties}` : ''}`;
    return {
      leader,
      leaderWins,
      trailerWins,
      even,
      together,
      ties,
      scoreline,
      text: even ? 'Even' : `${leader} leads ${leaderWins}-${trailerWins}`
    };
  }

  function summarizeRivalries(pairMap, minTogether) {
    const floor = minTogether == null ? 5 : minTogether;
    return Object.values(pairMap || {}).filter((pair) => pair.together >= floor).map((pair) => {
      const lead = headToHeadLead(pair);
      const ordered = pair.events.slice().sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      const recent = ordered[0];
      let streakWinner = recent && recent.winner || null;
      let streak = 0;
      for (const ev of ordered) {
        if (!streakWinner || ev.winner !== streakWinner) break;
        streak += 1;
      }
      return Object.assign({}, pair, lead, {
        edgePlayer: lead.even ? 'Even' : lead.leader,
        edgePct: pair.together ? Math.round(lead.leaderWins / pair.together * 100) : 0,
        recent,
        streakWinner,
        streak
      });
    });
  }

  function isCompletedMatch(match, scorebook) {
    if (scorebook && typeof scorebook.isCompletedHistoryMatch === 'function') {
      return scorebook.isCompletedHistoryMatch(match);
    }
    return !!(match && match.completed !== false);
  }

  function isAssistedMatch(match, scorebook) {
    if (scorebook && typeof scorebook.isAssistedMatch === 'function') {
      return scorebook.isAssistedMatch(match);
    }
    return !!(match && match.assistedMatch);
  }

  function shouldShowResume(match, scorebook) {
    return !isCompletedMatch(match, scorebook);
  }

  function scoringRoundCount(match, scorebook) {
    if (scorebook && typeof scorebook.scoringRoundCount === 'function') {
      return scorebook.scoringRoundCount(match && match.rounds);
    }
    return (match && match.rounds || []).filter((round) => round && !round.hailMaryBonus).length;
  }

  function throughRound(match, scorebook) {
    const played = scoringRoundCount(match, scorebook);
    if (played) return played;
    const current = Number(match && match.currentRound) || 0;
    return current > 0 ? current - 1 : 0;
  }

  function matchHasComebackData(match) {
    return (match && match.rounds || []).some((round) => {
      if (!round || !round.comeback) return false;
      return Object.keys(round.comeback).some((name) => Number(round.comeback[name]));
    });
  }

  function shouldShowComebackStats(history) {
    return (history || []).some(matchHasComebackData);
  }

  function nightStandings(match, helpers) {
    const cfg = helpers.configs[match.game];
    if (!cfg) return [];
    const players = helpers.getDisplayPlayers(match);
    const sorted = helpers.sortPlayersByTotal(players, match.totals || {}, cfg);
    const places = helpers.competitionPlaces(sorted, match.totals || {});
    const winners = match.winners || [];
    return sorted.map((name) => ({
      name,
      score: match.totals ? match.totals[name] : undefined,
      place: places[name],
      isWinner: winners.includes(name),
      retired: (match.retired || []).includes(name)
    }));
  }

  function nightPodium(match, helpers) {
    const incomplete = !isCompletedMatch(match, helpers && helpers.scorebook);
    if (incomplete) return { incomplete: true, places: [] };
    const grouped = new Map();
    nightStandings(match, helpers).forEach((row) => {
      const place = Number(row.place);
      if (!Number.isFinite(place) || place < 1 || place > 3) return;
      if (!grouped.has(place)) grouped.set(place, []);
      grouped.get(place).push({
        name: row.name,
        score: row.score,
        retired: !!row.retired,
        isWinner: !!row.isWinner
      });
    });
    return {
      incomplete: false,
      places: [...grouped.keys()].sort((a, b) => a - b).map((place) => ({
        place,
        people: grouped.get(place)
      }))
    };
  }

  function winnerText(winners, standings) {
    const fromList = (standings || []).filter((row) => row.isWinner).map((row) => row.name);
    const names = fromList.length ? fromList : (winners || []).filter(Boolean);
    if (!names.length) return '';
    if (names.length === 1) return `${names[0]} won`;
    return `${formatTiedNames(names.map((name) => ({ player: name })))} won`;
  }

  function nightCardModel(match, helpers) {
    const scorebook = helpers.scorebook;
    const incomplete = !isCompletedMatch(match, scorebook);
    const assisted = isAssistedMatch(match, scorebook);
    const winners = incomplete ? [] : (match.winners || []).filter(Boolean);
    const standings = nightStandings(match, helpers);
    const rounds = scoringRoundCount(match, scorebook);
    return {
      id: match.id,
      game: match.game,
      gameTitle: gameTitle(match.game),
      date: match.date || '',
      evening: eveningLabel(match),
      incomplete,
      assisted,
      retired: (match.retired || []).filter(Boolean),
      throughRound: throughRound(match, scorebook),
      rounds,
      winners,
      winnerText: incomplete ? '' : winnerText(winners, standings),
      standings,
      showResume: shouldShowResume(match, scorebook),
      showScorecard: true,
      showFinal: !incomplete
    };
  }

  function totalsThrough(match, endIndex, helpers) {
    const totals = {};
    const roster = helpers.getDisplayPlayers(match);
    roster.forEach((name) => { totals[name] = 0; });
    (match.rounds || []).slice(0, endIndex).forEach((round) => {
      Object.entries(round && round.scores || {}).forEach(([name, score]) => {
        if (totals[name] === undefined) return;
        if (round.joinBonus && round.joinBonus[name]) return;
        totals[name] += Number(score) || 0;
        if (round.comeback && round.comeback[name]) totals[name] += Number(round.comeback[name]) || 0;
      });
    });
    return totals;
  }

  function placeOf(match, totals, player, helpers) {
    const cfg = helpers.configs[match.game];
    if (!cfg) return 0;
    const roster = Object.keys(totals);
    const sorted = helpers.sortPlayersByTotal(roster, totals, cfg);
    const places = helpers.competitionPlaces(sorted, totals);
    return places[player] || 0;
  }

  // Places gained are the standings change on the spin itself. A later win is
  // not credited to the Life Preserver.
  function lifePreserverEvents(history, helpers) {
    const events = [];
    (history || []).forEach((match) => {
      if (!isCompletedMatch(match, helpers && helpers.scorebook)) return;
      (match.rounds || []).forEach((round, index) => {
        if (!round || !round.hailMaryBonus) return;
        Object.entries(round.scores || {}).forEach(([player, raw]) => {
          const adjustment = Number(raw) || 0;
          const beforeTotals = totalsThrough(match, index, helpers);
          const afterTotals = Object.assign({}, beforeTotals);
          if (afterTotals[player] === undefined) afterTotals[player] = 0;
          afterTotals[player] += adjustment;
          const placeBefore = placeOf(match, beforeTotals, player, helpers);
          const placeAfter = placeOf(match, afterTotals, player, helpers);
          events.push({
            player,
            adjustment,
            placeBefore,
            placeAfter,
            placesGained: placeBefore && placeAfter ? placeBefore - placeAfter : 0,
            game: match.game,
            date: match.date,
            id: match.id
          });
        });
      });
    });
    return events;
  }

  function lifePreserverSummary(events) {
    const byKey = {};
    (events || []).forEach((event) => {
      const key = `${event.player}|||${event.game}`;
      if (!byKey[key]) {
        byKey[key] = { player: event.player, game: event.game, spins: 0, adjustment: 0, placesGained: 0 };
      }
      const row = byKey[key];
      row.spins += 1;
      row.adjustment += event.adjustment;
      row.placesGained += event.placesGained;
    });
    return Object.values(byKey).sort((a, b) => {
      return b.spins - a.spins
        || Math.abs(b.adjustment) - Math.abs(a.adjustment)
        || String(a.player || '').localeCompare(String(b.player || ''))
        || String(a.game || '').localeCompare(String(b.game || ''));
    });
  }

  function recordMatchesPlayer(record, player) {
    if (!player) return true;
    if (!record) return false;
    if (record.player === player || record.name === player) return true;
    if (Array.isArray(record.ties) && record.ties.some((row) => row.player === player || row.name === player)) return true;
    if (record.a === player || record.b === player) return true;
    return false;
  }

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function scoreLabel(value, unit) {
    if (!finite(value)) return '-';
    if (unit === '%') return `${value}%`;
    return unit ? `${value} ${unit}` : String(value);
  }

  function formatStatValue(value, label) {
    return scoreLabel(value, label && /\brate\b/i.test(label) ? '%' : '');
  }

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function paneFromView(view) {
    if (view === 'records-nights') return 'nights';
    if (view === 'records-explore' || view === 'records-shame') return 'explore';
    return 'overview';
  }

  function buildShameAwards(data, playerList, wizardBidStats) {
    const games = data.games || {};
    const lastStreak = (playerList || []).slice().sort((a, b) => b.longestLast - a.longestLast)[0];
    const missed = Object.entries(wizardBidStats || {}).map(([player, stats]) => ({
      player,
      value: stats.busted,
      label: `${stats.busted} missed bids`,
      date: 'Career',
      game: 'Wizard'
    })).sort((a, b) => b.value - a.value)[0] || null;
    const list = [
      { id: 'fc-worst-final', record: games['Five Crowns'] && games['Five Crowns'].worstGame, stat: (r) => `${r.value} points` },
      { id: 'fc-worst-round', record: games['Five Crowns'] && games['Five Crowns'].worstRound, stat: (r) => `${r.value} points in one round` },
      { id: 'e818-worst-final', record: games['818'] && games['818'].worstGame, stat: (r) => `${r.value} points` },
      { id: 'heat-worst-final', record: games['Beat the Heat'] && games['Beat the Heat'].worstGame, stat: (r) => `${r.value} heat` },
      { id: 'wizard-missed', record: missed, stat: (r) => r.label },
      { id: 'last-streak', record: lastStreak ? { player: lastStreak.name, value: lastStreak.longestLast, label: `${formatPlural(lastStreak.longestLast, 'straight last-place finish', 'straight last-place finishes')}`, date: 'Career' } : null, stat: (r) => r.label }
    ];
    return list.map((row) => {
      const meta = SHAME_CATALOG.find((item) => item.id === row.id) || { name: row.id, subtitle: '' };
      return Object.assign({}, row, { name: meta.name, subtitle: meta.subtitle, emoji: '' });
    });
  }

  function paint(ctx) {
    const view = ctx.view;
    if (!view) return;
    const table = ctx.table || { history: [] };
    const hidden = view.classList.contains('hidden');
    const pane = ctx.pane || 'overview';
    const scorebook = ctx.scorebook;
    const esc = ctx.escapeHtml;
    const avatar = ctx.getAvatarImg || function () { return ''; };
    if (!table.history.length) {
      view.className = `s2-ledger${hidden ? ' hidden' : ''}`;
      view.innerHTML = '<section class="s2-panel"><h2>Records</h2><p class="s2-sub local-storage-statement">Scores and history are saved in this browser on this device.</p><p class="s2-sub">Hall of Fame stays empty until a night is saved.</p></section>';
      return;
    }
    const hall = ctx.hall;
    const data = ctx.data;
    const helpers = {
      configs: ctx.configs,
      getDisplayPlayers: ctx.getDisplayPlayers,
      sortPlayersByTotal: ctx.sortPlayersByTotal,
      competitionPlaces: ctx.competitionPlaces,
      scorebook
    };
    const compact = !!ctx.compact;
    const html = [
      tabsHtml(pane),
      pane === 'overview' ? overviewHtml(hall, data, table, helpers, ctx, compact) : '',
      pane === 'explore' ? exploreHtml(hall, data, table, helpers, ctx, compact) : '',
      pane === 'nights' ? nightsHtml(table.history, helpers, ctx, false, compact) : '',
      '<p class="s2-sub s2-records-footer local-storage-statement">Scores and history are saved in this browser on this device.</p>'
    ].join('');
    view.className = `s2-ledger s2-pane-${pane}${hidden ? ' hidden' : ''}`;
    view.dataset.recordsPane = pane;
    view.innerHTML = html;
  }

  function tabsHtml(pane) {
    const tab = (id, action, label, on) => `<button type="button" class="s2-btn${on ? ' is-on' : ''}" id="${id}" data-s2-action="${action}">${label}</button>`;
    return `<div class="s2-segment" role="tablist" aria-label="Records">
      ${tab('slice2-show-fame', 'show-fame', 'Overview', pane === 'overview')}
      ${tab('slice2-show-shame', 'show-shame', 'Explore<span class="s2-tab-rest"> records</span>', pane === 'explore')}
      ${tab('slice2-show-nights', 'show-nights', 'Past nights', pane === 'nights')}
    </div>`;
  }

  function playerLink(name, esc, avatar) {
    if (!name || name === '-') return esc(name || '');
    return `<button type="button" class="s2-player-link" data-s2-action="open-profile" data-s2-player="${escapeAttr(name)}">${avatar(name, 'avatar-img s2-mini-avatar')}<span class="player-name-label">${esc(name)}</span></button>`;
  }

  function ledgerStat(value, who, note, label) {
    const labeled = label ? ` data-label="${escapeAttr(label)}"` : '';
    const noteHtml = note ? `<em class="s2-unassisted-note">${note}</em>` : '';
    return `<div class="s2-ledger-stat"${labeled}><strong>${value}</strong><small>${who || ''}</small>${noteHtml}</div>`;
  }

  function tiedAtTop(rows) {
    if (!rows || !rows.length) return [];
    const top = rows[0].value;
    return rows.filter((row) => row.value === top);
  }

  function recordHolderText(record, compact) {
    if (!record) return '';
    const ties = record.ties && record.ties.length ? record.ties : [record];
    if (ties.length > 1) {
      if (compact && ties.length > 2) return `${formatTiedNames(ties.slice(0, 2))} + ${ties.length - 2} more`;
      return formatTiedNames(ties);
    }
    const name = record.player || record.name || '';
    if (!record.ties && !record.label) return name ? `${name} · First to achieve` : 'First to achieve';
    return name;
  }

  function overviewHtml(hall, data, table, helpers, ctx, compact) {
    const esc = ctx.escapeHtml;
    const avatar = ctx.getAvatarImg;
    const winLeaders = tiedAtTop(data.allTime && data.allTime.mostWins);
    const rateLeaders = tiedAtTop(data.allTime && data.allTime.bestWinRate);
    const wins = winLeaders[0];
    const rate = rateLeaders[0];
    const streak = data.allTime && data.allTime.longestWinningStreak;
    const headlines = [
      wins ? { kicker: 'Career wins', value: String(wins.value), people: winLeaders, sub: wins.label || `${wins.value} wins` } : null,
      rate ? { kicker: 'Win rate', value: finite(rate.value) ? `${rate.value}%` : '-', people: rateLeaders, sub: formatWinRateDenom(rate.wins != null ? rate.wins : rate.value, rate.games) || (rate.label || '') } : null,
      streak ? { kicker: 'Win streak', value: `${streak.value}W`, people: streak.ties || [streak], sub: streak.label || 'in a row' } : null
    ].filter(Boolean);
    const rows = visibleRecordGames(table.history).map((game) => {
      const card = hall[game.id] || {};
      const rec = data.games && data.games[game.id];
      const round = rec && rec.bestRound;
      const bestFinal = rec && rec.bestGame;
      const coverage = (data.games && data.games._coverage && data.games._coverage[game.id])
        || (hall._coverage && hall._coverage[game.id]);
      const noUnassisted = !!(coverage && coverage.assisted > 0 && coverage.unassisted === 0);
      const matchValue = noUnassisted
        ? '-'
        : (bestFinal && finite(bestFinal.value) ? scoreLabel(bestFinal.value, game.unit) : scoreLabel(card.bestScore, game.unit));
      const matchWho = noUnassisted
        ? 'No unassisted matches yet'
        : (bestFinal ? recordHolderText(bestFinal, true) : (card.bestPlayer && card.bestPlayer !== '-' ? card.bestPlayer : ''));
      const roundValue = round && finite(round.value) ? scoreLabel(round.value, game.unit) : '-';
      const roundWho = round ? recordHolderText(round, true) : '';
      const matchNote = noUnassisted || matchValue === '-' ? '' : 'Unassisted matches only';
      return `<div class="s2-ledger-row">
        <div class="s2-ledger-game"><span class="s2-ledger-mark s2-art-${game.art}" aria-hidden="true"></span><div><strong>${esc(game.title)}</strong></div></div>
        ${ledgerStat(esc(matchValue), esc(matchWho), matchNote, 'Best final')}
        ${ledgerStat(esc(roundValue), esc(roundWho), '', 'Best round')}
      </div>`;
    }).join('');
    const selectedShame = (data.shameAwards || []).filter((award) => award.record).slice(0, 4);
    const shame = selectedShame.map((award) => shameRow(award, esc, avatar)).join('');
    const rival = data.rivalries && data.rivalries.top && data.rivalries.top[0];
    const lead = rival ? headToHeadLead(rival) : null;
    const rivalText = rival
      ? `${rival.a} vs ${rival.b} · ${lead.scoreline} · ${lead.text} · ${rival.together} shared matches`
      : '';
    const recent = sortNights(table.history).slice(0, compact ? 3 : 4);
    return `<div class="s2-records-pane s2-fame-col" data-pane="overview">
      <section class="s2-panel">
        <div class="s2-headline">${headlines.map((card) => `<article class="s2-headline-card">
          <small>${esc(card.kicker)}</small>
          <strong>${esc(card.value)}</strong>
          ${(card.people || []).map((row) => playerLink(row.player || row.name, esc, avatar)).join('')}
          <small>${esc(card.sub)}</small>
        </article>`).join('')}</div>
        <div class="s2-panel-head"><h2>Hall of Fame</h2><span class="s2-sub">${formatCompletedMatches((data.completed || []).length)}</span></div>
        <div class="s2-ledger-table">
          <div class="s2-ledger-row is-head"><span>Game</span><span>Best final</span><span>Best round</span></div>
          ${rows}
        </div>
      </section>
      <div class="s2-overview-side">
        <section class="s2-panel s2-shame-panel">
          <div class="s2-panel-head"><h2>Hall of Shame</h2></div>
          ${shame || '<p class="s2-sub">No infamous nights yet.</p>'}
        </section>
        ${rivalText ? `<article class="s2-rival"><small class="s2-kicker">Head-to-head</small><p class="s2-sub">${esc(rivalText)}</p></article>` : ''}
        <section class="s2-panel">
          <div class="s2-panel-head"><h2>Recent results</h2></div>
          ${nightsListHtml(recent, helpers, ctx, compact)}
        </section>
      </div>
    </div>`;
  }

  function shameRow(award, esc, avatar) {
    const record = award.record;
    if (!record) return '';
    const detail = typeof award.stat === 'function' ? award.stat(record) : (record.label || '');
    const sub = award.subtitle ? `<em class="s2-shame-sub">${esc(award.subtitle)}</em>` : '';
    return `<article class="s2-shame-row">
      ${avatar(record.player || '', 'avatar-img s2-mini-avatar')}
      <div>
        <b>${esc(award.name)}</b>
        ${sub}
        <p>${esc(detail)}</p>
        <small>${esc(recordHolderText(record))}</small>
      </div>
      <strong>${esc(formatStatValue(record.value, award.name))}</strong>
    </article>`;
  }

  function exploreHtml(hall, data, table, helpers, ctx, compact) {
    const esc = ctx.escapeHtml;
    const avatar = ctx.getAvatarImg;
    const gameFilter = ctx.gameFilter || '';
    const playerFilter = ctx.playerFilter || '';
    const players = Array.from(new Set((data.playerCards || []).map((card) => card.player).concat(
      (data.allTime && data.allTime.mostGames || []).map((row) => row.player)
    ))).filter(Boolean).sort();
    const gameOptions = ['<option value="">All games</option>'].concat(visibleRecordGames(table.history).map((game) => {
      const selected = gameFilter === game.id ? ' selected' : '';
      return `<option value="${escapeAttr(game.id)}"${selected}>${esc(game.title)}</option>`;
    })).join('');
    const playerOptions = ['<option value="">All players</option>'].concat(players.map((name) => {
      const selected = playerFilter === name ? ' selected' : '';
      return `<option value="${escapeAttr(name)}"${selected}>${esc(name)}</option>`;
    })).join('');
    const lpEvents = lifePreserverEvents(table.history, helpers);
    const lpRows = lifePreserverSummary(lpEvents);
    const sections = [];
    sections.push(exploreLeaders(data, playerFilter, esc, avatar));
    sections.push(explorePerGame(data, table.history, gameFilter, playerFilter, esc, compact));
    sections.push(exploreBids(data, hall, gameFilter, playerFilter, esc));
    sections.push(exploreStreaks(data, playerFilter, esc));
    if (lpRows.length) sections.push(exploreLifePreserver(lpRows, playerFilter, esc));
    sections.push(exploreShame(data, playerFilter, esc, avatar));
    sections.push(exploreRivalries(data, playerFilter, esc, avatar, compact));
    sections.push(explorePlayers(data, playerFilter, esc, avatar));
    return `<div class="s2-records-pane s2-shame-col s2-explore-col" data-pane="explore">
      <section class="s2-panel">
        <div class="s2-panel-head"><h2>Explore records</h2><span class="s2-sub">${formatCompletedMatches((data.completed || []).length)}</span></div>
        <div class="s2-records-filters">
          <label>Game <select id="s2-records-game" data-s2-action="filter-game">${gameOptions}</select></label>
          <label>Player <select id="s2-records-player" data-s2-action="filter-player">${playerOptions}</select></label>
        </div>
      </section>
      <div class="s2-explore-grid">${sections.filter(Boolean).join('')}</div>
    </div>`;
  }

  function rowIf(show, html) {
    return show ? html : '';
  }

  function statLine(label, record, esc, note, playerFilter) {
    if (playerFilter && !recordMatchesPlayer(record, playerFilter)) return '';
    if (!record) {
      const empty = note === 'No unassisted matches yet' ? note : 'No qualifying history';
      const noteHtml = note && note !== 'No unassisted matches yet' ? `<small class="s2-unassisted-note">${esc(note)}</small>` : '';
      return `<div class="s2-book-row"><span>${esc(label)}${noteHtml}</span><span class="s2-book-empty">${esc(empty)}</span></div>`;
    }
    const names = recordHolderText(record);
    const extra = record.label || (finite(record.round) ? `R${record.round}` : '');
    const noteHtml = note ? `<small class="s2-unassisted-note">${esc(note)}</small>` : '';
    return `<div class="s2-book-row">
      <span>${esc(label)}${noteHtml}</span>
      <span class="s2-book-who">${esc(names)}${extra ? ` · ${esc(extra)}` : ''}${record.date ? ` · ${esc(record.date)}` : ''}</span>
      <strong>${esc(formatStatValue(record.value, label))}</strong>
    </div>`;
  }

  function listBlock(title, rows) {
    const body = rows.filter(Boolean).join('');
    if (!body) return '';
    return `<section class="s2-panel"><h3>${title}</h3><div class="s2-book">${body}</div></section>`;
  }

  function exploreLeaders(data, playerFilter, esc, avatar) {
    const lines = (rows, title) => {
      const shown = (rows || []).filter((row) => recordMatchesPlayer(row, playerFilter)).slice(0, 8);
      if (!shown.length) return '';
      return `<div class="s2-book-block"><h4>${esc(title)}</h4>${shown.map((row, index) => `<div class="s2-book-row s2-leader-row">
        <span class="s2-leader-rank">${index + 1}.</span>${playerLink(row.player, esc, avatar)}
        <span class="s2-book-who">${esc(row.label || formatWinRate(row.wins, row.games) || '')}</span>
        <strong>${esc(String(row.value ?? '-'))}</strong>
      </div>`).join('')}</div>`;
    };
    return listBlock('Career leaders', [
      lines(data.allTime && data.allTime.mostWins, 'Career wins'),
      lines(data.allTime && data.allTime.bestWinRate, 'Win rate'),
      lines(data.allTime && data.allTime.mostGames, 'Most matches')
    ]);
  }

  function coverageNote(data, gameId) {
    const row = data.games && data.games._coverage && data.games._coverage[gameId];
    if (row && row.assisted > 0 && row.unassisted === 0) return 'No unassisted matches yet';
    return 'Unassisted matches only';
  }

  function explorePerGame(data, history, gameFilter, playerFilter, esc, compact) {
    const blocks = visibleRecordGames(history).map((game) => {
      if (gameFilter && gameFilter !== game.id) return '';
      const rec = data.games && data.games[game.id];
      if (!rec) return '';
      const unassisted = coverageNote(data, game.id);
      const rows = [];
      const push = (label, record, note) => rows.push(statLine(label, record, esc, note, playerFilter));
      if (game.id === 'Wizard') {
        WIZARD_PLAYER_COUNTS.forEach((count) => {
          push(`Best ${count}-player final score`, rec.bestGameByPlayerCount && rec.bestGameByPlayerCount[count], unassisted);
        });
      } else if (game.id === 'Beat the Heat') {
        push('Coolest final score', rec.bestGame, unassisted);
        push('Hottest final score', rec.worstGame, unassisted);
      } else {
        push('Best final score', rec.bestGame, unassisted);
        push('Worst final score', rec.worstGame, unassisted);
      }
      if (game.winLow) {
        push('Lowest single-round score', rec.bestRound);
        push('Highest single-round score', rec.worstRound);
      } else {
        push('Highest single-round score', rec.bestRound);
        push('Lowest single-round score', rec.worstRound);
      }
      if (game.id === 'Five Crowns') {
        push('Most perfect rounds in one match', rec.mostPerfectRounds);
        push('Cleanest game', rec.cleanestGame, unassisted);
        push('Most consistent match', rec.mostConsistent);
        push('Closest margin of victory', rec.closestMargin);
        push('Most lopsided match', rec.mostLopsided);
      }
      if (game.id === 'Wizard') {
        push('Best single-match exact rate', rec.bestExactRateSingleGame);
        push('Most exact bids in one match', rec.mostExactSingleGame);
        WIZARD_PLAYER_COUNTS.forEach((count) => {
          push(`Most exact bids · ${count} players`, rec.mostExactByPlayerCount && rec.mostExactByPlayerCount[count]);
        });
        push('Most zero bids hit', rec.mostZeroBidsHit);
        push('Highest final-round score', rec.biggestFinalRoundSwing);
        push('Biggest overbid', rec.biggestOverbid);
        push('Biggest underbid', rec.biggestUnderbid);
        push('Most tricks in one round', rec.mostTricksRound);
      }
      if (game.id === '818') {
        push('Most exact bids in one match', rec.mostExactSingleGame);
        push('Best single-match exact rate', rec.bestExactRateSingleGame);
        push('Most missed bids in one match', rec.mostMissedSingleGame);
        push('Biggest missed bid', rec.biggestMiss);
        push('Most tricks in one round', rec.mostTricksRound);
        push('Closest margin of victory', rec.closestMargin);
      }
      if (game.id === 'Flip 7 Vengeance') {
        push('Most zero rounds in one match', rec.mostZeroRounds);
        push('Closest margin of victory', rec.closestMargin);
      }
      if (game.id === 'Beat the Heat') {
        push('Most ice-cold rounds', rec.mostIceRounds);
        push('Cleanest heat average', rec.cleanestGame, unassisted);
        push('Closest margin of victory', rec.closestMargin);
        push('Most lopsided match', rec.mostLopsided);
        push('Longest match', rec.longestMatch);
      }
      if (game.id === 'Hand and Foot') {
        if (rec.closestMargin && rec.closestMargin.value > 0) push('Closest margin of victory', rec.closestMargin);
      }
      if (game.id === 'Rook') {
        push('Most successful bids in one match', rec.mostSuccessfulBids);
        push('Highest bid made', rec.highestBidMade);
        push('Biggest set', rec.biggestSet);
        if (rec.closestMargin && rec.closestMargin.value > 0) push('Closest margin of victory', rec.closestMargin);
      }
      const body = rows.filter(Boolean).join('');
      if (!body) return '';
      const wrap = compact ? `<details class="s2-disclose"><summary>${esc(game.title)}</summary><div class="s2-book">${body}</div></details>` : `<h3>${esc(game.title)}</h3><div class="s2-book">${body}</div>`;
      return `<section class="s2-panel">${wrap}</section>`;
    }).join('');
    return blocks ? `<div class="s2-explore-games">${blocks}</div>` : '';
  }

  function exploreBids(data, hall, gameFilter, playerFilter, esc) {
    if (gameFilter && gameFilter !== 'Wizard' && gameFilter !== '818') return '';
    const rows = [];
    if (!gameFilter || gameFilter === 'Wizard') {
      rows.push(statLine('Best career exact-bid rate · Wizard', data.games.Wizard && data.games.Wizard.bestExactBidPct, esc, '', playerFilter));
      const missed = hall.Wizard && Number(hall.Wizard.mostBustedBids) > 0
        ? { player: hall.Wizard.mostBustedBidsPlayer, value: hall.Wizard.mostBustedBids, label: 'in one match' }
        : null;
      rows.push(statLine('Most missed bids · Wizard', missed, esc, '', playerFilter));
    }
    return listBlock('Bid accuracy', rows);
  }

  function exploreStreaks(data, playerFilter, esc) {
    const rows = [
      statLine('Longest winning streak', data.allTime && data.allTime.longestWinningStreak, esc, '', playerFilter),
      statLine('Longest stretch without a win', data.allTime && data.allTime.longestLosingStreak, esc, '', playerFilter),
      statLine('Most consecutive matches without last', data.allTime && data.allTime.longestNoLastStreak, esc, '', playerFilter)
    ];
    return listBlock('Streaks', rows);
  }

  function exploreLifePreserver(rows, playerFilter, esc) {
    const body = rows.filter((row) => recordMatchesPlayer(row, playerFilter)).map((row) => `<div class="s2-book-row">
      <span>${esc(row.player)}</span>
      <span class="s2-book-who">${esc(gameTitle(row.game))} · ${row.spins} spin${row.spins === 1 ? '' : 's'} · ${esc(String(row.adjustment))} pts adjusted · ${esc(String(row.placesGained))} places right after the spin</span>
    </div>`).join('');
    if (!body) return '';
    return `<section class="s2-panel">
      <h3>Life Preserver</h3>
      <p class="s2-sub">Places gained are measured immediately after each spin. A later win is not credited to the wheel.</p>
      <div class="s2-book">${body}</div>
    </section>`;
  }

  function exploreShame(data, playerFilter, esc, avatar) {
    const awards = (data.shameAwards || []).filter((award) => award.record && recordMatchesPlayer(award.record, playerFilter));
    if (!awards.length) return '';
    return `<section class="s2-panel s2-shame-panel">
      <h3>Hall of Shame</h3>
      ${awards.map((award) => shameRow(award, esc, avatar)).join('')}
    </section>`;
  }

  function exploreRivalries(data, playerFilter, esc, avatar, compact) {
    const top = (data.rivalries && data.rivalries.top || []).filter((row) => recordMatchesPlayer(row, playerFilter));
    const lopsided = (data.rivalries && data.rivalries.lopsided || []).filter((row) => recordMatchesPlayer(row, playerFilter));
    const card = (row, kind) => {
      const lead = headToHeadLead(row);
      const extra = kind === 'rate'
        ? `${lead.leaderWins} of ${row.together}`
        : `${row.together} shared matches`;
      return `<div class="s2-book-row">
        <span>${playerLink(row.a, esc, avatar)} vs ${playerLink(row.b, esc, avatar)}</span>
        <span class="s2-book-who">${esc(lead.scoreline)} · ${esc(lead.text)} · ${esc(extra)}</span>
      </div>`;
    };
    const limit = compact ? 3 : 5;
    return listBlock('Rivalries', [
      top.length ? `<h4>Most shared matches</h4>${top.slice(0, limit).map((row) => card(row, 'shared')).join('')}` : '',
      lopsided.length ? `<h4>Highest head-to-head win rate</h4>${lopsided.slice(0, limit).map((row) => card(row, 'rate')).join('')}` : ''
    ]);
  }

  function explorePlayers(data, playerFilter, esc, avatar) {
    const cards = (data.playerCards || []).filter((card) => recordMatchesPlayer(card, playerFilter));
    if (!cards.length) return '';
    const rows = cards.map((card) => `<div class="s2-book-row">
      ${playerLink(card.player, esc, avatar)}
      <span class="s2-book-who">${esc(formatWinRate(card.wins, card.games) || '')} · ${esc(card.currentStreak || '')}</span>
      <strong>${esc(String(card.wins))}W / ${esc(String(card.games))}</strong>
    </div>`).join('');
    return `<section class="s2-panel">
      <h3>View player profiles</h3>
      <div class="s2-book">${rows}</div>
    </section>`;
  }

  function nightsHtml(history, helpers, ctx, recentOnly, compact) {
    const groups = groupNightsByEvening(history);
    const body = groups.map((group) => `<section class="s2-night-day">
      <h3>${ctx.escapeHtml(group.label)}</h3>
      ${nightsListHtml(group.matches, helpers, ctx, compact)}
    </section>`).join('');
    return `<div class="s2-records-pane s2-nights-col" data-pane="nights">
      <section class="s2-panel">
        <div class="s2-panel-head"><h2>Past nights</h2></div>
        <div class="s2-night-list">${body || '<p class="s2-sub">No nights saved yet.</p>'}</div>
      </section>
    </div>`;
  }

  function nightsListHtml(matches, helpers, ctx, compact) {
    if (!matches || !matches.length) return '<p class="s2-sub">No nights saved yet.</p>';
    return matches.map((match) => nightCardHtml(nightCardModel(match, helpers), ctx, compact)).join('');
  }

  function nightCardHtml(model, ctx, compact) {
    const esc = ctx.escapeHtml;
    const avatar = ctx.getAvatarImg;
    const id = escapeAttr(String(model.id == null ? '' : model.id));
    const expanded = !!(ctx.expandedNights && ctx.expandedNights.has(String(model.id)));
    const limit = compact && !expanded && model.standings.length > 3 ? 3 : model.standings.length;
    const shown = model.standings.slice(0, limit);
    const more = model.standings.length - shown.length;
    const meta = model.incomplete
      ? `Incomplete · through Round ${model.throughRound}`
      : `${model.rounds} round${model.rounds === 1 ? '' : 's'}`;
    const badges = [
      model.assisted ? '<span class="s2-night-badge">Assisted match</span>' : '',
      model.retired.length ? `<span class="s2-night-badge">Left early · ${esc(model.retired.join(', '))}</span>` : ''
    ].join('');
    const rows = shown.map((row) => `<li class="s2-night-finish${row.isWinner ? ' is-winner' : ''}">
      <span class="s2-night-place">${esc(String(row.place))}.</span>
      ${avatar(row.name, 'avatar-img s2-mini-avatar')}
      <span class="player-name-label">${esc(row.name)}${row.retired ? ' <small>Left early</small>' : ''}</span>
      <strong>${esc(scoreLabel(row.score))}</strong>
    </li>`).join('');
    const winner = model.incomplete
      ? `<p class="s2-night-status">${esc(meta)}</p>`
      : `<p class="s2-night-winner">${esc(model.winnerText || 'No winner stored')}</p>`;
    const expand = more > 0
      ? `<button type="button" class="s2-night-more" data-s2-action="night-expand" data-s2-id="${id}">Show all ${model.standings.length}</button>`
      : '';
    const resume = model.showResume
      ? `<button type="button" class="s2-btn s2-btn-primary" data-s2-action="night-resume" data-s2-id="${id}">Resume</button>`
      : '';
    return `<article class="s2-night s2-night-card${model.incomplete ? ' is-incomplete' : ''}${model.winners.length > 1 ? ' is-joint' : ''}"${model.assisted ? ' data-assisted-match="true"' : ''} data-s2-action="night-open" data-s2-id="${id}">
      <header class="s2-night-head">
        <strong>${esc(model.gameTitle)}</strong>
        <span>${esc(model.date)}${model.incomplete ? '' : ` · ${esc(meta)}`}</span>
        ${badges}
      </header>
      ${winner}
      <ol class="s2-night-standings">${rows}</ol>
      ${expand}
      <div class="s2-night-actions">
        <button type="button" class="s2-btn" data-s2-action="night-scorecard" data-s2-id="${id}">View scorecard</button>
        ${resume}
      </div>
    </article>`;
  }

  const api = {
    WIN_RATE_MIN_GAMES,
    SINGLE_MATCH_BID_RATE_MIN,
    singleMatchBidRateEligible,
    GAMES,
    SHAME_CATALOG,
    WIZARD_PLAYER_COUNTS,
    gameMeta,
    gameTitle,
    parseHistoryDate,
    compareNightsByDate,
    sortNights,
    groupNightsByEvening,
    winRateEligible,
    formatNightCount,
    formatCompletedMatches,
    formatPlural,
    formatWinsGames,
    visibleRecordGames,
    formatWinRate,
    formatWinRateDenom,
    formatStatValue,
    scoreLabel,
    rankWinRates,
    formatTiedNames,
    recordHolderText,
    keepBestWithTies,
    pairKey,
    addPairFinish,
    pairWinnerFromScores,
    collectPairFinishes,
    headToHeadLead,
    summarizeRivalries,
    shouldShowResume,
    isCompletedMatch,
    scoringRoundCount,
    nightCardModel,
    nightStandings,
    nightPodium,
    matchHasComebackData,
    shouldShowComebackStats,
    lifePreserverEvents,
    lifePreserverSummary,
    recordMatchesPlayer,
    buildShameAwards,
    paneFromView,
    paint
  };

  root.BPGRecords = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
