(function (root) {
  'use strict';

  const SUPPORTED_GAMES = Object.freeze(['818', 'Wizard', 'Five Crowns', 'Flip 7 Vengeance']);
  const EIGHT18_ROUND_TRICKS = Object.freeze([8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8]);
  const RECOVERY_LOAD_THRESHOLD = 0.4;
  const EIGHT18_BID_BONUS = 10;
  const FLIP7_STRONG_ROUNDS = 2.5;
  const FLIP7_MIN_BANK = 10;
  const JOINER_MIN_ROUNDS = 4;

  const GAME_CONFIG = {
    '818': {
      winLow: false,
      maxRounds: 15,
      increment: 1,
      bonusMax: 10,
      minScoringRounds: 4,
      recoveryLoad: 0.28
    },
    Wizard: {
      winLow: false,
      increment: 5,
      bonusMax: 20,
      minScoringRounds: null,
      recoveryLoad: 0.4
    },
    'Five Crowns': {
      winLow: true,
      maxRounds: 11,
      increment: 5,
      bonusMax: 30,
      minScoringRounds: 4,
      recoveryLoad: 0.4
    },
    'Flip 7 Vengeance': {
      winLow: false,
      maxRounds: 999,
      increment: 5,
      bonusMax: 15,
      minScoringRounds: 4,
      recoveryLoad: null
    }
  };

  function isLegacyBonusRound(round) {
    return !!(round && round.hailMaryBonus);
  }

  function isScoringRound(round) {
    return !!(round && !isLegacyBonusRound(round));
  }

  function scoringRounds(game) {
    return (game?.rounds || []).filter(isScoringRound);
  }

  function playerOwnScoringCount(game, player) {
    return scoringRounds(game).filter(round => (
      round.scores && round.scores[player] !== undefined && !round.joinBonus?.[player]
    )).length;
  }

  function getMaxRounds(game, activePlayers) {
    if (Number.isFinite(game?.maxRounds) && game.maxRounds > 0) return game.maxRounds;
    const name = game?.name;
    if (name === 'Wizard') {
      const roster = (game?.originalRoster || []).filter(Boolean);
      const n = Math.max(roster.length || (activePlayers || []).length, 1);
      return Math.floor(60 / n);
    }
    return GAME_CONFIG[name]?.maxRounds || 0;
  }

  function ruleUnitForRound(gameName, roundNumber) {
    if (gameName === '818') return 10 + (EIGHT18_ROUND_TRICKS[roundNumber - 1] || 0);
    if (gameName === 'Wizard') return 20 + (10 * roundNumber);
    if (gameName === 'Five Crowns') return 4 * (roundNumber + 2);
    if (gameName === 'Flip 7 Vengeance') return 22;
    return 0;
  }

  function catchUpUnitForRound(game, activePlayers, roundNumber) {
    if (game.name === '818') {
      const tricks = EIGHT18_ROUND_TRICKS[roundNumber - 1] || 0;
      const extra = Math.max(0, Math.round(tricks / Math.max(activePlayers.length, 2)) - 1);
      return EIGHT18_BID_BONUS + extra;
    }
    return ruleUnitForRound(game.name, roundNumber);
  }

  function remainingRoundNumbers(completedCount, maxRounds) {
    const rounds = [];
    for (let round = completedCount + 1; round <= maxRounds; round++) rounds.push(round);
    return rounds;
  }

  function roundToIncrement(value, increment) {
    if (increment <= 0) return Math.round(value);
    return Math.round(value / increment) * increment;
  }

  function sortPlayers(players, totals, winLow) {
    return [...players].sort((a, b) => {
      const av = Number(totals[a]) || 0;
      const bv = Number(totals[b]) || 0;
      if (av !== bv) return winLow ? av - bv : bv - av;
      return String(a).localeCompare(String(b));
    });
  }

  function rankWithScore(player, newScore, players, totals, winLow) {
    const hypothetical = Object.assign({}, totals, { [player]: newScore });
    return sortPlayers(players, hypothetical, winLow).indexOf(player) + 1;
  }

  function packGapFor(playerScore, packScore, winLow) {
    return winLow ? playerScore - packScore : packScore - playerScore;
  }

  function helpfulSign(winLow) {
    return winLow ? -1 : 1;
  }

  function packRankFor(playerCount) {
    return Math.max(1, Math.ceil(playerCount / 2));
  }

  function bestAllowedRankFor(_playerCount) {
    return 2;
  }

  function formatSignedPoints(adjustment) {
    if (!adjustment) return '0';
    const sign = adjustment > 0 ? '+' : '−';
    return `${sign}${Math.abs(adjustment)}`;
  }

  function formatComebackChip(bonus) {
    return `Comeback ${formatSignedPoints(bonus)}`;
  }

  function formatComebackChipShort(bonus) {
    return formatSignedPoints(bonus);
  }

  function formatRoundScore(base, extra) {
    const baseScore = Number(base);
    const shown = Number.isFinite(baseScore) ? baseScore : '';
    const extraScore = Number(extra) || 0;
    if (!extraScore) return String(shown);
    return `${shown} ${formatSignedPoints(extraScore)}`;
  }

  function ordinal(value) {
    const num = Number(value) || 0;
    const mod100 = num % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${num}th`;
    switch (num % 10) {
      case 1: return `${num}st`;
      case 2: return `${num}nd`;
      case 3: return `${num}rd`;
      default: return `${num}th`;
    }
  }

  function displayGameName(name) {
    if (name === 'Flip 7 Vengeance') return 'Flip 7';
    return name || 'this game';
  }

  function roundNoun(gameName, count) {
    if (gameName === 'Five Crowns') return count === 1 ? 'hand' : 'hands';
    return count === 1 ? 'round' : 'rounds';
  }

  function joinEnglish(items) {
    if (!items.length) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }

  function minScoringRoundsFor(game, players) {
    const cfg = GAME_CONFIG[game?.name];
    if (!cfg) return null;
    if (game.name === 'Wizard') {
      return Math.max(3, Math.ceil(0.25 * getMaxRounds(game, players || [])));
    }
    return cfg.minScoringRounds;
  }

  function successVerb(gameName) {
    if (gameName === '818' || gameName === 'Wizard') return 'makes the bid';
    if (gameName === 'Five Crowns') return 'goes out (0)';
    if (gameName === 'Flip 7 Vengeance') return 'banks';
    return 'has a good turn';
  }

  function successHint(gameName, bonus) {
    const extra = formatSignedPoints(bonus);
    if (gameName === '818' || gameName === 'Wizard') return `${extra} if you make`;
    if (gameName === 'Five Crowns') return `${extra} if you go out (0)`;
    if (gameName === 'Flip 7 Vengeance') return `${extra} if you bank`;
    return extra;
  }

  function expectedGoodTurns(gameName, remainingRounds) {
    if (gameName === 'Flip 7 Vengeance') return FLIP7_STRONG_ROUNDS;
    return Math.max(1, Math.round((Number(remainingRounds) || 0) / 2));
  }

  function sizeComebackBonus(gap, expectedTurns, increment, bonusMax) {
    const turns = Math.max(expectedTurns || 1, 0.5);
    const raw = Number(gap) / turns;
    let magnitude = roundToIncrement(raw, increment);
    if (magnitude < increment) magnitude = increment;
    if (magnitude > bonusMax) magnitude = bonusMax;
    return magnitude;
  }

  function madeBidScore(gameName, bid, actual) {
    const b = parseInt(bid, 10);
    const a = parseInt(actual, 10);
    if (!Number.isFinite(b) || !Number.isFinite(a) || b !== a) return null;
    if (gameName === '818') return a + 10;
    if (gameName === 'Wizard') return 20 + (10 * a);
    return null;
  }

  function isComebackSuccess(game, round, player) {
    if (!game || !round || !player) return false;
    const name = game.name;
    if (name === '818' || name === 'Wizard') {
      if (round.bids?.[player] === undefined || round.actuals?.[player] === undefined) return false;
      const made = madeBidScore(name, round.bids[player], round.actuals[player]);
      if (made == null) return false;
      if (round.scores?.[player] !== undefined && Number(round.scores[player]) !== made) return false;
      return true;
    }
    const score = Number(round.scores?.[player]);
    if (!Number.isFinite(score)) return false;
    if (name === 'Five Crowns') return score === 0;
    if (name === 'Flip 7 Vengeance') return score >= FLIP7_MIN_BANK;
    return false;
  }

  function ineligible(reason, extras) {
    return Object.assign({
      eligible: false,
      reason,
      rank: null,
      leaderGap: 0,
      packGap: 0,
      packRank: null,
      packPlayer: null,
      upcomingOpportunity: 0,
      totalRemainingOpportunity: 0,
      expectedGoodTurns: null,
      remainingRounds: null,
      recoveryLoad: null,
      bestAllowedRank: null,
      bonus: 0,
      bonusMagnitude: 0,
      scoreIncrement: 1,
      winLow: false,
      chipLabel: '',
      successHint: ''
    }, extras);
  }

  function getComebackOffer(game, player, activePlayers, options) {
    const opts = options || {};
    if (!game || !player || !Array.isArray(activePlayers) || !activePlayers.includes(player)) {
      return ineligible('inactive');
    }
    if (opts.gameOver) return ineligible('game-over');
    if (!SUPPORTED_GAMES.includes(game.name)) return ineligible('unsupported-game');
    if ((game.retired || []).includes(player)) return ineligible('retired');
    if ((game.hailMaryUsed || []).includes(player)) return ineligible('legacy-rescue');

    const cfg = GAME_CONFIG[game.name];
    const players = activePlayers.filter(name => name && !(game.retired || []).includes(name));
    if (players.length < 4) return ineligible('too-few-players', { winLow: cfg.winLow, scoreIncrement: cfg.increment });

    const totals = {};
    players.forEach(name => { totals[name] = Number(game.totals?.[name]) || 0; });
    const maxRounds = getMaxRounds(game, players);
    const completed = scoringRounds(game);
    const completedCount = completed.length;
    if (completedCount >= maxRounds || (Number(game.currentRound) || 0) > maxRounds) {
      return ineligible('game-over', { winLow: cfg.winLow, scoreIncrement: cfg.increment });
    }

    const minRounds = minScoringRoundsFor(game, players);
    if (completedCount < minRounds) {
      return ineligible('too-early', { winLow: cfg.winLow, scoreIncrement: cfg.increment });
    }
    const ownCount = playerOwnScoringCount(game, player);
    if (ownCount < JOINER_MIN_ROUNDS && ownCount < completedCount) {
      return ineligible('joined-late', { winLow: cfg.winLow, scoreIncrement: cfg.increment });
    }

    const sorted = sortPlayers(players, totals, cfg.winLow);
    const rank = sorted.indexOf(player) + 1;
    const packRank = packRankFor(players.length);
    const playerScore = totals[player];
    const packScore = totals[sorted[packRank - 1]];
    const leaderPlayer = sorted[0];
    const leaderScore = totals[leaderPlayer];
    const packGap = packGapFor(playerScore, packScore, cfg.winLow);
    const leaderGap = packGapFor(playerScore, leaderScore, cfg.winLow);
    if (rank === 1) {
      return ineligible('leading', {
        rank,
        packRank,
        packPlayer: sorted[packRank - 1],
        leaderPlayer,
        leaderGap: 0,
        packGap,
        winLow: cfg.winLow,
        scoreIncrement: cfg.increment
      });
    }
    const remaining = remainingRoundNumbers(completedCount, maxRounds);
    const upcomingRound = remaining[0];
    let upcomingOpportunity = 0;
    let totalRemainingOpportunity = 0;
    let comebackUnit = 0;

    if (game.name === 'Flip 7 Vengeance') {
      comebackUnit = 22;
      upcomingOpportunity = comebackUnit;
      totalRemainingOpportunity = comebackUnit * FLIP7_STRONG_ROUNDS;
    } else {
      if (!remaining.length) return ineligible('game-over', { rank, winLow: cfg.winLow, scoreIncrement: cfg.increment });
      upcomingOpportunity = catchUpUnitForRound(game, players, upcomingRound);
      totalRemainingOpportunity = remaining.reduce((sum, roundNumber) => (
        sum + catchUpUnitForRound(game, players, roundNumber)
      ), 0);
      comebackUnit = upcomingOpportunity;
    }

    if (game.name !== 'Flip 7 Vengeance' && !(leaderGap >= upcomingOpportunity)) {
      return ineligible('leader-gap', {
        rank,
        packRank,
        packPlayer: sorted[packRank - 1],
        leaderPlayer,
        leaderGap,
        packGap,
        upcomingOpportunity,
        totalRemainingOpportunity,
        remainingRounds: remaining.length,
        winLow: cfg.winLow,
        scoreIncrement: cfg.increment
      });
    }

    const recoveryLoad = totalRemainingOpportunity > 0 ? leaderGap / totalRemainingOpportunity : Infinity;
    const recoveryThreshold = Number.isFinite(cfg.recoveryLoad) ? cfg.recoveryLoad : RECOVERY_LOAD_THRESHOLD;
    const loadOk = game.name === 'Flip 7 Vengeance'
      ? leaderGap / comebackUnit >= FLIP7_STRONG_ROUNDS
      : recoveryLoad >= recoveryThreshold;
    if (!loadOk) {
      return ineligible('recovery-load', {
        rank,
        packRank,
        packPlayer: sorted[packRank - 1],
        leaderPlayer,
        leaderGap,
        packGap,
        upcomingOpportunity,
        totalRemainingOpportunity,
        remainingRounds: game.name === 'Flip 7 Vengeance' ? null : remaining.length,
        recoveryLoad,
        winLow: cfg.winLow,
        scoreIncrement: cfg.increment
      });
    }

    const remainingRounds = game.name === 'Flip 7 Vengeance' ? null : remaining.length;
    const expectedTurns = expectedGoodTurns(game.name, remainingRounds);
    const contentionLine = game.name === 'Flip 7 Vengeance'
      ? comebackUnit * FLIP7_STRONG_ROUNDS
      : upcomingOpportunity;
    const shortfall = Math.max(0, leaderGap - contentionLine);
    const magnitude = sizeComebackBonus(shortfall, expectedTurns, cfg.increment, cfg.bonusMax);
    const bonus = helpfulSign(cfg.winLow) * magnitude;
    const allowedRank = bestAllowedRankFor(players.length);

    return {
      eligible: true,
      reason: 'ok',
      player,
      gameName: game.name,
      playerCount: players.length,
      packPlayer: sorted[packRank - 1],
      packScore,
      leaderPlayer,
      leaderScore,
      rank,
      packRank,
      leaderGap,
      packGap,
      upcomingOpportunity,
      totalRemainingOpportunity,
      remainingRounds,
      expectedGoodTurns: expectedTurns,
      recoveryLoad,
      bestAllowedRank: allowedRank,
      bonus,
      bonusMagnitude: magnitude,
      scoreIncrement: cfg.increment,
      winLow: cfg.winLow,
      chipLabel: formatComebackChip(bonus),
      successHint: successHint(game.name, bonus)
    };
  }

  function clampComebackBonus(options) {
    const opts = options || {};
    const player = opts.player;
    const players = opts.players || [];
    const increment = opts.increment || 1;
    const winLow = !!opts.winLow;
    const sign = helpfulSign(winLow);
    const intended = Number(opts.bonus) || 0;
    let magnitude = Math.abs(intended);
    if (!player || magnitude < increment) return 0;

    const totals = {};
    players.forEach(name => {
      totals[name] = (Number(opts.preRoundTotals?.[name]) || 0) + (Number(opts.baseRoundScores?.[name]) || 0);
    });

    while (magnitude >= increment) {
      const nextScore = totals[player] + (sign * magnitude);
      const rank = rankWithScore(player, nextScore, players, totals, winLow);
      if (rank > 1) return sign * magnitude;
      magnitude -= increment;
    }
    return 0;
  }

  function previewComebackApply(game, player, roundDraft, activePlayers) {
    const players = (activePlayers || []).filter(name => name && !(game?.retired || []).includes(name));
    const offer = getComebackOffer(game, player, activePlayers);
    if (!offer.eligible) {
      return { offer, extra: 0, success: false, clamped: false, label: '' };
    }
    if (!isComebackSuccess(game, roundDraft, player)) {
      return { offer, extra: 0, success: false, clamped: false, label: offer.successHint };
    }
    const extra = clampComebackBonus({
      player,
      bonus: offer.bonus,
      baseRoundScores: roundDraft?.scores || {},
      preRoundTotals: game?.totals || {},
      players,
      winLow: offer.winLow,
      packRank: offer.packRank,
      increment: offer.scoreIncrement
    });
    const clamped = extra !== offer.bonus;
    const score = roundDraft?.scores?.[player];
    const label = extra
      ? formatRoundScore(score, extra)
      : 'Would take 1st';
    return { offer, extra, success: true, clamped, label };
  }

  function applyComebackToRound(game, roundData, activePlayers) {
    const applied = [];
    if (!game || !roundData || !Array.isArray(activePlayers)) return applied;
    const players = activePlayers.filter(name => name && !(game.retired || []).includes(name));
    const comeback = {};
    players.forEach(player => {
      if (!isComebackSuccess(game, roundData, player)) return;
      const offer = getComebackOffer(game, player, players);
      if (!offer.eligible) return;
      const clamped = clampComebackBonus({
        player,
        bonus: offer.bonus,
        baseRoundScores: roundData.scores || {},
        preRoundTotals: game.totals || {},
        players,
        winLow: offer.winLow,
        packRank: offer.packRank,
        increment: offer.scoreIncrement
      });
      applied.push({
        player,
        intended: offer.bonus,
        applied: clamped,
        clamped: clamped !== offer.bonus,
        packRank: offer.packRank
      });
      if (Math.abs(clamped) >= offer.scoreIncrement) comeback[player] = clamped;
    });
    if (Object.keys(comeback).length) roundData.comeback = comeback;
    else delete roundData.comeback;
    return applied;
  }

  function syncComebackAfterScoreEdit(game, round, player) {
    if (!round?.comeback || round.comeback[player] == null) return false;
    if (isComebackSuccess(game, round, player)) return false;
    delete round.comeback[player];
    if (!Object.keys(round.comeback).length) delete round.comeback;
    return true;
  }

  function roundScoreForPlayer(round, player) {
    if (!round || player == null) return undefined;
    if (round.scores?.[player] === undefined) return undefined;
    return (Number(round.scores[player]) || 0) + (Number(round.comeback?.[player]) || 0);
  }

  function explainComebackOffer(offer) {
    if (!offer || !offer.eligible) {
      return { summary: '', bullets: [], chipLabel: '' };
    }
    const player = String(offer.player || 'This player');
    const gameName = displayGameName(offer.gameName);
    const leadGap = Math.round(Number(offer.leaderGap) || offer.packGap || 0);
    const extra = formatSignedPoints(offer.bonus);
    const place = (Number.isFinite(offer.rank) && Number.isFinite(offer.playerCount))
      ? `${ordinal(offer.rank)} of ${offer.playerCount}`
      : '';
    const leadBit = offer.leaderPlayer
      ? `${leadGap} behind the lead (${offer.leaderPlayer})`
      : `${leadGap} behind the lead`;
    const summary = place ? `${player} is ${place}, ${leadBit}.` : `${player} is ${leadBit}.`;
    const bullets = [];
    const remaining = offer.remainingRounds;
    const chances = offer.expectedGoodTurns;
    if (offer.gameName === 'Flip 7 Vengeance') {
      bullets.push(`Flip 7 has no set finish line, so this extra is sized so about ${FLIP7_STRONG_ROUNDS} banks can close a ${leadGap}-point hole.`);
    } else if (Number.isFinite(remaining) && remaining > 0) {
      bullets.push(`About ${chances} good ${roundNoun(offer.gameName, chances)} left out of ${remaining} remaining.`);
    }
    bullets.push(`${extra} extra when ${player} ${successVerb(offer.gameName)}.`);
    bullets.push(`A worse hole gets a bigger extra. Cannot take 1st.`);
    if (offer.gameName === 'Five Crowns') {
      bullets.push(`${gameName} scores low, so the extra subtracts points — and only on a 0.`);
    }
    return { summary, bullets, chipLabel: offer.chipLabel || formatComebackChip(offer.bonus) };
  }

  function explainComebackRules(gameName) {
    const display = displayGameName(gameName);
    if (!SUPPORTED_GAMES.includes(gameName)) {
      return {
        supported: false,
        gameName: display,
        lead: `${display} does not use Comeback.`,
        how: ['Keep playing this one without extra help.'],
        extra: []
      };
    }
    let timing = `Once 4 ${roundNoun(gameName, 2)} are scored.`;
    let gap = 'You are far enough behind first place that normal play is unlikely to catch them.';
    let success = 'Extra applies only on a good turn.';
    const extra = [
      'The extra is automatic. Nobody at the table chooses it.',
      'Misses get nothing extra.',
      'A worse hole gets a bigger extra. It cannot put you in 1st.'
    ];

    if (gameName === '818') {
      timing = 'Once 4 rounds are scored.';
      gap = 'You are about 10 or more points behind first place — that is one made bid — and there are not enough rounds left to close it the normal way. In 818, 20 behind first is a big hole. 8 behind first is still a race.';
      success = 'Extra is added only when you make your bid.';
    } else if (gameName === 'Wizard') {
      timing = 'Once the first few rounds are scored (about a quarter of the game).';
      gap = 'You are further behind first than a big Wizard round. Those can swing 50 to 90 points, so 20 or even 50 down can still be ordinary.';
      success = 'Extra is added only when you make your bid.';
    } else if (gameName === 'Five Crowns') {
      timing = 'Once 4 hands are scored.';
      gap = 'Low score wins. You are far enough behind first that a couple of clean hands probably will not catch them — third place counts if that hole is real.';
      success = 'Extra subtracts points, and only if you go out with 0.';
    } else if (gameName === 'Flip 7 Vengeance') {
      timing = 'Once 4 rounds are scored.';
      gap = 'Flip 7 has no set finish line. You need to be about two and a half strong banks behind first place.';
      success = 'Extra is added only when you bank at least 10 points.';
    }

    const how = [
      'Four or more players at the table.',
      timing,
      'First place never gets extra. Second place only gets it if they are also out of reach of first.',
      gap,
      success
    ];
    return {
      supported: true,
      gameName: display,
      lead: `Automatic extra on good turns if you are truly out of reach of first in ${display} — not just having a bad ${roundNoun(gameName, 1)}. It cannot hand you the win.`,
      how,
      extra
    };
  }

  function statusLabelForReason(reason) {
    if (reason === 'retired') return 'headed back to shore';
    if (reason === 'too-early') return 'too early';
    if (reason === 'joined-late') return 'still settling in';
    if (reason === 'leading') return 'in the lead';
    if (reason === 'not-bottom-half') return 'still in the hunt';
    if (reason === 'leader-gap' || reason === 'pack-gap') return 'behind, but still able to catch the lead';
    if (reason === 'recovery-load') return 'behind, but enough rounds left to catch up';
    if (reason === 'too-few-players') return 'need 4 players';
    if (reason === 'game-over') return 'game over';
    if (reason === 'legacy-rescue') return 'not in this match';
    return 'not yet';
  }

  function summarizeComebackTable(game, activePlayers, options) {
    const rules = explainComebackRules(game?.name);
    if (!game || !rules.supported) {
      return { rules, live: null };
    }
    const opts = options || {};
    const players = (activePlayers || []).filter(name => name && !(game.retired || []).includes(name));
    const cfg = GAME_CONFIG[game.name];
    const completed = scoringRounds(game).length;
    const maxRounds = getMaxRounds(game, players);
    const minRounds = minScoringRoundsFor(game, players);
    const unit = roundNoun(game.name, minRounds || 2);
    const totals = {};
    players.forEach(name => { totals[name] = Number(game.totals?.[name]) || 0; });
    const sorted = sortPlayers(players, totals, cfg.winLow);
    const packRank = packRankFor(players.length);
    const packPlayer = sorted[packRank - 1] || null;
    const packScore = packPlayer != null ? totals[packPlayer] : 0;
    const leaderPlayer = sorted[0] || null;
    const leaderScore = leaderPlayer != null ? totals[leaderPlayer] : 0;
    const remaining = remainingRoundNumbers(completed, maxRounds);
    let catchUp = 0;
    if (game.name === 'Flip 7 Vengeance') {
      catchUp = 22 * FLIP7_STRONG_ROUNDS;
    } else if (remaining[0]) {
      catchUp = catchUpUnitForRound(game, players, remaining[0]);
    }
    const statuses = players.map(player => {
      const offer = getComebackOffer(game, player, activePlayers, opts);
      const rank = sorted.indexOf(player) + 1;
      const packGap = packGapFor(totals[player], packScore, cfg.winLow);
      const leaderGap = packGapFor(totals[player], leaderScore, cfg.winLow);
      return {
        player,
        eligible: !!offer.eligible,
        reason: offer.reason || 'not-yet',
        rank: offer.rank || rank,
        packGap: Number.isFinite(offer.packGap) ? offer.packGap : packGap,
        leaderGap: Number.isFinite(offer.leaderGap) ? offer.leaderGap : leaderGap,
        bonus: offer.eligible ? offer.bonus : 0,
        chipLabel: offer.eligible ? offer.chipLabel : '',
        label: offer.eligible ? (offer.chipLabel || 'Comeback') : statusLabelForReason(offer.reason)
      };
    });
    const ready = statuses.filter(entry => entry.eligible).map(entry => entry.player);
    const notYet = statuses.filter(entry => !entry.eligible && entry.reason !== 'retired' && entry.reason !== 'legacy-rescue');
    const roundLine = game.name === 'Flip 7 Vengeance'
      ? `${completed} ${roundNoun(game.name, completed)} scored`
      : `${completed} of ${maxRounds} ${roundNoun(game.name, maxRounds)} scored`;
    return {
      rules,
      live: {
        playerCount: players.length,
        completed,
        maxRounds: game.name === 'Flip 7 Vengeance' ? null : maxRounds,
        minRounds,
        unit,
        timingOpen: completed >= minRounds,
        roundLine,
        packRank,
        packPlayer,
        packScore,
        leaderPlayer,
        leaderScore,
        catchUp: Math.round(catchUp),
        remainingRounds: game.name === 'Flip 7 Vengeance' ? null : remaining.length,
        ready,
        notYet,
        statuses
      }
    };
  }

  const api = {
    SUPPORTED_GAMES,
    EIGHT18_ROUND_TRICKS,
    EIGHT18_BID_BONUS,
    RECOVERY_LOAD_THRESHOLD,
    FLIP7_STRONG_ROUNDS,
    FLIP7_MIN_BANK,
    GAME_CONFIG,
    ruleUnitForRound,
    getMaxRounds,
    getComebackOffer,
    explainComebackOffer,
    explainComebackRules,
    summarizeComebackTable,
    isComebackSuccess,
    clampComebackBonus,
    previewComebackApply,
    applyComebackToRound,
    syncComebackAfterScoreEdit,
    roundScoreForPlayer,
    formatComebackChip,
    formatComebackChipShort,
    formatRoundScore,
    formatSignedPoints,
    rankWithScore,
    bestAllowedRankFor,
    packRankFor,
    scoringRounds,
    isLegacyBonusRound
  };

  root.BPGComeback = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
