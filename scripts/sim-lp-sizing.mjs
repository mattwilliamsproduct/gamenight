import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const LP = require('../public/assets/life-preserver-logic.js');

const N = 12000;
const OUT = 'docs/proposals/life-preserver-help-sizing.md';

function scoringRounds(count, players, spread, lastRoundNumber = count) {
  return Array.from({ length: count }, (_, index) => {
    const round = lastRoundNumber - count + index + 1;
    const scores = Object.fromEntries(players.map((player, playerIndex) => [player, playerIndex === 0 ? spread : 0]));
    return { round, scores };
  });
}

function makeGame({ name, players, totals, roundCount, currentRound, retired = [] }) {
  return {
    name,
    originalRoster: [...players],
    totals: { ...totals },
    rounds: scoringRounds(roundCount, players, 8, (currentRound || roundCount + 1) - 1),
    currentRound: currentRound || roundCount + 1,
    hailMaryUsed: [],
    retired: [...retired]
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function offerOf(game, player, table) {
  return LP.getLifePreserverOffer(game, player, game.originalRoster.filter((name) => !(game.retired || []).includes(name)), { table });
}

function rankAfter(game, player, nextScore) {
  const players = game.originalRoster.filter((name) => !(game.retired || []).includes(name));
  const cfg = LP.GAME_CONFIG[game.name];
  return LP.rankWithScore(player, nextScore, players, { ...game.totals, [player]: nextScore }, cfg.winLow);
}

function podiumGap(game, player) {
  const cfg = LP.GAME_CONFIG[game.name];
  const players = game.originalRoster.filter((name) => !(game.retired || []).includes(name));
  const sorted = [...players].sort((a, b) => (
    cfg.winLow
      ? (game.totals[a] || 0) - (game.totals[b] || 0)
      : (game.totals[b] || 0) - (game.totals[a] || 0)
  ));
  const third = sorted[Math.min(2, sorted.length - 1)];
  const first = sorted[0];
  const second = sorted[Math.min(1, sorted.length - 1)];
  const maxR = LP.getMaxRounds(game, players);
  const done = LP.scoringRounds(game).length;
  const gap = (leader) => (
    cfg.winLow
      ? (game.totals[player] || 0) - (game.totals[leader] || 0)
      : (game.totals[leader] || 0) - (game.totals[player] || 0)
  );
  return {
    first: first,
    second,
    third,
    gapFirst: gap(first),
    gapSecond: gap(second),
    gapThird: gap(third),
    rank: sorted.indexOf(player) + 1,
    roundsLeft: game.name === 'Flip 7 Vengeance' ? 3 : Math.max(0, maxR - done)
  };
}

function floorInc(value, increment) {
  const step = Math.max(1, Number(increment) || 1);
  if (!Number.isFinite(value)) return 0;
  return Math.floor(value / step) * step;
}

function maxHelpToAllowedRank(game, player, offer, allowedRank) {
  const increment = offer.scoreIncrement || 1;
  const sign = offer.winLow ? -1 : 1;
  const players = game.originalRoster.filter((name) => !(game.retired || []).includes(name));
  const current = Number(game.totals[player]) || 0;
  const firstScore = Number(offer.leaderScore);
  let best = 0;
  for (let magnitude = increment; magnitude <= 800; magnitude += increment) {
    const next = current + (sign * magnitude);
    const rank = LP.rankWithScore(player, next, players, game.totals, offer.winLow);
    const behind = offer.winLow ? next > firstScore : next < firstScore;
    if (rank >= allowedRank && rank > 1 && behind) best = magnitude;
    else break;
  }
  return best;
}

function limitCaps(game, player, offer) {
  const increment = offer.scoreIncrement || 1;
  const gap = Number(offer.leaderGap) || 0;
  const raw65 = floorInc(gap * 0.65, increment);
  const gameCap = Number(offer.gameSafetyCap) || raw65;
  const leaderCap = Number(offer.rankCap) || raw65;
  const leapfrog3 = maxHelpToAllowedRank(game, player, offer, 3);
  const wheelHelp = Number(offer.maxSafeAdjustment) || 0;
  return { increment, gap, raw65, gameCap, leaderCap, leapfrog3, wheelHelp };
}

function bindingFor(offer, adj, caps) {
  const helpful = (Number(adj) || 0) * (offer.winLow ? -1 : 1);
  if (helpful < 0) return 'setback';
  if (helpful === 0) return 'zero';
  const mag = Math.abs(adj);
  const raw = (frac) => floorInc(caps.gap * frac, caps.increment);
  if (offer.table !== 'proposed') {
    if (mag === caps.gameCap && mag < raw(0.65)) return 'game-cap';
    if (mag === caps.leaderCap && mag < raw(0.65)) return 'leader-rule';
    return 'band';
  }
  if (mag === caps.wheelHelp && caps.wheelHelp < caps.raw65) {
    if (caps.gameCap < caps.raw65 && caps.gameCap <= caps.leaderCap) return 'game-cap';
    if (caps.leaderCap < caps.raw65) return 'leader-rule';
  }
  const fractions = [0.20, 0.30, 0.40, 0.45, 0.55, 0.65];
  const uncappedMatch = fractions.find((frac) => raw(frac) === mag);
  if (uncappedMatch != null) {
    return Math.abs(caps.gap * uncappedMatch - mag) > 0.05 ? 'band · rounding' : 'band';
  }
  if (mag === caps.gameCap && caps.gameCap <= caps.leaderCap && mag < caps.raw65) return 'game-cap';
  if (mag === caps.leaderCap && mag < caps.raw65) return 'leader-rule';
  if (mag === caps.leapfrog3 && caps.leapfrog3 < caps.leaderCap && mag < caps.raw65) return 'leapfrog-cap';
  return 'band';
}

function blocked65Label(offer, adj, caps) {
  const helpful = (Number(adj) || 0) * (offer.winLow ? -1 : 1);
  if (offer.table !== 'proposed' || helpful <= 0) return 'no';
  if (Math.abs(adj) !== caps.wheelHelp) return 'no';
  if (caps.wheelHelp >= caps.raw65) return 'no';
  if (caps.gameCap < caps.raw65 && caps.gameCap <= caps.leaderCap) return 'yes · game-cap';
  if (caps.leaderCap < caps.raw65) return 'yes · leader-rule';
  return 'yes · rounding';
}

function simulateRemaining(game, player, afterScore, random) {
  const cfg = LP.GAME_CONFIG[game.name];
  const players = game.originalRoster.filter((name) => !(game.retired || []).includes(name));
  const totals = { ...game.totals, [player]: afterScore };
  const maxR = LP.getMaxRounds(game, players);
  const done = LP.scoringRounds(game).length;
  const left = game.name === 'Flip 7 Vengeance' ? 3 : Math.max(0, maxR - done);
  for (let i = 0; i < left; i++) {
    players.forEach((name) => {
      let add = 0;
      if (game.name === 'Five Crowns') add = cfg.increment * Math.floor(random() * 11);
      else if (game.name === '818') add = random() < 0.62 ? 10 + Math.floor(random() * 6) : Math.floor(random() * 5);
      else add = cfg.increment * (2 + Math.floor(random() * 6));
      totals[name] = (Number(totals[name]) || 0) + add;
    });
  }
  const sorted = [...players].sort((a, b) => (
    cfg.winLow ? totals[a] - totals[b] : totals[b] - totals[a]
  ));
  return sorted.indexOf(player) + 1;
}

function analyze(game, player, table, seed) {
  const offer = offerOf(game, player, table);
  const standing = podiumGap(game, player);
  if (!offer.eligible) {
    return { eligible: false, reason: offer.reason, standing };
  }
  const random = mulberry32(seed);
  const slices = offer.slices;
  const samples = [];
  for (let i = 0; i < N; i++) {
    const pick = LP.pickWeightedSlice(slices, random);
    const adj = LP.capLifePreserverAdjustment(pick.adjustment, offer);
    const after = (Number(offer.playerScore) || 0) + adj;
    const afterRank = rankAfter(game, player, after);
    const leap = Math.max(0, (offer.rank || standing.rank) - afterRank);
    samples.push({ adj, after, afterRank, leap, kind: pick.kind });
  }
  const help = samples.filter((row) => row.kind === 'good');
  const bad = samples.filter((row) => row.kind === 'bad');
  const avg = (list, fn) => list.reduce((sum, row) => sum + fn(row), 0) / Math.max(list.length, 1);
  const median = (list, fn) => {
    const values = list.map(fn).sort((a, b) => a - b);
    if (!values.length) return null;
    return values[Math.floor(values.length / 2)];
  };
  const endTop3 = samples.filter((row) => simulateRemaining(game, player, row.after, random) <= 3).length / N;
  const gapAfter = (afterScore, afterRank) => {
    const firstScore = game.totals[standing.first] || 0;
    const sign = offer.winLow ? 1 : -1;
    return Math.max(0, sign * (afterScore - firstScore));
  };
  const adjustments = [...new Set(slices.map((slice) => Number(slice.adjustment)))].sort((a, b) => a - b);
  const sliceTotal = slices.reduce((sum, slice) => sum + (Number(slice.weight) || 0), 0) || 1;
  const caps = limitCaps(game, player, offer);
  const per = adjustments.map((adj) => {
    const next = (Number(offer.playerScore) || 0) + adj;
    const weight = slices.filter((slice) => Number(slice.adjustment) === adj)
      .reduce((sum, slice) => sum + (Number(slice.weight) || 0), 0);
    return {
      adj,
      rank: rankAfter(game, player, next),
      leap: Math.max(0, (offer.rank || standing.rank) - rankAfter(game, player, next)),
      bind: bindingFor(offer, adj, caps),
      probability: weight / sliceTotal,
      blocked65: blocked65Label(offer, adj, caps)
    };
  });
  const helpfulSign = offer.winLow ? -1 : 1;
  const actualBest = Math.max(0, ...adjustments.map((adj) => adj * helpfulSign));
  const actualWorst = Math.max(0, ...adjustments.map((adj) => -adj * helpfulSign));
  return {
    eligible: true,
    standing,
    offer,
    caps,
    helpOdds: help.length / N,
    avgHelp: avg(help, (row) => Math.abs(row.adj)),
    avgHelpGap: standing.gapFirst ? avg(help, (row) => Math.abs(row.adj)) / standing.gapFirst : null,
    setbackOdds: bad.length / N,
    avgSetback: avg(bad, (row) => Math.abs(row.adj)),
    largestSetback: actualWorst,
    expectedNet: avg(samples, (row) => row.adj * helpfulSign),
    podiumNow: samples.filter((row) => row.afterRank <= 3).length / N,
    endTop3,
    leapRate: samples.filter((row) => row.leap > 0).length / N,
    typicalRank: median(samples, (row) => row.afterRank),
    typicalGap: median(samples, (row) => gapAfter(row.after, row.afterRank)),
    bestRank: Math.min(...samples.map((row) => row.afterRank)),
    worstRank: Math.max(...samples.map((row) => row.afterRank)),
    bestGap: Math.min(...samples.map((row) => gapAfter(row.after, row.afterRank))),
    worstGap: Math.max(...samples.map((row) => gapAfter(row.after, row.afterRank))),
    avgLeap: avg(samples, (row) => row.leap),
    best: actualBest,
    worst: actualWorst,
    leapfrogWouldBlock65: offer.table === 'proposed' && caps.leapfrog3 < caps.raw65,
    per
  };
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function num(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(1);
}

const PLAYERS_FC = ['Ann', 'Bea', 'Cal', 'Dee', 'Duke'];
const PLAYERS_818 = ['Ann', 'Bea', 'Cal', 'Dee', 'Cat'];
const PLAYERS_WIZ = ['Ann', 'Bea', 'Cal', 'Dee', 'Pat'];
const PLAYERS_FLIP = ['Ann', 'Bea', 'Cal', 'Dee', 'Pat'];

const SCENARIOS = [
  {
    id: 'fc-early',
    title: 'Five Crowns early · Dee cooked after 4 hands',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 18, Bea: 22, Cal: 28, Dee: 70, Duke: 40 },
      roundCount: 4,
      currentRound: 5
    }),
    player: 'Dee'
  },
  {
    id: 'fc-mid',
    title: 'Five Crowns middle · Dee 40 behind 1st',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 40, Bea: 48, Cal: 55, Dee: 80, Duke: 62 },
      roundCount: 7,
      currentRound: 8
    }),
    player: 'Dee'
  },
  {
    id: 'fc-late-duke',
    title: 'Five Crowns late · Duke-style 51 behind 1st, best current is −20',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 25, Bea: 38, Cal: 44, Dee: 52, Duke: 76 },
      roundCount: 9,
      currentRound: 10
    }),
    player: 'Duke'
  },
  {
    id: 'fc-tight',
    title: 'Five Crowns packed table · Dee just barely eligible',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 40, Bea: 46, Cal: 50, Dee: 78, Duke: 55 },
      roundCount: 7,
      currentRound: 8
    }),
    player: 'Dee'
  },
  {
    id: 'fc-leapfrog',
    title: 'Five Crowns packed mid-pack · 65% would reach 2nd (leapfrog-to-3rd test)',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 30, Bea: 62, Cal: 64, Dee: 68, Duke: 70 },
      roundCount: 8,
      currentRound: 9
    }),
    player: 'Dee'
  },
  {
    id: '818-early',
    title: '818 early · Cat far back after 4',
    game: makeGame({
      name: '818',
      players: PLAYERS_818,
      totals: { Ann: 70, Bea: 62, Cal: 50, Dee: 40, Cat: 8 },
      roundCount: 4,
      currentRound: 5
    }),
    player: 'Cat'
  },
  {
    id: '818-mid',
    title: '818 middle · Cat 39 behind (porch-like)',
    game: makeGame({
      name: '818',
      players: PLAYERS_818,
      totals: { Ann: 80, Bea: 70, Cal: 55, Dee: 48, Cat: 41 },
      roundCount: 8,
      currentRound: 9
    }),
    player: 'Cat'
  },
  {
    id: '818-late',
    title: '818 late · Cat last with 3 rounds left',
    game: makeGame({
      name: '818',
      players: PLAYERS_818,
      totals: { Ann: 140, Bea: 128, Cal: 110, Dee: 96, Cat: 60 },
      roundCount: 12,
      currentRound: 13
    }),
    player: 'Cat'
  },
  {
    id: 'fc-tied-leaders',
    title: 'Five Crowns tied leaders · Duke last',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 30, Bea: 30, Cal: 48, Dee: 60, Duke: 82 },
      roundCount: 8,
      currentRound: 9
    }),
    player: 'Duke'
  },
  {
    id: 'fc-retired',
    title: 'Five Crowns with a retired seat · Duke last of the active four',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 28, Bea: 36, Cal: 44, Dee: 40, Duke: 88 },
      roundCount: 8,
      currentRound: 9,
      retired: ['Dee']
    }),
    player: 'Duke'
  },
  {
    id: 'fc-final',
    title: 'Five Crowns final round · Duke still 50 behind',
    game: makeGame({
      name: 'Five Crowns',
      players: PLAYERS_FC,
      totals: { Ann: 40, Bea: 52, Cal: 61, Dee: 74, Duke: 90 },
      roundCount: 10,
      currentRound: 11
    }),
    player: 'Duke'
  },
  {
    id: '818-final',
    title: '818 final round · Cat last on the last 8-trick hand',
    game: makeGame({
      name: '818',
      players: PLAYERS_818,
      totals: { Ann: 168, Bea: 150, Cal: 132, Dee: 118, Cat: 84 },
      roundCount: 14,
      currentRound: 15
    }),
    player: 'Cat'
  },
  {
    id: 'wiz-early',
    title: 'Wizard early · Pat far back after 4',
    game: makeGame({
      name: 'Wizard',
      players: PLAYERS_WIZ,
      totals: { Ann: 220, Bea: 180, Cal: 150, Dee: 120, Pat: 40 },
      roundCount: 4,
      currentRound: 5
    }),
    player: 'Pat'
  },
  {
    id: 'wiz-mid',
    title: 'Wizard middle · Pat 160 behind after 7',
    game: makeGame({
      name: 'Wizard',
      players: PLAYERS_WIZ,
      totals: { Ann: 360, Bea: 310, Cal: 270, Dee: 230, Pat: 200 },
      roundCount: 7,
      currentRound: 8
    }),
    player: 'Pat'
  },
  {
    id: 'wiz-late',
    title: 'Wizard late · Pat 180 behind with 2 rounds left',
    game: makeGame({
      name: 'Wizard',
      players: PLAYERS_WIZ,
      totals: { Ann: 520, Bea: 470, Cal: 420, Dee: 380, Pat: 340 },
      roundCount: 10,
      currentRound: 11
    }),
    player: 'Pat'
  },
  {
    id: 'flip-early',
    title: 'Flip 7 early · Pat cooked after 4 banks',
    game: makeGame({
      name: 'Flip 7 Vengeance',
      players: PLAYERS_FLIP,
      totals: { Ann: 90, Bea: 74, Cal: 58, Dee: 44, Pat: 12 },
      roundCount: 4,
      currentRound: 5
    }),
    player: 'Pat'
  },
  {
    id: 'flip-mid',
    title: 'Flip 7 middle · Pat 80 behind after 8',
    game: makeGame({
      name: 'Flip 7 Vengeance',
      players: PLAYERS_FLIP,
      totals: { Ann: 160, Bea: 138, Cal: 120, Dee: 96, Pat: 80 },
      roundCount: 8,
      currentRound: 9
    }),
    player: 'Pat'
  },
  {
    id: 'flip-late',
    title: 'Flip 7 late · Pat 95 behind after 12',
    game: makeGame({
      name: 'Flip 7 Vengeance',
      players: PLAYERS_FLIP,
      totals: { Ann: 240, Bea: 210, Cal: 188, Dee: 160, Pat: 145 },
      roundCount: 12,
      currentRound: 13
    }),
    player: 'Pat'
  }
];

