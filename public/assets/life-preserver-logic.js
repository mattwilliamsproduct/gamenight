(function (root) {
  'use strict';

  const SUPPORTED_GAMES = Object.freeze(['818', 'Wizard', 'Five Crowns', 'Flip 7 Vengeance']);
  const EIGHT18_ROUND_TRICKS = Object.freeze([8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8]);
  const RECOVERY_LOAD_THRESHOLD = 0.4;
  const FLIP7_STRONG_ROUNDS = 2.5;
  const VOLATILITY_MIN_ROUNDS = 3;
  const VOLATILITY_WINDOW = 4;
  const FACTOR_MIN = 0.5;
  const FACTOR_MAX = 1.5;

  const GAME_CONFIG = {
    '818': {
      winLow: false,
      maxRounds: 15,
      increment: 1,
      rescueMin: 8,
      rescueMax: 15,
      minScoringRounds: 4,
      fallback: 22
    },
    Wizard: {
      winLow: false,
      increment: 5,
      rescueMin: 25,
      rescueMax: 60,
      minScoringRounds: null,
      fallback: 40
    },
    'Five Crowns': {
      winLow: true,
      maxRounds: 11,
      increment: 5,
      rescueMin: 10,
      rescueMax: 40,
      minScoringRounds: 4,
      fallback: 24
    },
    'Flip 7 Vengeance': {
      winLow: false,
      maxRounds: 999,
      increment: 5,
      rescueMin: 15,
      rescueMax: 40,
      minScoringRounds: 4,
      fallback: 22
    }
  };

  const COLORS = {
    badStrong: '#991b1b',
    goodStrong: '#10b981',
    goodMid: '#34d399',
    goodSoft: '#6ee7b7',
    zero: '#8a837e'
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isScoringRound(round) {
    return !!(round && !round.hailMaryBonus);
  }

  function scoringRounds(game) {
    return (game?.rounds || []).filter(isScoringRound);
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function getMaxRounds(game, activePlayers) {
    const name = game?.name;
    if (name === 'Wizard') return Math.floor(60 / Math.max(activePlayers.length, 1));
    return GAME_CONFIG[name]?.maxRounds || 0;
  }

  function ruleUnitForRound(gameName, roundNumber) {
    if (gameName === '818') return 10 + (EIGHT18_ROUND_TRICKS[roundNumber - 1] || 0);
    if (gameName === 'Wizard') return 20 + (10 * roundNumber);
    if (gameName === 'Five Crowns') return 4 * (roundNumber + 2);
    if (gameName === 'Flip 7 Vengeance') return 22;
    return 0;
  }

  function roundSpread(round, activePlayers) {
    const scores = activePlayers
      .map(player => Number(round?.scores?.[player]))
      .filter(score => Number.isFinite(score));
    if (scores.length < 2) return 0;
    return Math.max(...scores) - Math.min(...scores);
  }

  function volatilityFactor(game, activePlayers) {
    const completed = scoringRounds(game);
    if (completed.length < VOLATILITY_MIN_ROUNDS) return 1;
    const recent = completed.slice(-VOLATILITY_WINDOW);
    const recentMedian = median(recent.map(round => roundSpread(round, activePlayers)));
    const lastRoundNumber = completed[completed.length - 1]?.round || completed.length;
    const baseline = ruleUnitForRound(game.name, lastRoundNumber);
    if (!baseline) return 1;
    return clamp(recentMedian / baseline, FACTOR_MIN, FACTOR_MAX);
  }

  function unitForRound(game, activePlayers, roundNumber, factor) {
    return ruleUnitForRound(game.name, roundNumber) * factor;
  }

  function remainingRoundNumbers(completedCount, maxRounds) {
    const rounds = [];
    for (let round = completedCount + 1; round <= maxRounds; round++) rounds.push(round);
    return rounds;
  }

  function floorToIncrement(value, increment) {
    if (increment <= 0) return Math.floor(value);
    return Math.floor(value / increment) * increment;
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

  function formatPointLabel(adjustment) {
    if (!adjustment) return '0 Pts';
    const sign = adjustment > 0 ? '+' : '−';
    return `${sign}${Math.abs(adjustment)} Pts`;
  }

  function interleaveWheelSlicesByKind(slices) {
    const bad = slices.filter(slice => slice._wheelBad);
    const good = slices.filter(slice => !slice._wheelBad);
    if (!bad.length || !good.length) return slices.map(({ _wheelBad, ...rest }) => rest);
    const out = [];
    let bi = 0;
    let gi = 0;
    while (bi < bad.length || gi < good.length) {
      if (bi >= bad.length) {
        good.slice(gi).forEach(slice => out.push(slice));
        break;
      }
      if (gi >= good.length) {
        bad.slice(bi).forEach(slice => out.push(slice));
        break;
      }
      if (bi / bad.length <= gi / good.length) out.push(bad[bi++]);
      else out.push(good[gi++]);
    }
    return out.map(({ _wheelBad, ...rest }) => rest);
  }

  function bestAllowedRankFor(playerCount, currentRank) {
    const rankCeiling = Math.max(3, Math.ceil(playerCount / 2));
    const overtakeFloor = currentRank - Math.floor(playerCount / 2);
    return Math.max(rankCeiling, overtakeFloor);
  }

  function maxLegalHelpfulMagnitude(player, players, totals, winLow, increment, allowedRank) {
    const current = Number(totals[player]) || 0;
    const sign = helpfulSign(winLow);
    let best = 0;
    for (let magnitude = increment; magnitude <= 800; magnitude += increment) {
      const rank = rankWithScore(player, current + (sign * magnitude), players, totals, winLow);
      if (rank >= allowedRank && rank > 2) best = magnitude;
      else break;
    }
    return best;
  }

  function percentMagnitude(maxHelpful, percent, increment) {
    const raw = floorToIncrement(maxHelpful * percent, increment);
    if (maxHelpful < increment) return 0;
    return Math.max(increment, raw);
  }

  function buildSlices(maxHelpful, maxSetback, winLow, increment) {
    const sign = helpfulSign(winLow);
    const helpful = [0.25, 0.5, 0.5, 0.75, 1].map(percent => percentMagnitude(maxHelpful, percent, increment));
    const setback = Math.max(increment, floorToIncrement(maxSetback, increment));
    const signedHelpful = helpful.map(magnitude => sign * magnitude);
    const signedSetback = -sign * setback;
    const raw = [
      { label: formatPointLabel(signedSetback), color: COLORS.badStrong, adjustment: signedSetback, weight: 10, _wheelBad: true },
      { label: '0 Pts', color: COLORS.zero, adjustment: 0, weight: 8, _wheelBad: false },
      { label: '0 Pts', color: COLORS.zero, adjustment: 0, weight: 7, _wheelBad: false },
      { label: formatPointLabel(signedHelpful[0]), color: COLORS.goodSoft, adjustment: signedHelpful[0], weight: 20, _wheelBad: false },
      { label: formatPointLabel(signedHelpful[1]), color: COLORS.goodMid, adjustment: signedHelpful[1], weight: 16, _wheelBad: false },
      { label: formatPointLabel(signedHelpful[2]), color: COLORS.goodMid, adjustment: signedHelpful[2], weight: 14, _wheelBad: false },
      { label: formatPointLabel(signedHelpful[3]), color: COLORS.goodStrong, adjustment: signedHelpful[3], weight: 16, _wheelBad: false },
      { label: formatPointLabel(signedHelpful[4]), color: COLORS.goodStrong, adjustment: signedHelpful[4], weight: 9, _wheelBad: false }
    ];
    return interleaveWheelSlicesByKind(raw);
  }

  function ineligible(reason, extras) {
    return Object.assign({
      eligible: false,
      reason,
      rank: null,
      leaderGap: 0,
      packGap: 0,
      comebackUnit: 0,
      upcomingOpportunity: 0,
      totalRemainingOpportunity: 0,
      estimatedRoundsToRecover: null,
      recoveryLoad: null,
      bestAllowedRank: null,
      maxSafeAdjustment: 0,
      maxSetback: 0,
      scoreIncrement: 1,
      winLow: false,
      slices: []
    }, extras);
  }

  function getLifePreserverOffer(game, player, activePlayers, options) {
    const opts = options || {};
    if (!game || !player || !Array.isArray(activePlayers) || !activePlayers.includes(player)) {
      return ineligible('inactive');
    }
    if (opts.gameOver) return ineligible('game-over');
    if (!SUPPORTED_GAMES.includes(game.name)) return ineligible('unsupported-game');
    if ((game.retired || []).includes(player)) return ineligible('retired');
    if ((game.hailMaryUsed || []).includes(player)) return ineligible('used');

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

    const wizardMinRounds = Math.max(3, Math.ceil(0.25 * maxRounds));
    const minRounds = game.name === 'Wizard' ? wizardMinRounds : cfg.minScoringRounds;
    if (completedCount < minRounds) {
      return ineligible('too-early', { winLow: cfg.winLow, scoreIncrement: cfg.increment });
    }

    const sorted = sortPlayers(players, totals, cfg.winLow);
    const rank = sorted.indexOf(player) + 1;
    const packRank = Math.ceil(players.length / 2);
    if (rank <= packRank) {
      return ineligible('not-bottom-half', {
        rank,
        winLow: cfg.winLow,
        scoreIncrement: cfg.increment
      });
    }

    const playerScore = totals[player];
    const packScore = totals[sorted[packRank - 1]];
    const leaderScore = totals[sorted[0]];
    const packGap = packGapFor(playerScore, packScore, cfg.winLow);
    const leaderGap = packGapFor(playerScore, leaderScore, cfg.winLow);
    const factor = volatilityFactor(game, players);
    const remaining = remainingRoundNumbers(completedCount, maxRounds);
    const upcomingRound = remaining[0];
    let upcomingOpportunity = 0;
    let totalRemainingOpportunity = 0;
    let comebackUnit = 0;

    if (game.name === 'Flip 7 Vengeance') {
      comebackUnit = clamp(22 * factor, 10, 40);
      upcomingOpportunity = comebackUnit;
      totalRemainingOpportunity = comebackUnit * FLIP7_STRONG_ROUNDS;
    } else {
      if (!remaining.length) return ineligible('game-over', { rank, winLow: cfg.winLow, scoreIncrement: cfg.increment });
      upcomingOpportunity = unitForRound(game, players, upcomingRound, factor);
      totalRemainingOpportunity = remaining.reduce((sum, roundNumber) => (
        sum + unitForRound(game, players, roundNumber, factor)
      ), 0);
      comebackUnit = upcomingOpportunity;
    }

    if (!(packGap > upcomingOpportunity)) {
      return ineligible('pack-gap', {
        rank,
        leaderGap,
        packGap,
        comebackUnit,
        upcomingOpportunity,
        totalRemainingOpportunity,
        winLow: cfg.winLow,
        scoreIncrement: cfg.increment
      });
    }

    const recoveryLoad = totalRemainingOpportunity > 0 ? packGap / totalRemainingOpportunity : Infinity;
    const loadOk = game.name === 'Flip 7 Vengeance'
      ? packGap / comebackUnit >= FLIP7_STRONG_ROUNDS
      : recoveryLoad >= RECOVERY_LOAD_THRESHOLD;
    if (!loadOk) {
      return ineligible('recovery-load', {
        rank,
        leaderGap,
        packGap,
        comebackUnit,
        upcomingOpportunity,
        totalRemainingOpportunity,
        recoveryLoad,
        winLow: cfg.winLow,
        scoreIncrement: cfg.increment
      });
    }

    const allowedRank = bestAllowedRankFor(players.length, rank);
    const rankCap = maxLegalHelpfulMagnitude(player, players, totals, cfg.winLow, cfg.increment, allowedRank);
    const rescueCap = floorToIncrement(clamp(upcomingOpportunity, cfg.rescueMin, cfg.rescueMax), cfg.increment);
    const maxSafeAdjustment = floorToIncrement(Math.min(rankCap, rescueCap), cfg.increment);
    if (maxSafeAdjustment < cfg.increment) {
      return ineligible('no-legal-help', {
        rank,
        leaderGap,
        packGap,
        comebackUnit,
        upcomingOpportunity,
        totalRemainingOpportunity,
        recoveryLoad,
        bestAllowedRank: allowedRank,
        winLow: cfg.winLow,
        scoreIncrement: cfg.increment
      });
    }

    const maxSetback = Math.max(cfg.increment, floorToIncrement(rescueCap / 2, cfg.increment));
    const slices = buildSlices(maxSafeAdjustment, maxSetback, cfg.winLow, cfg.increment);

    return {
      eligible: true,
      reason: 'ok',
      player,
      rank,
      leaderGap,
      packGap,
      comebackUnit,
      upcomingOpportunity,
      totalRemainingOpportunity,
      estimatedRoundsToRecover: comebackUnit ? packGap / comebackUnit : null,
      recoveryLoad,
      bestAllowedRank: allowedRank,
      maxSafeAdjustment,
      maxSetback,
      scoreIncrement: cfg.increment,
      winLow: cfg.winLow,
      slices
    };
  }

  function capLifePreserverAdjustment(adjustment, offer) {
    if (!offer) return 0;
    const increment = offer.scoreIncrement || 1;
    const winLow = !!offer.winLow;
    const sign = helpfulSign(winLow);
    let adj = Number(adjustment) || 0;
    if (adj * sign > 0) {
      const magnitude = Math.min(Math.abs(adj), offer.maxSafeAdjustment || 0);
      adj = sign * floorToIncrement(magnitude, increment);
    } else if (adj * sign < 0) {
      const magnitude = Math.min(Math.abs(adj), offer.maxSetback || 0);
      adj = -sign * floorToIncrement(magnitude, increment);
    } else {
      adj = 0;
    }
    return adj;
  }

  const api = {
    SUPPORTED_GAMES,
    EIGHT18_ROUND_TRICKS,
    RECOVERY_LOAD_THRESHOLD,
    FLIP7_STRONG_ROUNDS,
    GAME_CONFIG,
    ruleUnitForRound,
    getMaxRounds,
    getLifePreserverOffer,
    capLifePreserverAdjustment,
    rankWithScore,
    bestAllowedRankFor,
    scoringRounds
  };

  root.BPGLifePreserver = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
