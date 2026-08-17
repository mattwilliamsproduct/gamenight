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
      rescueMax: 75,
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
    badSoft: '#dc2626',
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

  function formatSignedPoints(adjustment) {
    return formatPointLabel(adjustment).replace(/ Pts$/, '');
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

  function resolveBindingLimit(offer) {
    const desired = Math.max(Number(offer.oneStrongRound) || 0, Number(offer.rescueNeeded) || 0);
    const maxSafe = Number(offer.maxSafeAdjustment) || 0;
    const rankCap = Number(offer.rankCap);
    const gameCap = Number(offer.gameSafetyCap);
    if (Number.isFinite(rankCap) && maxSafe === rankCap && rankCap < desired && rankCap < gameCap) return 'rank';
    if (Number.isFinite(gameCap) && maxSafe === gameCap && gameCap < desired) return 'game-cap';
    if ((Number(offer.rescueNeeded) || 0) > (Number(offer.oneStrongRound) || 0)) return 'rescue';
    return 'one-round';
  }

  function explainLifePreserverOffer(offer) {
    if (!offer || !offer.eligible) {
      return { summary: '', wheelLine: '', bullets: [], bindingLimit: null };
    }
    const player = String(offer.player || 'This player');
    const gameName = displayGameName(offer.gameName);
    const packGap = Math.round(Number(offer.packGap) || 0);
    const winLow = !!offer.winLow;
    const sign = helpfulSign(winLow);
    const maxSafe = Number(offer.maxSafeAdjustment) || 0;
    const bestShort = formatSignedPoints(sign * maxSafe);
    const setbackShort = formatSignedPoints((-sign) * (Number(offer.maxSetback) || 0));
    const remaining = offer.remainingRounds;
    const allowed = offer.bestAllowedRank;
    const binding = offer.bindingLimit || resolveBindingLimit(offer);
    const place = (Number.isFinite(offer.rank) && Number.isFinite(offer.playerCount))
      ? `${ordinal(offer.rank)} of ${offer.playerCount}`
      : '';
    const packBit = offer.packPlayer
      ? `${packGap} points behind the pack (${offer.packPlayer})`
      : `${packGap} points behind the pack`;
    const summary = place
      ? `${player} is ${place}, ${packBit}.`
      : `${player} is ${packBit}.`;
    const wheelLine = `${player} is ${packGap} behind the pack. Best help ${bestShort}.`;
    const bullets = [];

    if (winLow) bullets.push(`${gameName} scores low, so a good spin subtracts points.`);
    else bullets.push(`${gameName} scores high, so a good spin adds points.`);

    if (offer.gameName === 'Flip 7 Vengeance') {
      bullets.push(`Flip 7 has no fixed finish line, so the wheel is sized off a couple of strong hands and this ${packGap}-point gap.`);
    } else if (Number.isFinite(remaining) && remaining > 0) {
      bullets.push(`There ${remaining === 1 ? 'is' : 'are'} ${remaining} ${roundNoun(offer.gameName, remaining)} left, and ordinary play is unlikely to close a ${packGap}-point gap.`);
    } else {
      bullets.push(`Ordinary play is unlikely to close a ${packGap}-point gap from here.`);
    }

    if (binding === 'rank') {
      bullets.push(`The biggest help is ${bestShort} because that is as far as ${player} can go without landing 1st or 2nd. ${ordinal(allowed)} is the ceiling at this table.`);
    } else if (binding === 'game-cap') {
      const ceiling = allowed ? `; ${ordinal(allowed)} is the ceiling at this table` : '';
      bullets.push(`The biggest help is ${bestShort} — ${gameName} will not give more than that in one spin. It still cannot put ${player} in 1st or 2nd${ceiling}.`);
    } else if (binding === 'rescue') {
      bullets.push(`The biggest help is ${bestShort} — enough to get back toward the pack after counting on a strong stretch of ordinary play, without handing ${player} the win.`);
    } else {
      bullets.push(`The biggest help is ${bestShort} — about one strong remaining ${roundNoun(offer.gameName, 1)} in ${gameName}. It cannot put ${player} in 1st or 2nd.`);
    }

    const lesser = [...new Set((offer.slices || [])
      .filter(slice => (Number(slice.adjustment) || 0) * sign > 0)
      .map(slice => Math.abs(slice.adjustment))
    )]
      .sort((a, b) => a - b)
      .filter(magnitude => magnitude !== maxSafe)
      .map(magnitude => formatSignedPoints(sign * magnitude));
    if (lesser.length) {
      bullets.push(`The other helpful slices are smaller shares of that same number: ${joinEnglish(lesser)}.`);
    }
    const setbacks = [...new Set((offer.slices || [])
      .filter(slice => (Number(slice.adjustment) || 0) * sign < 0)
      .map(slice => Math.abs(slice.adjustment))
    )]
      .sort((a, b) => a - b)
      .map(magnitude => formatSignedPoints((-sign) * magnitude));
    if (setbacks.length === 1) {
      bullets.push(`The red slice is a modest setback of ${setbacks[0]}.`);
    } else if (setbacks.length > 1) {
      bullets.push(`The red slices are modest setbacks of ${joinEnglish(setbacks)}.`);
    } else if (offer.maxSetback) {
      bullets.push(`The red slice is a modest setback of ${setbackShort}.`);
    }

    return { summary, wheelLine, bullets, bindingLimit: binding };
  }

  function wheelSliceKind(slice) {
    if (slice._wheelKind) return slice._wheelKind;
    if (!slice.adjustment) return 'zero';
    return slice._wheelBad ? 'bad' : 'good';
  }

  function stripWheelMeta(slice) {
    const { _wheelBad, _wheelKind, ...rest } = slice;
    return rest;
  }

  function alternateMagnitudes(slices) {
    const sorted = [...slices].sort((a, b) => (
      Math.abs(a.adjustment) - Math.abs(b.adjustment) || a.weight - b.weight
    ));
    const out = [];
    let low = 0;
    let high = sorted.length - 1;
    while (low <= high) {
      out.push(sorted[low++]);
      if (low <= high) out.push(sorted[high--]);
    }
    return out;
  }

  // Spread red/gray spacers around the wheel so helpful greens do not form one
  // Pac-Man wedge. With more greens than spacers, one pair of greens may touch.
  function arrangeWheelSlices(slices) {
    const groups = { bad: [], zero: [], good: [] };
    slices.forEach(slice => {
      groups[wheelSliceKind(slice)].push(slice);
    });
    groups.good = alternateMagnitudes(groups.good);
    groups.bad = alternateMagnitudes(groups.bad);

    const spacers = [];
    const spacerTurns = Math.max(groups.bad.length, groups.zero.length);
    for (let i = 0; i < spacerTurns; i++) {
      if (i < groups.bad.length) spacers.push(groups.bad[i]);
      if (i < groups.zero.length) spacers.push(groups.zero[i]);
    }
    if (!spacers.length) return groups.good.map(stripWheelMeta);

    const n = slices.length;
    const placed = new Array(n).fill(null);
    for (let i = 0; i < spacers.length; i++) {
      placed[Math.floor((i * n) / spacers.length)] = spacers[i];
    }
    let gi = 0;
    for (let i = 0; i < n; i++) {
      if (!placed[i]) placed[i] = groups.good[gi++];
    }
    return placed.map(stripWheelMeta);
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

  function helpfulWeightFor(recoveryLoad) {
    if (recoveryLoad >= 1) return 85;
    if (recoveryLoad >= 0.55) return 75;
    return 68;
  }

  function splitHelpfulWeights(helpfulWeight) {
    const parts = [0.26, 0.22, 0.18, 0.21];
    const weights = parts.map(part => Math.max(1, Math.round(helpfulWeight * part)));
    weights.push(Math.max(1, helpfulWeight - weights.reduce((sum, weight) => sum + weight, 0)));
    return weights;
  }

  function splitWeight(totalWeight) {
    if (totalWeight <= 1) return [Math.max(0, totalWeight)];
    const first = Math.ceil(totalWeight / 2);
    return [first, totalWeight - first];
  }

  function buildSlices(maxHelpful, maxSetback, winLow, increment, recoveryLoad) {
    const sign = helpfulSign(winLow);
    const helpful = [0.25, 0.5, 0.5, 0.75, 1].map(percent => percentMagnitude(maxHelpful, percent, increment));
    const setback = Math.max(increment, floorToIncrement(maxSetback, increment));
    const smallSetback = Math.max(increment, floorToIncrement(setback / 2, increment));
    const signedHelpful = helpful.map(magnitude => sign * magnitude);
    const helpfulWeight = helpfulWeightFor(recoveryLoad);
    const setbackWeight = recoveryLoad >= 1 ? 8 : 10;
    const zeroWeight = Math.max(6, 100 - helpfulWeight - setbackWeight);
    const helpfulWeights = splitHelpfulWeights(helpfulWeight);
    const raw = [];

    splitWeight(setbackWeight).forEach((weight, index) => {
      const magnitude = index === 0 && smallSetback !== setback ? smallSetback : setback;
      const adjustment = -sign * magnitude;
      raw.push({
        label: formatPointLabel(adjustment),
        color: index === 0 && smallSetback !== setback ? COLORS.badSoft : COLORS.badStrong,
        adjustment,
        weight,
        _wheelKind: 'bad'
      });
    });
    splitWeight(zeroWeight).forEach(weight => {
      raw.push({
        label: '0 Pts',
        color: COLORS.zero,
        adjustment: 0,
        weight,
        _wheelKind: 'zero'
      });
    });
    const helpfulColors = [COLORS.goodSoft, COLORS.goodMid, COLORS.goodMid, COLORS.goodStrong, COLORS.goodStrong];
    signedHelpful.forEach((adjustment, index) => {
      raw.push({
        label: formatPointLabel(adjustment),
        color: helpfulColors[index],
        adjustment,
        weight: helpfulWeights[index],
        _wheelKind: 'good'
      });
    });
    return arrangeWheelSlices(raw);
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
    const oneStrongRound = Math.max(
      cfg.increment,
      floorToIncrement(clamp(upcomingOpportunity, cfg.rescueMin, cfg.rescueMax), cfg.increment)
    );
    const ordinaryRecoveryLimit = game.name === 'Flip 7 Vengeance'
      ? comebackUnit * FLIP7_STRONG_ROUNDS
      : Math.max(upcomingOpportunity, RECOVERY_LOAD_THRESHOLD * totalRemainingOpportunity);
    const rescueNeeded = Math.max(0, packGap - ordinaryRecoveryLimit);
    const maxSafeAdjustment = floorToIncrement(
      Math.min(rankCap, cfg.rescueMax, Math.max(oneStrongRound, rescueNeeded)),
      cfg.increment
    );
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

    const maxSetback = Math.max(cfg.increment, floorToIncrement(oneStrongRound / 2, cfg.increment));
    const slices = buildSlices(maxSafeAdjustment, maxSetback, cfg.winLow, cfg.increment, recoveryLoad);
    const remainingRounds = game.name === 'Flip 7 Vengeance' ? null : remaining.length;
    const offer = {
      eligible: true,
      reason: 'ok',
      player,
      gameName: game.name,
      playerCount: players.length,
      packPlayer: sorted[packRank - 1],
      rank,
      leaderGap,
      packGap,
      comebackUnit,
      upcomingOpportunity,
      totalRemainingOpportunity,
      ordinaryRecoveryLimit,
      rescueNeeded,
      oneStrongRound,
      rankCap,
      gameSafetyCap: cfg.rescueMax,
      remainingRounds,
      estimatedRoundsToRecover: comebackUnit ? packGap / comebackUnit : null,
      recoveryLoad,
      bestAllowedRank: allowedRank,
      maxSafeAdjustment,
      maxSetback,
      scoreIncrement: cfg.increment,
      winLow: cfg.winLow,
      slices
    };
    offer.bindingLimit = resolveBindingLimit(offer);
    return offer;
  }

  function releaseRemovedLifePreservers(used, removedRounds) {
    const removedPlayers = new Set();
    (removedRounds || []).forEach(round => {
      if (!round?.hailMaryBonus) return;
      Object.keys(round.scores || {}).forEach(player => {
        if (player) removedPlayers.add(player);
      });
    });
    if (!removedPlayers.size) return Array.isArray(used) ? used.slice() : [];
    return (used || []).filter(player => !removedPlayers.has(player));
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
    explainLifePreserverOffer,
    releaseRemovedLifePreservers,
    capLifePreserverAdjustment,
    rankWithScore,
    bestAllowedRankFor,
    scoringRounds
  };

  root.BPGLifePreserver = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