const rows = SCENARIOS.map((item, index) => ({
  item,
  current: analyze(item.game, item.player, 'current', 1000 + index * 17),
  proposed: analyze(item.game, item.player, 'proposed', 2000 + index * 17)
}));

function rowLine(label, cur, prop, fn) {
  return `| ${label} | ${fn(cur)} | ${fn(prop)} |`;
}

const parts = [];
parts.push('# Life Preserver help sizing');
parts.push('');
parts.push('Comparison only. Live reward math stays 45/30/5/12/8. Wheel visuals stay equal-ish 40 pockets. The Proposed wheel is TEMP behind `?demo&lp=proposed`.');
parts.push('');
parts.push('## Spec');
parts.push('');
parts.push('- **Current:** 45% small / 30% medium / 5% big / 12% no change / 8% setback. Amounts from one strong remaining unit, then clamped.');
parts.push('- **Proposed:** gap to 1st. 30% really good / 45% good / 10% no change / 15% small setback. No separate small-help category.');
parts.push('- **Band pick:** good uses three discrete pockets at 20 / 30 / 40% of the current gap to 1st, equally likely (15% each). Really good uses 45 / 55 / 65%, equally likely (10% each). After equal pockets collapse to the same rounded amount, those shares add.');
parts.push('- **Rounding:** floor to the game increment (Five Crowns, Wizard, and Flip 7 in 5s; 818 in 1s), then apply caps. Flooring can land a hair under the band; the printed pocket is still that rounded amount.');
parts.push('- **Caps, in order:** 65% of the gap to 1st, then the per-game max, then never tie or pass the current leader. One spin per player. Existing eligibility stays. Outcome is locked before the animation. Assisted-match records policy unchanged. No late-game boost.');
parts.push('- **Per-game max help:** Five Crowns 75, Wizard 60, Flip 7 40, 818 20.');
parts.push('- **Setbacks (Proposed):** small, per game, not gap-scaled. Five Crowns 5 and 10, Wizard 5 and 10 (cap 15), Flip 7 5, 818 1 and 2 (cap 4).');
parts.push('- **Leapfrog:** this candidate still lets a rescue reach 2nd and only blocks matching 1st (the leader rule). A stricter "cannot pass 3rd" leapfrog is not applied. The 65% blocked column flags the best-help pocket when a cap cuts the raw 65% value. The leapfrog-to-3rd note says whether that extra cap would cut a 65% rescue, so Matt can keep or relax it.');
parts.push('- **Already in the top 3:** 2nd and 3rd still use the gap to 1st. If that gap is smaller than one increment, Proposed falls back to one increment of modest help.');
parts.push('- **Ties:** the current leader score is the tied 1st score. A spin still cannot match it. Tied non-leaders share a place the same way the scorecard does (two 4ths, then 6th).');
parts.push('- **Layout fixture only:** a 20/55/10/15 split still relayouts the wheel in tests. It is not live and not the TEMP Proposed wheel.');
parts.push('');
parts.push('Remaining-round model for end-of-game top-3: Five Crowns hands score `5 × 0..10`; 818 rounds score a made bid 62% of the time (`+10` plus 0-5 tricks) otherwise 0-4; Wizard and Flip 7 add `5 × (2..7)` per remaining round (Flip 7 models 3 more banks). Same model for Current and Proposed.');
parts.push('');
parts.push('## Tables');
parts.push('');

