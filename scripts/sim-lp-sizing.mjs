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

function bindingFor(offer, adj) {
  const helpful = (Number(adj) || 0) * (offer.winLow ? -1 : 1);
  if (helpful <= 0) return 'setback-or-zero';
  const mag = Math.abs(adj);
  const gapCap = Math.floor(((Number(offer.leaderGap) || 0) * 0.65) / (offer.scoreIncrement || 1)) * (offer.scoreIncrement || 1);
  if (offer.table === 'proposed' && mag >= gapCap && mag >= (offer.maxSafeAdjustment || 0)) return 'band+leader-or-game-cap';
  if (mag >= (offer.gameSafetyCap || 0) && (offer.gameSafetyCap || 0) <= mag) return 'game-cap';
  if (mag >= (offer.rankCap || 0)) return 'leader-rule';
  return 'band';
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
  const per = adjustments.map((adj) => {
    const next = (Number(offer.playerScore) || 0) + adj;
    return {
      adj,
      rank: rankAfter(game, player, next),
      leap: Math.max(0, (offer.rank || standing.rank) - rankAfter(game, player, next)),
      bind: bindingFor(offer, adj),
      blocked65: offer.table === 'proposed' && adj * (offer.winLow ? -1 : 1) > 0
        && Math.abs(adj) < Math.floor(((Number(offer.leaderGap) || 0) * 0.65) / (offer.scoreIncrement || 1)) * (offer.scoreIncrement || 1)
    };
  });
  return {
    eligible: true,
    standing,
    offer,
    helpOdds: help.length / N,
    avgHelp: avg(help, (row) => Math.abs(row.adj)),
    avgHelpGap: standing.gapThird ? avg(help, (row) => Math.abs(row.adj)) / standing.gapThird : null,
    setbackOdds: bad.length / N,
    avgSetback: avg(bad, (row) => Math.abs(row.adj)),
    largestSetback: Math.max(0, ...bad.map((row) => Math.abs(row.adj))),
    expectedNet: avg(samples, (row) => row.adj * (offer.winLow ? -1 : 1)),
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
    best: offer.maxSafeAdjustment,
    worst: offer.maxSetback,
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
parts.push('- **Proposed:** gap to 1st. 30% really good (45-65% of that gap) / 45% good (20-40%) / 10% no change / 15% small setback. Best is 65% of the gap, then the per-game cap and the never-tie-or-pass-1st rule. Setbacks stay small and are not gap-scaled. No late-game boost. No leapfrog cap in this candidate.');
parts.push('- **Already in the top 3:** 2nd and 3rd still have a gap to 1st, so they use that gap. If that gap is smaller than one game increment, Proposed falls back to one increment of modest help. Resulting rank is whatever the rounded, capped points produce.');
parts.push('- **Ties:** the current leader score is the tied 1st score. A spin still cannot match it. Tied non-leaders share a place the same way the scorecard does (two 4ths, then 6th).');
parts.push('- **Leapfrog:** this candidate has no non-leader leapfrog cap. A rescue may pass as many non-leaders as the points allow. It still cannot tie or pass 1st. If a game cap or the leader rule stops a 65% rescue from reaching 3rd, that row is flagged.');
parts.push('- **Rounding:** each game increment (Five Crowns, Wizard, and Flip 7 in 5s; 818 in 1s).');
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
  parts.push(rowLine('Average help as % of gap to 3rd', cur, prop, (x) => x.eligible && x.avgHelpGap != null ? pct(x.avgHelpGap) : '—'));
  parts.push(rowLine('Odds of a setback', cur, prop, (x) => x.eligible ? pct(x.setbackOdds) : '—'));
  parts.push(rowLine('Average setback (when it hurts)', cur, prop, (x) => x.eligible ? num(x.avgSetback) : '—'));
  parts.push(rowLine('Expected net (incl. zeros and setbacks)', cur, prop, (x) => x.eligible ? num(x.expectedNet) : '—'));
  parts.push(rowLine('Best / typical / worst rank', cur, prop, (x) => x.eligible ? `${x.bestRank} / ${x.typicalRank} / ${x.worstRank}` : '—'));
  parts.push(rowLine('Best / typical / worst gap to 1st', cur, prop, (x) => x.eligible ? `${num(x.bestGap)} / ${num(x.typicalGap)} / ${num(x.worstGap)}` : '—'));
  parts.push(rowLine('Immediate top-3 chance', cur, prop, (x) => x.eligible ? pct(x.podiumNow) : '—'));
  parts.push(rowLine('Top 3 by the end (model)', cur, prop, (x) => x.eligible ? pct(x.endTop3) : '—'));
  parts.push(rowLine('Leapfrog rate (passes a non-leader)', cur, prop, (x) => x.eligible ? pct(x.leapRate) : '—'));
  parts.push('');
  if (prop.eligible) {
    parts.push('Proposed pockets after caps:');
    parts.push('');
    parts.push('| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |');
    parts.push('| --- | --- | --- | --- | --- |');
    prop.per.forEach((item) => {
      parts.push(`| ${item.adj} | ${item.rank} | ${item.leap} | ${item.bind} | ${item.blocked65 ? 'yes' : 'no'} |`);
    });
    parts.push('');
  }
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
parts.push('## Recommendation');
parts.push('');
parts.push('Proposed gives Duke-style blowouts a real ladder back toward 3rd, while Current often spends 75% of spins on −5/−10. The 818 game cap (20) still binds a 65% rescue when the hole is bigger than that, so 818 will feel less changed than Five Crowns. Try Proposed on the TEMP wheel (`?demo&view=lifepreserver-low&lp=proposed` and `?demo&view=lifepreserver&lp=proposed`) before touching live amounts.');
parts.push('');
parts.push('## Knobs for Matt');
parts.push('');
parts.push('- Best as 60% vs 65% of the gap to 1st.');
parts.push('- 818 / Flip 7 / Wizard per-game caps (20 / 40 / 60 / Five Crowns 75).');
parts.push('- Whether a rescue may pass 3rd or only reach it.');
parts.push('- Keep or drop a non-leader leapfrog cap. This candidate has none; flagged rows show where a 65% hit is already stopped by the game cap or the leader rule.');
parts.push('');
parts.push('Played hands stay the main story if the typical Proposed help is a fraction of a real hand and 1st stays out of reach. Five Crowns late is the risk case: a −35 on a 51-point hole is more than one clean hand, so it can make the last few hands feel smaller.');
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
