(function (root) {
  'use strict';

  const SUPPORTED_GAMES = Object.freeze(['818', 'Wizard', 'Five Crowns', 'Flip 7 Vengeance']);
  const EIGHT18_ROUND_TRICKS = Object.freeze([8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8]);
  const RECOVERY_LOAD_THRESHOLD = 0.4;
  const EIGHT18_BID_BONUS = 10;
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
      rescueMax: 20,
      minScoringRounds: 4,
      fallback: 22,
      // Made bids are +10. Two made bids (+20) is a real lift. Closing all the way
      // to 1st-minus-1 is too much — they still have to play their way in.
      recoveryLoad: 0.55
    },
    Wizard: {
      winLow: false,
      increment: 5,
      rescueMin: 25,
      rescueMax: 60,
      minScoringRounds: null,
      fallback: 40,
      // A made round can be 50–90, so 20–50 down is still ordinary.
      recoveryLoad: 0.4
    },
    'Five Crowns': {
      winLow: true,
      maxRounds: 11,
      increment: 5,
      rescueMin: 10,
      rescueMax: 75,
      minScoringRounds: 4,
      fallback: 24,
      recoveryLoad: 0.4
    },
    'Flip 7 Vengeance': {
      winLow: false,
      maxRounds: 999,
      increment: 5,
      rescueMin: 15,
      rescueMax: 40,
      minScoringRounds: 4,
      fallback: 22,
      recoveryLoad: null
    }
  };

  const COLORS = {
    badStrong: '#c47a6a',
    badSoft: '#e4b4a6',
    goodStrong: '#0f766e',
    goodMid: '#2a9d8f',
    goodSoft: '#7bc9b7',
    zero: '#b4a89c'
  };

  // One tunable wheel. Odds stay here. Amounts are derived from each game's increment
  // and then clamped by max helpful / max setback. Do not change eligibility here.
  const OUTCOME_TABLE = Object.freeze({
    smallHelp: 0.45,
    mediumHelp: 0.30,
    bigHelp: 0.05,
    noChange: 0.12,
    smallSetback: 0.08
  });

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

  // How far you can realistically gain on the pack in one round of ordinary play.
  // 818 trick points are shared; the swing that actually separates people is making
  // the bid. Wizard/Five Crowns keep their full round units because those games really
  // do move by that much.
  function catchUpUnitForRound(game, activePlayers, roundNumber, factor) {
    if (game.name === '818') {
      const tricks = EIGHT18_ROUND_TRICKS[roundNumber - 1] || 0;
      const extra = Math.max(0, Math.round(tricks / Math.max(activePlayers.length, 2)) - 1);
      return (EIGHT18_BID_BONUS + extra) * factor;
    }
    return unitForRound(game, activePlayers, roundNumber, factor);
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

  function formatSignedPoints(adjustment) {
    if (!adjustment) return '0';
    return `${adjustment > 0 ? '+' : '−'}${Math.abs(adjustment)}`;
  }

  function formatPointLabel(adjustment) {
    if (!adjustment) return '0 Pts';
    return `${formatSignedPoints(adjustment)} Pts`;
  }

  function formatWheelLabel(adjustment, kind) {
    const signed = formatSignedPoints(adjustment);
    if (kind === 'zero' || !adjustment) return `${signed} · No change`;
    if (kind === 'bad') return `${signed} · Setback`;
    return `${signed} · Help`;
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
    const leaderGap = Math.round(Number(offer.leaderGap) || 0);
    const winLow = !!offer.winLow;
    const sign = helpfulSign(winLow);
    const maxSafe = Number(offer.maxSafeAdjustment) || 0;
    const bestShort = formatSignedPoints(sign * maxSafe);
    const setbackShort = formatSignedPoints((-sign) * (Number(offer.maxSetback) || 0));
    const remaining = offer.remainingRounds;
    const binding = offer.bindingLimit || resolveBindingLimit(offer);
    const place = (Number.isFinite(offer.rank) && Number.isFinite(offer.playerCount))
      ? `${ordinal(offer.rank)} of ${offer.playerCount}`
      : '';
    const leaderBit = offer.leaderPlayer
      ? `${leaderGap} points behind 1st (${offer.leaderPlayer})`
      : `${leaderGap} points behind 1st`;
    const summary = place
      ? `${player} is ${place}, ${leaderBit}.`
      : `${player} is ${leaderBit}.`;
    const adjustments = (offer.slices || []).map(slice => Number(slice.adjustment) || 0);
    const bestAdj = sign * maxSafe;
    const worstShown = adjustments.length
      ? (sign > 0 ? Math.min(...adjustments) : Math.max(...adjustments))
      : (-sign) * (Number(offer.maxSetback) || 0);
    const playerScore = Number.isFinite(offer.playerScore) ? offer.playerScore : null;
    const gameLine = winLow
      ? `${gameName}: lower scores win. Helpful spins subtract points.`
      : `${gameName}: higher scores win. Helpful spins add points.`;
    const rangeLine = `Best help: ${formatSignedPoints(bestAdj)} points · Largest setback: ${formatSignedPoints(worstShown)} points`;
    const standingBit = playerScore == null
      ? `${leaderGap} behind 1st`
      : `total ${playerScore} · ${leaderGap} behind 1st`;
    const wheelLine = `${player} ${standingBit}. ${rangeLine}`;
    let bestPlaceLine = '';
    if (Number.isFinite(offer.bestPlaceAfter) && Number.isFinite(offer.rank)) {
      if (offer.bestPlaceAfter !== offer.rank) {
        bestPlaceLine = `Best outcome would move you to ${ordinal(offer.bestPlaceAfter)}`;
      }
    }
    const bullets = [];

    bullets.push(`${gameLine} ${rangeLine}`);

    if (offer.gameName === 'Flip 7 Vengeance') {
      bullets.push(`Flip 7 has no fixed finish line, so the wheel is sized off a couple of strong hands and this ${leaderGap}-point hole behind 1st.`);
    } else if (Number.isFinite(remaining) && remaining > 0) {
      bullets.push(`There ${remaining === 1 ? 'is' : 'are'} ${remaining} ${roundNoun(offer.gameName, remaining)} left, and ordinary play is unlikely to catch 1st from ${leaderGap} back.`);
    } else {
      bullets.push(`Ordinary play is unlikely to catch 1st from ${leaderGap} back.`);
    }

    if (binding === 'rank') {
      bullets.push(`Best is ${bestShort} because that is as far as ${player} can go without matching 1st. The spin always stays at least one step behind the lead.`);
    } else if (binding === 'game-cap') {
      bullets.push(`Best is ${bestShort} — ${gameName} will not give more than that in one spin. Cannot tie or pass the leader.`);
    } else if (binding === 'rescue') {
      bullets.push(`Best is ${bestShort} — enough to get back in the hunt after counting on a strong stretch of ordinary play, without matching 1st.`);
    } else {
      bullets.push(`Best is ${bestShort} — about one strong remaining ${roundNoun(offer.gameName, 1)} in ${gameName}. It cannot match or pass 1st.`);
    }

    const lesser = [...new Set((offer.slices || [])
      .filter(slice => (Number(slice.adjustment) || 0) * sign > 0)
      .map(slice => Math.abs(slice.adjustment))
    )]
      .sort((a, b) => a - b)
      .filter(magnitude => magnitude !== maxSafe)
      .map(magnitude => formatSignedPoints(sign * magnitude));
    if (lesser.length) {
      bullets.push(`Most helpful slices are small (${joinEnglish(lesser.slice(0, 2))}); a few are larger shares of the same best.`);
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

    return { summary, wheelLine, gameLine, rangeLine, bestPlaceLine, bullets, bindingLimit: binding };
  }

  function minScoringRoundsFor(game, players) {
    const cfg = GAME_CONFIG[game?.name];
    if (!cfg) return null;
    if (game.name === 'Wizard') {
      return Math.max(3, Math.ceil(0.25 * getMaxRounds(game, players || [])));
    }
    return cfg.minScoringRounds;
  }

  function explainLifePreserverRules(gameName) {
    const display = displayGameName(gameName);
    if (!SUPPORTED_GAMES.includes(gameName)) {
      return {
        supported: false,
        gameName: display,
        lead: `${display} does not use Life Preservers.`,
        how: ['Keep playing this one without a rescue spin.'],
        wheel: []
      };
    }
    const unit = roundNoun(gameName, 2);
    let timing = `Once 4 ${unit} are scored.`;
    let gap = 'You are far enough behind 1st that normal play is unlikely to catch them.';
    const wheel = [
      'Most slices help. Some do nothing. A few hurt a little.',
      'Cannot tie or pass the leader.'
    ];

    if (gameName === '818') {
      timing = 'Once 4 rounds are scored.';
      gap = 'You are far enough behind 1st that the remaining rounds cannot close it the normal way. In 818, about two made bids back with only a few rounds left is a big hole. 8 behind first is still a race.';
    } else if (gameName === 'Wizard') {
      timing = 'Once the first few rounds are scored (about a quarter of the game).';
      gap = 'You are further behind 1st than a big Wizard round. Those can swing 50 to 90 points, so 20 or even 50 down can still be ordinary.';
    } else if (gameName === 'Five Crowns') {
      timing = 'Once 4 hands are scored.';
      gap = 'Low score wins. You are far enough behind 1st that a couple of clean hands probably will not catch them.';
      wheel.unshift('A good spin subtracts points.');
    } else if (gameName === 'Flip 7 Vengeance') {
      timing = 'Once 4 rounds are scored.';
      gap = 'Flip 7 has no set finish line. You need to be about two and a half strong banks behind 1st.';
    }

    const how = [
      'Four or more players at the table.',
      timing,
      'You are not in 1st. 2nd can get one too, but only if they are also too far back to catch the lead.',
      gap,
      'You have not used yours yet. One spin per player per match.',
      'Once it unlocks, it stays for this scoring period even if someone else takes theirs first. After the next scores go in, it can drop or come back until you take it.',
      'If 1st is crushing the whole table, everyone who cannot catch them gets one. If only the last player is cooked, only they get one.'
    ];
    return {
      supported: true,
      gameName: display,
      lead: `A one-time rescue if you are truly out of the hunt in ${display} — not just having a bad ${roundNoun(gameName, 1)}. It cannot hand you the win.`,
      how,
      wheel
    };
  }

  function statusLabelForReason(reason) {
    if (reason === 'used') return 'already used';
    if (reason === 'retired') return 'headed back to shore';
    if (reason === 'too-early') return 'too early';
    if (reason === 'leading') return 'already in 1st';
    if (reason === 'not-bottom-half') return 'still close enough to catch 1st';
    if (reason === 'leader-gap' || reason === 'pack-gap') return 'behind, but still close enough to catch 1st';
    if (reason === 'recovery-load') return 'behind, but enough rounds left to catch 1st';
    if (reason === 'too-few-players') return 'need 4 players';
    if (reason === 'game-over') return 'game over';
    if (reason === 'no-legal-help') return 'no safe rescue right now';
    return 'not yet';
  }

  function summarizeLifePreserverTable(game, activePlayers, options) {
    const rules = explainLifePreserverRules(game?.name);
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
    const leaderPlayer = sorted[0] || null;
    const leaderScore = leaderPlayer != null ? totals[leaderPlayer] : 0;
    const packRank = Math.max(1, Math.ceil(players.length / 2));
    const packPlayer = sorted[packRank - 1] || null;
    const packScore = packPlayer != null ? totals[packPlayer] : 0;
    const factor = volatilityFactor(game, players);
    const remaining = remainingRoundNumbers(completed, maxRounds);
    let catchUp = 0;
    if (game.name === 'Flip 7 Vengeance') {
      catchUp = clamp(22 * factor, 10, 40) * FLIP7_STRONG_ROUNDS;
    } else if (remaining[0]) {
      catchUp = catchUpUnitForRound(game, players, remaining[0], factor);
    }
    const statuses = players.map(player => {
      const offer = getLifePreserverOffer(game, player, activePlayers, opts);
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
        label: offer.eligible ? 'ready to spin' : statusLabelForReason(offer.reason)
      };
    });
    const ready = statuses.filter(entry => entry.eligible).map(entry => entry.player);
    const used = statuses.filter(entry => entry.reason === 'used').map(entry => entry.player);
    const notYet = statuses.filter(entry => !entry.eligible && entry.reason !== 'used' && entry.reason !== 'retired');
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
        used,
        notYet
      }
    };
  }

  function wheelSliceKind(slice) {
    if (slice.kind === 'good' || slice.kind === 'bad' || slice.kind === 'zero') return slice.kind;
    if (slice._wheelKind) return slice._wheelKind;
    if (!slice.adjustment) return 'zero';
    return slice._wheelBad ? 'bad' : 'good';
  }

  function stripWheelMeta(slice) {
    const { _wheelBad, _wheelKind, ...rest } = slice;
    return {
      ...rest,
      kind: slice.kind || _wheelKind || wheelSliceKind(slice)
    };
  }

  function sliceArcs(slices) {
    const total = (slices || []).reduce((sum, slice) => sum + (Number(slice.weight) || 0), 0) || 1;
    let angle = -Math.PI / 2;
    return (slices || []).map((slice) => {
      const fraction = (Number(slice.weight) || 0) / total;
      const arc = fraction * Math.PI * 2;
      const start = angle;
      const end = angle + arc;
      angle = end;
      return {
        adjustment: Number(slice.adjustment) || 0,
        weight: Number(slice.weight) || 0,
        kind: wheelSliceKind(slice),
        fraction,
        start,
        end,
        arc
      };
    });
  }

  const ROULETTE_UNIT = 0.025;
  const WHEEL_OUTER_FRAC = 0.96;
  const WHEEL_INNER_FRAC = 0.18;

  function outcomeKey(slice) {
    return `${wheelSliceKind(slice)}:${Number(slice.adjustment) || 0}`;
  }

  function segmentCountFor(weight) {
    const value = Number(weight) || 0;
    if (value <= 0) return 0;
    return Math.max(1, Math.round(value / ROULETTE_UNIT));
  }

  function mergeEqualOutcomes(slices) {
    const map = new Map();
    (slices || []).forEach((slice) => {
      const key = outcomeKey(slice);
      if (!map.has(key)) {
        map.set(key, {
          ...stripWheelMeta(slice),
          weight: 0,
          outcomeKey: key
        });
      }
      map.get(key).weight += Number(slice.weight) || 0;
    });
    return [...map.values()].filter((slice) => slice.weight > 0);
  }

  function assignOutcomeColors(outcomes) {
    const goods = outcomes.filter((slice) => wheelSliceKind(slice) === 'good')
      .sort((a, b) => Math.abs(a.adjustment) - Math.abs(b.adjustment));
    const bads = outcomes.filter((slice) => wheelSliceKind(slice) === 'bad')
      .sort((a, b) => Math.abs(a.adjustment) - Math.abs(b.adjustment));
    const goodColors = [COLORS.goodSoft, COLORS.goodMid, COLORS.goodStrong];
    const badColors = [COLORS.badSoft, COLORS.badStrong];
    goods.forEach((slice, index) => {
      slice.color = goodColors[Math.min(index, goodColors.length - 1)];
    });
    bads.forEach((slice, index) => {
      slice.color = badColors[Math.min(index, badColors.length - 1)];
    });
    outcomes.forEach((slice) => {
      if (wheelSliceKind(slice) === 'zero') slice.color = COLORS.zero;
    });
    return outcomes;
  }

  function summarizeWheelOutcomes(slices) {
    const merged = mergeEqualOutcomes(slices);
    const total = merged.reduce((sum, slice) => sum + (Number(slice.weight) || 0), 0) || 1;
    return merged.map((slice) => {
      const segments = (slices || []).filter((item) => outcomeKey(item) === slice.outcomeKey).length
        || segmentCountFor(slice.weight);
      return {
        outcomeKey: slice.outcomeKey,
        adjustment: Number(slice.adjustment) || 0,
        kind: wheelSliceKind(slice),
        label: formatSignedPoints(slice.adjustment),
        probability: (Number(slice.weight) || 0) / total,
        weight: Number(slice.weight) || 0,
        segments,
        arcDegrees: ((Number(slice.weight) || 0) / total) * 360
      };
    }).sort((a, b) => a.adjustment - b.adjustment || a.kind.localeCompare(b.kind));
  }

  function arrangeRouletteSegments(outcomes) {
    const bags = (outcomes || []).map((outcome) => {
      const n = segmentCountFor(outcome.weight);
      return {
        outcome,
        key: outcome.outcomeKey || outcomeKey(outcome),
        kind: wheelSliceKind(outcome),
        color: outcome.color,
        left: n,
        n,
        each: n ? (Number(outcome.weight) || 0) / n : 0
      };
    }).filter((bag) => bag.n > 0);
    const total = bags.reduce((sum, bag) => sum + bag.n, 0);
    const out = [];
    const remaining = () => bags.reduce((sum, bag) => sum + bag.left, 0);
    const score = (bag, last) => {
      if (bag.left <= 0) return -1e9;
      const placed = total - remaining();
      const expected = bag.n * (placed + 1) / Math.max(total, 1);
      const already = bag.n - bag.left;
      let value = (expected - already) * 12;
      if (last) {
        if (bag.key === last.outcomeKey) value -= 90;
        if (bag.color === last.color) value -= 22;
        if (bag.kind === last.kind) value -= 8;
        if (last.kind === 'bad' && bag.kind === 'bad') value -= 400;
      }
      return value;
    };
    for (let i = 0; i < total; i++) {
      const last = out[out.length - 1];
      let best = null;
      let bestScore = -1e12;
      bags.forEach((bag) => {
        const value = score(bag, last);
        if (value > bestScore) {
          bestScore = value;
          best = bag;
        }
      });
      best.left -= 1;
      const slice = makeSlice(best.outcome.adjustment, best.kind, best.color, best.each);
      slice.outcomeKey = best.key;
      slice.segmentIndex = best.n - best.left - 1;
      slice.segmentCount = best.n;
      out.push(slice);
    }
    if (out.length > 2) {
      const first = out[0];
      const last = out[out.length - 1];
      const wrapClash = first.outcomeKey === last.outcomeKey
        || (first.kind === 'bad' && last.kind === 'bad');
      if (wrapClash) {
        for (let i = 1; i < out.length - 1; i++) {
          const candidate = out[i];
          const prev = out[i - 1];
          const next = out[i + 1];
          if (candidate.outcomeKey === first.outcomeKey) continue;
          if (candidate.kind === 'bad' && last.kind === 'bad') continue;
          if (prev.kind === 'bad' && last.kind === 'bad') continue;
          if (next.kind === 'bad' && first.kind === 'bad') continue;
          out[i] = last;
          out[out.length - 1] = candidate;
          break;
        }
      }
    }
    return out;
  }

  function attachSliceArcs(slices) {
    const arcs = sliceArcs(slices);
    (slices || []).forEach((slice, index) => {
      slice._start = arcs[index].start;
      slice._end = arcs[index].end;
    });
    return slices || [];
  }

  function landingDegreesForSlice(slice, random) {
    if (!slice || !Number.isFinite(slice._start) || !Number.isFinite(slice._end)) return 0;
    const span = slice._end - slice._start;
    if (span <= 0) return rotationDegreesForSlice(slice);
    const inset = Math.min(Math.max(span * 0.18, span * 0.08), span * 0.35);
    const lo = slice._start + inset;
    const hi = slice._end - inset;
    const draw = typeof random === 'function' ? Number(random()) : 0.5;
    const t = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 1) : 0.5;
    const angle = lo + (hi - lo) * t;
    return ((angle + Math.PI / 2) * 180) / Math.PI;
  }

  function wheelAngleFromDegrees(degrees) {
    return ((Number(degrees) || 0) * Math.PI) / 180 - Math.PI / 2;
  }

  function angleInArc(angle, start, end) {
    const twoPi = Math.PI * 2;
    let a = angle;
    let s = start;
    let e = end;
    while (s < 0) {
      s += twoPi;
      a += twoPi;
      e += twoPi;
    }
    while (a < s) a += twoPi;
    return a <= e + 1e-6;
  }

  function pointInSlice(x, y, cx, cy, inner, outer, start, end, pad) {
    const dx = x - cx;
    const dy = y - cy;
    const radius = Math.hypot(dx, dy);
    const slack = Number.isFinite(pad) ? pad : 1.5;
    if (radius < inner - slack || radius > outer + slack) return false;
    return angleInArc(Math.atan2(dy, dx), start, end);
  }

  function labelLayout(slice, geometry) {
    const geo = geometry || {};
    const cx = Number(geo.cx) || 0;
    const cy = Number(geo.cy) || 0;
    const outer = Number(geo.outer) || 0;
    const inner = Number(geo.inner) || 0;
    const cssWidth = Number(geo.cssWidth) || outer * 2 || 1;
    const canvasWidth = Number(geo.canvasWidth) || cssWidth;
    const start = Number.isFinite(slice?._start) ? slice._start : -Math.PI / 2;
    const end = Number.isFinite(slice?._end) ? slice._end : start;
    const arc = Math.max(end - start, 0);
    const mid = start + arc / 2;
    const midR = (inner + outer) / 2;
    const signed = formatSignedPoints(slice?.adjustment);
    const scale = canvasWidth / cssWidth;
    const chord = 2 * Math.sin(arc / 2) * midR;
    const radial = Math.max(outer - inner, 1);
    const radialMode = chord < Math.max(40 * scale, signed.length * 18 * scale);
    const chordCss = chord / scale;
    const radialCss = radial / scale;
    const targetCss = Math.max(11, Math.min(cssWidth * 0.055, radialCss * 0.2, radialMode ? chordCss * 0.72 : chordCss * 0.42));
    const cssFont = Math.max(10, Math.min(targetCss, radialMode ? chordCss * 0.78 : chordCss * 0.48));
    const canvasFont = cssFont * scale;
    const textW = signed.length * canvasFont * 0.62;
    const textH = canvasFont;
    const x = cx + Math.cos(mid) * midR;
    const y = cy + Math.sin(mid) * midR;
    let rotation = 0;
    if (radialMode) {
      rotation = mid;
      if (Math.cos(mid) < 0) rotation += Math.PI;
    }
    const hw = textW / 2;
    const hh = textH / 2;
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh }
    ].map((point) => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      return {
        x: x + point.x * cos - point.y * sin,
        y: y + point.x * sin + point.y * cos
      };
    });
    const pad = Math.max(1.25 * scale, 1);
    const insideSegment = corners.every((point) => (
      pointInSlice(point.x, point.y, cx, cy, inner, outer, start, end, pad)
    ));
    const insidePie = corners.every((point) => {
      const radius = Math.hypot(point.x - cx, point.y - cy);
      return radius <= outer + pad && radius >= Math.max(0, inner - pad);
    });
    return {
      text: signed,
      x,
      y,
      mid,
      midR,
      arc,
      rotation,
      radialMode,
      canvasFont,
      cssFont,
      textW,
      textH,
      corners,
      insideSegment,
      insidePie,
      kind: wheelSliceKind(slice || {})
    };
  }

  function bestAllowedRankFor(_playerCount, _currentRank) {
    // A spin can put you in 2nd. It cannot match or pass 1st.
    return 2;
  }

  function firstPlaceScore(players, totals, winLow) {
    const sorted = sortPlayers(players, totals, winLow);
    if (!sorted.length) return null;
    return Number(totals[sorted[0]]) || 0;
  }

  function staysBehindFirst(player, nextScore, players, totals, winLow) {
    const first = firstPlaceScore(players, totals, winLow);
    if (!Number.isFinite(first)) return false;
    return winLow ? nextScore > first : nextScore < first;
  }

  function maxLegalHelpfulMagnitude(player, players, totals, winLow, increment, allowedRank) {
    const current = Number(totals[player]) || 0;
    const sign = helpfulSign(winLow);
    let best = 0;
    for (let magnitude = increment; magnitude <= 800; magnitude += increment) {
      const nextScore = current + (sign * magnitude);
      const rank = rankWithScore(player, nextScore, players, totals, winLow);
      if (rank >= allowedRank && rank > 1 && staysBehindFirst(player, nextScore, players, totals, winLow)) {
        best = magnitude;
      } else {
        break;
      }
    }
    return best;
  }

  function percentMagnitude(maxHelpful, percent, increment) {
    const raw = floorToIncrement(maxHelpful * percent, increment);
    if (maxHelpful < increment) return 0;
    return Math.max(increment, raw);
  }

  function uniquePositive(values) {
    return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))];
  }

  function makeSlice(adjustment, kind, color, weight) {
    return {
      label: formatWheelLabel(adjustment, kind),
      color,
      adjustment,
      weight: Number.isFinite(weight) ? weight : 1,
      kind
    };
  }

  function pickWeightedSlice(slices, random) {
    const list = slices || [];
    const total = list.reduce((sum, slice) => sum + (Number(slice.weight) || 0), 0);
    if (!list.length || total <= 0) return null;
    const draw = typeof random === 'function' ? Number(random()) : Math.random();
    let roll = (Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999999) : 0) * total;
    for (const slice of list) {
      roll -= Number(slice.weight) || 0;
      if (roll < 0) return slice;
    }
    return list[list.length - 1];
  }

  function packGapAfter(nextScore, leaderScore, winLow) {
    return winLow ? nextScore - leaderScore : leaderScore - nextScore;
  }

  function buildLockedOutcome(offer, slice, totals, players) {
    if (!offer || !slice) return null;
    const player = offer.player;
    const winLow = !!offer.winLow;
    const adj = capLifePreserverAdjustment(slice.adjustment, offer);
    const beforeTotal = Number(totals?.[player]) || 0;
    const afterTotal = beforeTotal + adj;
    const beforeRank = Number(offer.rank) || 0;
    const afterRank = rankWithScore(player, afterTotal, players || [], totals || {}, winLow);
    const leaderScore = Number.isFinite(offer.leaderScore)
      ? offer.leaderScore
      : (winLow
        ? Math.min(...(players || []).map((name) => Number(totals?.[name]) || 0))
        : Math.max(...(players || []).map((name) => Number(totals?.[name]) || 0)));
    const leaderGapBefore = Number(offer.leaderGap) || 0;
    const leaderGapAfter = packGapAfter(afterTotal, leaderScore, winLow);
    return {
      player,
      adjustment: adj,
      label: formatWheelLabel(adj, wheelSliceKind({ ...slice, adjustment: adj })),
      beforeTotal,
      afterTotal,
      beforeRank,
      afterRank,
      leaderGapBefore,
      leaderGapAfter,
      winLow
    };
  }

  function describeLifePreserverResult(detail) {
    if (!detail) return { headline: '', totals: '', standing: '' };
    const adj = Number(detail.adjustment) || 0;
    const winLow = !!detail.winLow;
    const helpful = adj * helpfulSign(winLow) > 0;
    const abs = Math.abs(adj);
    let headline = 'No change';
    if (adj && helpful) headline = winLow ? `${abs} points off` : `+${abs} points`;
    else if (adj) headline = `${abs} point setback`;
    const totals = `${detail.beforeTotal} → ${detail.afterTotal}`;
    const beforeRank = Number(detail.beforeRank) || 0;
    const afterRank = Number(detail.afterRank) || 0;
    let standing = '';
    if (beforeRank && afterRank && beforeRank === afterRank) {
      const gap = Number(detail.leaderGapAfter);
      standing = Number.isFinite(gap)
        ? `Stays ${ordinal(beforeRank)} · gap to leader ${gap >= (Number(detail.leaderGapBefore) || gap) ? 'is' : 'reduced to'} ${gap}`
        : `Stays ${ordinal(beforeRank)}`;
    } else if (beforeRank && afterRank) {
      standing = `${ordinal(beforeRank)} → ${ordinal(afterRank)} place`;
    }
    return { headline, totals, standing };
  }

  function rotationDegreesForSlice(slice) {
    if (!slice || !Number.isFinite(slice._start) || !Number.isFinite(slice._end)) return 0;
    const mid = (slice._start + slice._end) / 2;
    return ((mid + Math.PI / 2) * 180) / Math.PI;
  }

  function rewardStretch(options) {
    const opts = options || {};
    const remaining = Number(opts.remainingRounds);
    if (remaining === 1) return 0;
    const unit = Math.max(Number(opts.oneStrongRound) || 0, Number(opts.increment) || 1);
    const gap = Math.max(0, Number(opts.leaderGap) || 0);
    let stretch = clamp(gap / Math.max(unit * 4, 1) - 1, 0, 0.25);
    if (remaining > 1 && remaining <= 3) stretch = Math.min(0.25, stretch + 0.08);
    return stretch;
  }

  function bandMagnitudes(band, increment, maxHelpful, maxSetback, stretch) {
    const step = Math.max(1, increment);
    if (band === 'small') {
      return uniquePositive([step, step * 2]).filter((value) => value <= maxHelpful);
    }
    if (band === 'medium') {
      const values = [step * 6, step * 8].map((value) => (
        floorToIncrement(value * (1 + stretch * 0.4), step)
      ));
      return uniquePositive(values).filter((value) => value > step * 2 && value < maxHelpful);
    }
    if (band === 'big') {
      const base = floorToIncrement(Math.max(step * 12, maxHelpful * 0.8), step);
      return uniquePositive([base, maxHelpful]).filter((value) => value > step * 2 && value <= maxHelpful);
    }
    if (band === 'setback') {
      return uniquePositive([step, Math.min(maxSetback, step * 2)]).filter((value) => value <= maxSetback);
    }
    return [0];
  }

  function slicesForBand(values, weight, kind, sign, colorFn) {
    if (!values.length || weight <= 0) return [];
    const each = weight / values.length;
    return values.map((magnitude, index) => {
      const adjustment = kind === 'zero' ? 0 : (kind === 'bad' ? -sign * magnitude : sign * magnitude);
      return makeSlice(adjustment, kind, colorFn(index), each);
    });
  }

  function buildSlices(maxHelpful, maxSetback, winLow, increment, options) {
    const sign = helpfulSign(winLow);
    const maxH = Math.max(increment, floorToIncrement(maxHelpful, increment));
    const maxB = Math.max(increment, floorToIncrement(maxSetback, increment));
    const stretch = rewardStretch({ ...options, increment });
    const small = bandMagnitudes('small', increment, maxH, maxB, stretch);
    const medium = bandMagnitudes('medium', increment, maxH, maxB, stretch);
    const big = bandMagnitudes('big', increment, maxH, maxB, stretch);
    const setbacks = bandMagnitudes('setback', increment, maxH, maxB, stretch);

    let smallP = OUTCOME_TABLE.smallHelp;
    let mediumP = OUTCOME_TABLE.mediumHelp;
    let bigP = OUTCOME_TABLE.bigHelp;
    if (!medium.length) {
      smallP += mediumP;
      mediumP = 0;
    }
    if (!big.length) {
      if (medium.length) mediumP += bigP;
      else smallP += bigP;
      bigP = 0;
    }

    const raw = [
      ...slicesForBand(small, smallP, 'good', sign, () => COLORS.goodSoft),
      ...slicesForBand(medium, mediumP, 'good', sign, () => COLORS.goodMid),
      ...slicesForBand(big, bigP, 'good', sign, (index) => (index ? COLORS.goodStrong : COLORS.goodMid)),
      ...slicesForBand([0], OUTCOME_TABLE.noChange, 'zero', sign, () => COLORS.zero),
      ...slicesForBand(setbacks, OUTCOME_TABLE.smallSetback, 'bad', sign, (index) => (index ? COLORS.badStrong : COLORS.badSoft))
    ];
    const merged = assignOutcomeColors(mergeEqualOutcomes(raw));
    return arrangeRouletteSegments(merged);
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

  function isHeldForCurrentRound(game, player) {
    if (!game || !player) return false;
    const round = Number(game.currentRound) || 0;
    if ((Number(game.lifePreserverHeldRound) || 0) !== round) return false;
    return Array.isArray(game.lifePreserverHeld) && game.lifePreserverHeld.includes(player);
  }

  // Once a Life Preserver unlocks, it stays for the current scoring period even if
  // someone else takes theirs first. A new submitted scoring round rebuilds the list.
  // Unused holds can drop or come back on later rounds until that player actually spins.
  function syncLifePreserverHolds(game, players, options) {
    const opts = options || {};
    if (!game) return [];
    const round = Number(game.currentRound) || 0;
    if (!SUPPORTED_GAMES.includes(game.name)) {
      game.lifePreserverHeld = [];
      game.lifePreserverHeldRound = round;
      return [];
    }
    const used = new Set(game.hailMaryUsed || []);
    const retired = new Set(game.retired || []);
    const sameRound = !opts.reset
      && (Number(game.lifePreserverHeldRound) || 0) === round
      && Array.isArray(game.lifePreserverHeld);
    const kept = sameRound
      ? game.lifePreserverHeld.filter(name => name && !used.has(name) && !retired.has(name))
      : [];
    const held = new Set(kept);
    (players || []).forEach(player => {
      if (!player || used.has(player) || retired.has(player)) return;
      const offer = getLifePreserverOffer(game, player, players, {
        gameOver: opts.gameOver,
        honorHold: false
      });
      if (offer.eligible) held.add(player);
    });
    game.lifePreserverHeld = [...held];
    game.lifePreserverHeldRound = round;
    return game.lifePreserverHeld;
  }

  function markLifePreserverUsed(game, player) {
    if (!game || !player) return;
    if (!Array.isArray(game.hailMaryUsed)) game.hailMaryUsed = [];
    if (!game.hailMaryUsed.includes(player)) game.hailMaryUsed.push(player);
    if (Array.isArray(game.lifePreserverHeld)) {
      game.lifePreserverHeld = game.lifePreserverHeld.filter(name => name !== player);
    }
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
    if (rank === 1) {
      return ineligible('leading', {
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
      upcomingOpportunity = catchUpUnitForRound(game, players, upcomingRound, factor);
      totalRemainingOpportunity = remaining.reduce((sum, roundNumber) => (
        sum + catchUpUnitForRound(game, players, roundNumber, factor)
      ), 0);
      comebackUnit = upcomingOpportunity;
    }

    const honorHold = opts.honorHold !== false;
    const held = honorHold && isHeldForCurrentRound(game, player);
    const recoveryLoad = totalRemainingOpportunity > 0 ? leaderGap / totalRemainingOpportunity : Infinity;
    const recoveryThreshold = Number.isFinite(cfg.recoveryLoad) ? cfg.recoveryLoad : RECOVERY_LOAD_THRESHOLD;
    const loadOk = game.name === 'Flip 7 Vengeance'
      ? leaderGap / comebackUnit >= FLIP7_STRONG_ROUNDS
      : recoveryLoad >= recoveryThreshold;

    if (!held) {
      if (!(leaderGap >= upcomingOpportunity)) {
        return ineligible('leader-gap', {
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
    }

    const allowedRank = bestAllowedRankFor(players.length, rank);
    const rankCap = maxLegalHelpfulMagnitude(player, players, totals, cfg.winLow, cfg.increment, allowedRank);
    const payoutRound = game.name === 'Flip 7 Vengeance'
      ? upcomingOpportunity
      : unitForRound(game, players, upcomingRound, factor);
    const oneStrongRound = Math.max(
      cfg.increment,
      floorToIncrement(clamp(payoutRound, cfg.rescueMin, cfg.rescueMax), cfg.increment)
    );
    const ordinaryRecoveryLimit = game.name === 'Flip 7 Vengeance'
      ? comebackUnit * FLIP7_STRONG_ROUNDS
      : Math.max(upcomingOpportunity, recoveryThreshold * totalRemainingOpportunity);
    const twoMadeBids = 2 * EIGHT18_BID_BONUS;
    const rescueNeeded = game.name === '818'
      ? twoMadeBids
      : Math.max(0, leaderGap - ordinaryRecoveryLimit);
    const maxSafeAdjustment = floorToIncrement(
      Math.min(rankCap, cfg.rescueMax, Math.max(oneStrongRound, rescueNeeded)),
      cfg.increment
    );
    if (maxSafeAdjustment < cfg.increment && !held) {
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
    const wheelHelp = Math.max(maxSafeAdjustment, held ? cfg.increment : 0);
    if (wheelHelp < cfg.increment) {
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
    const remainingRounds = game.name === 'Flip 7 Vengeance' ? null : remaining.length;
    const slices = buildSlices(wheelHelp, maxSetback, cfg.winLow, cfg.increment, {
      recoveryLoad,
      leaderGap,
      remainingRounds,
      oneStrongRound
    });
    const bestPlaceAfter = rankWithScore(
      player,
      playerScore + (helpfulSign(cfg.winLow) * wheelHelp),
      players,
      totals,
      cfg.winLow
    );
    const offer = {
      eligible: true,
      reason: 'ok',
      held: !!held,
      player,
      gameName: game.name,
      playerCount: players.length,
      packPlayer: sorted[packRank - 1],
      leaderPlayer: sorted[0],
      leaderScore,
      playerScore,
      rank,
      bestPlaceAfter,
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
      estimatedRoundsToRecover: comebackUnit ? leaderGap / comebackUnit : null,
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
    EIGHT18_BID_BONUS,
    RECOVERY_LOAD_THRESHOLD,
    FLIP7_STRONG_ROUNDS,
    GAME_CONFIG,
    ruleUnitForRound,
    getMaxRounds,
    getLifePreserverOffer,
    isHeldForCurrentRound,
    syncLifePreserverHolds,
    markLifePreserverUsed,
    explainLifePreserverOffer,
    explainLifePreserverRules,
    summarizeLifePreserverTable,
    releaseRemovedLifePreservers,
    capLifePreserverAdjustment,
    rankWithScore,
    bestAllowedRankFor,
    scoringRounds,
    OUTCOME_TABLE,
    COLORS,
    ROULETTE_UNIT,
    WHEEL_OUTER_FRAC,
    WHEEL_INNER_FRAC,
    sliceArcs,
    attachSliceArcs,
    wheelSliceKind,
    outcomeKey,
    segmentCountFor,
    mergeEqualOutcomes,
    summarizeWheelOutcomes,
    pickWeightedSlice,
    buildLockedOutcome,
    describeLifePreserverResult,
    rotationDegreesForSlice,
    landingDegreesForSlice,
    wheelAngleFromDegrees,
    angleInArc,
    pointInSlice,
    labelLayout,
    buildSlices,
    formatWheelLabel,
    formatSignedPoints
  };

  root.BPGLifePreserver = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