for (const row of rows) {
  const cur = row.current;
  const prop = row.proposed;
  const stand = cur.standing || prop.standing;
  parts.push(`### ${row.item.title}`);
  parts.push('');
  parts.push(`Player **${row.item.player}**. Gap to 1st ${stand.gapFirst}, gap to 2nd ${stand.gapSecond}, gap to 3rd ${stand.gapThird}, now ${stand.rank}${stand.rank === 1 ? 'st' : stand.rank === 2 ? 'nd' : stand.rank === 3 ? 'rd' : 'th'}. Rounds left: ${stand.roundsLeft}.`);
  parts.push('');
  if (!cur.eligible && !prop.eligible) {
    parts.push(`Not eligible (${cur.reason || prop.reason}).`);
    parts.push('');
    continue;
  }
  parts.push('| Metric | Current | Proposed |');
  parts.push('| --- | --- | --- |');
  parts.push(rowLine('Eligible', cur, prop, (x) => x.eligible ? 'yes' : `no (${x.reason})`));
  parts.push(rowLine('Best help', cur, prop, (x) => x.eligible ? String(x.best) : '—'));
  parts.push(rowLine('Largest setback', cur, prop, (x) => x.eligible ? String(x.worst) : '—'));
  parts.push(rowLine('Odds of help', cur, prop, (x) => x.eligible ? pct(x.helpOdds) : '—'));
  parts.push(rowLine('Average help (when it helps)', cur, prop, (x) => x.eligible ? num(x.avgHelp) : '—'));
  parts.push(rowLine('Average help as % of gap to 1st', cur, prop, (x) => x.eligible && x.avgHelpGap != null ? pct(x.avgHelpGap) : '—'));
  parts.push(rowLine('Odds of a setback', cur, prop, (x) => x.eligible ? pct(x.setbackOdds) : '—'));
  parts.push(rowLine('Average setback (when it hurts)', cur, prop, (x) => x.eligible ? num(x.avgSetback) : '—'));
  parts.push(rowLine('Expected net (incl. zeros and setbacks)', cur, prop, (x) => x.eligible ? num(x.expectedNet) : '—'));
  parts.push(rowLine('Best / typical / worst rank', cur, prop, (x) => x.eligible ? `${x.bestRank} / ${x.typicalRank} / ${x.worstRank}` : '—'));
  parts.push(rowLine('Best / typical / worst gap to 1st', cur, prop, (x) => x.eligible ? `${num(x.bestGap)} / ${num(x.typicalGap)} / ${num(x.worstGap)}` : '—'));
  parts.push(rowLine('Immediate top-3 chance', cur, prop, (x) => x.eligible ? pct(x.podiumNow) : '—'));
  parts.push(rowLine('Top 3 by the end (model)', cur, prop, (x) => x.eligible ? pct(x.endTop3) : '—'));
  parts.push(rowLine('Leapfrog rate (passes a non-leader)', cur, prop, (x) => x.eligible ? pct(x.leapRate) : '—'));
  if (prop.eligible && prop.caps) {
    parts.push(`| Leapfrog-to-3rd would block 65%? | — | ${prop.leapfrogWouldBlock65 ? `yes (3rd-cap ${prop.caps.leapfrog3} vs raw 65% ${prop.caps.raw65})` : `no (3rd-cap ${prop.caps.leapfrog3}, raw 65% ${prop.caps.raw65})`} |`);
  }
  parts.push('');
  [['Current', cur], ['Proposed', prop]].forEach(([label, side]) => {
    if (!side.eligible) return;
    parts.push(`${label} pockets after caps:`);
    parts.push('');
    parts.push('| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |');
    parts.push('| --- | --- | --- | --- | --- | --- |');
    side.per.forEach((item) => {
      parts.push(`| ${item.adj} | ${pct(item.probability)} | ${item.rank} | ${item.leap} | ${item.bind} | ${item.blocked65} |`);
    });
    parts.push('');
  });
}

parts.push('## Several eligible players, one after another');
parts.push('');
parts.push('Duke-style Five Crowns late table. Current vs Proposed, spinning Duke then Dee if still eligible. Order effects use the locked result at the mean help, not a fresh Monte Carlo.');
parts.push('');

const chainGame = SCENARIOS.find((item) => item.id === 'fc-late-duke').game;
['current', 'proposed'].forEach((table) => {
  const game = JSON.parse(JSON.stringify(chainGame));
  parts.push(`**${table}**`);
  ['Duke', 'Dee'].forEach((player) => {
    const offer = offerOf(game, player, table);
    if (!offer.eligible) {
      parts.push(`- ${player}: not eligible (${offer.reason})`);
      return;
    }
    const mean = offer.slices.reduce((sum, slice) => sum + slice.adjustment * slice.weight, 0);
    const adj = LP.capLifePreserverAdjustment(Math.round(mean / (offer.scoreIncrement || 5)) * (offer.scoreIncrement || 5), offer);
    game.totals[player] = (Number(game.totals[player]) || 0) + adj;
    game.hailMaryUsed = [...(game.hailMaryUsed || []), player];
    parts.push(`- ${player}: mean-ish ${adj}, total now ${game.totals[player]}, rank ${rankAfter(game, player, game.totals[player])}`);
  });
  parts.push('');
});

parts.push('## Playtest checklist');
parts.push('');
parts.push('- After the spin, does the trailing player feel they have something worth playing for? Watch whether they lean back in and talk about the next hand, or treat the rest of the night as over.');
parts.push('- Does a setback make an already frustrated player check out? Keep setbacks small. If someone slumps after a −5/−10, that is the signal, not a reason to make setbacks bigger.');
parts.push('- Does the rest of the table still feel their earned positions matter? Watch the 2nd and 3rd players. If a rescue parks someone on their heels too often, the leapfrog / leader rules are too loose.');
parts.push('');
parts.push('## Where a 65% rescue is cut');
parts.push('');
parts.push('| Scenario | Raw 65% | Offered best | What binds | Leapfrog-to-3rd would block? |');
parts.push('| --- | --- | --- | --- | --- |');
rows.forEach((row) => {
  const prop = row.proposed;
  if (!prop.eligible || !prop.caps) return;
  const bestRow = prop.per.find((item) => Math.abs(item.adj) === prop.best && item.blocked65 !== 'no')
    || prop.per.find((item) => Math.abs(item.adj) === prop.best);
  parts.push(`| ${row.item.title} | ${prop.caps.raw65} | ${prop.best} | ${bestRow ? bestRow.bind : '—'} | ${prop.leapfrogWouldBlock65 ? 'yes' : 'no'} |`);
});
parts.push('');
parts.push('## Recommendation');
parts.push('');
parts.push('Proposed gives Duke-style blowouts a real ladder back toward the pack, while Current often spends 80% of spins on a small unit. The 818 and Flip 7 game caps still bind a 65% rescue on the bigger holes, so those games change less than Five Crowns. A stricter leapfrog-to-3rd cap would clip the packed mid-pack case and is not required to keep 1st safe. Try Proposed on the TEMP wheel (`?demo&view=lifepreserver-low&lp=proposed` and `?demo&view=lifepreserver&lp=proposed`) before touching live amounts.');
parts.push('');
parts.push('## Knobs for Matt');
parts.push('');
parts.push('- Best as 60% vs 65% of the gap to 1st.');
parts.push('- 818 / Flip 7 / Wizard / Five Crowns per-game caps (20 / 40 / 60 / 75).');
parts.push('- Whether a rescue may pass 3rd or only reach it.');
parts.push('- Keep or add a non-leader leapfrog cap. This candidate only uses the leader rule (2nd is allowed). Rows marked "Leapfrog-to-3rd would block 65%" are the keep-or-relax cases.');
parts.push('- Proposed setback caps (Five Crowns 10, Wizard 15, Flip 7 5, 818 4).');
parts.push('');
parts.push('Played hands stay the main story if the typical Proposed help is a fraction of a real hand and 1st stays out of reach. Five Crowns late is the risk case: a 30-point lift on a 51-point hole is more than one clean hand, so the last few hands can feel smaller. 818 stays closer to ordinary play because the 20-point cap is about two made bids.');
parts.push('');

mkdirSync('docs/proposals', { recursive: true });
writeFileSync(OUT, parts.join('\n'));
console.log(`Wrote ${OUT}`);
rows.forEach((row) => {
  const cur = row.current;
  const prop = row.proposed;
  console.log(row.item.id, {
    currentBest: cur.eligible ? cur.best : cur.reason,
    proposedBest: prop.eligible ? prop.best : prop.reason,
    currentNet: cur.eligible ? Number(cur.expectedNet.toFixed(2)) : null,
    proposedNet: prop.eligible ? Number(prop.expectedNet.toFixed(2)) : null
  });
});
