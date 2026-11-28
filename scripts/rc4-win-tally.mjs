import {mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {buildDemoBook} from '../public/demo/try-demo-cast.mjs';

const require = createRequire(import.meta.url);
const Records = require('../public/assets/records-logic.js');
const Scorebook = require('../public/assets/scorebook.js');

const book = buildDemoBook(QA_SCENARIOS);
const history = book.history;
const tally = Records.careerWinTally(history, {scorebook: Scorebook});

function recorded(match) {
  const retired = match.retired || [];
  const totals = match.totals || {};
  return (match.originalRoster || Object.keys(totals)).filter((name) => name && !retired.includes(name) && totals[name] !== undefined);
}

function oldPassport(name) {
  const matches = history.filter((match) => match.totals && match.totals[name] !== undefined && recorded(match).includes(name));
  return {
    wins: matches.filter((match) => (match.winners || []).includes(name)).length,
    games: matches.length
  };
}

function oldTally(name) {
  const matches = history.filter((match) => (
    Scorebook.isCompletedHistoryMatch(match)
    && match.totals
    && Array.isArray(match.rounds)
    && match.rounds.length
    && Records.GAMES.some((game) => game.id === match.game)
  ));
  const sat = matches.filter((match) => {
    const roster = match.originalRoster || Object.keys(match.totals || {});
    return roster.includes(name) && match.totals[name] !== undefined;
  });
  return {
    wins: sat.filter((match) => (match.winners || []).includes(name)).length,
    games: sat.length
  };
}

const SCREEN_PASSPORT = {
  Nora: {wins: 14, games: 25},
  Owen: {wins: 13, games: 25},
  Priya: {wins: 2, games: 25},
  Theo: {wins: 4, games: 24}
};

const names = [...new Set([
  ...Object.keys(tally.players),
  ...Object.keys(SCREEN_PASSPORT),
  ...history.flatMap((match) => Object.keys(match.totals || {}))
])].filter(Boolean).sort((a, b) => {
  const order = ['Nora', 'Owen', 'Priya', 'Theo', 'Felix', 'June', 'Ruby', 'Marco', 'Iris', 'Hugo'];
  return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)) || a.localeCompare(b);
});

const lines = [
  '# RC4 career-win tally',
  '',
  '## The counting rule (plain words)',
  '',
  tally.rule,
  '',
  'Passports, Records, wins, win %, streaks, and games all call `BPGRecords.careerWinTally` / `playerCareerStats` / `eligibleWinners`. There is not a second counter.',
  '',
  `Completed nights that count: ${tally.counted}`,
  `Career wins sum (every eligible winner, ties included): ${tally.winSum}`,
  '',
  '## Demo left-early night',
  '',
  'The remapped demo Rook night (10/20/2026) marks Theo left early. Scores stay Nora 110, Owen 110, Priya 90, Theo 90. Rook is high-score, so the winners stay Nora and Owen. Theo keeps the game and is not a winner. No past demo night had a left-early player who would have won; that case is locked in `scripts/test-records.mjs`.',
  '',
  '## Per-player: old Passport vs old tally vs new both screens',
  '',
  'Old Passport numbers in **bold screen** cells are what e448ccf Passports actually showed (Nora 14/25, Owen 13/25, Priya 2/25, Theo 4/24). Other old Passport cells replay that page’s sit-and-stored-winners walk on every history row, including unfinished nights, and drop left-early sitters. Old tally is the previous completed-only walk that still trusted stored `winners[]` and counted left-early sitters as games. New wins and games are the same number on Passports and Records.',
  '',
  '| Player | Old Passport wins | Old Passport games | Old tally wins | Old tally games | New both screens wins | New both screens games | What was wrong |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |'
];

function why(name, passport, tallyOld, next) {
  const bits = [];
  const screen = SCREEN_PASSPORT[name];
  if (screen) {
    bits.push(`Screen Passport ${screen.wins}/${screen.games} counted unfinished and in-progress nights as games, and credited extra wins on those open tables.`);
  }
  if (passport.games !== next.games) {
    bits.push(`Replayed Passport games ${passport.games} included unfinished nights or dropped the Rook left-early sit.`);
  }
  if (tallyOld.wins !== next.wins) {
    bits.push('Old tally wins trusted stored winners[] without dropping left-early.');
  } else if (!screen && passport.wins === next.wins && tallyOld.games === next.games && passport.games === next.games) {
    bits.push('Both old numbers already matched the completed-night rule for this player.');
  }
  if (passport.wins !== next.wins && !screen) {
    bits.push('Old Passport wins used stored winners[] on a wider match set.');
  }
  if (name === 'Theo') {
    bits.push('Theo left early on Rook: old Passport omitted that game (getRecordedPlayers drops retired); old tally kept the game. New keeps the game and never a win.');
  }
  if (!bits.length) bits.push('Old tally already matched; Passport screen was the wrong number.');
  return bits.join(' ');
}

names.forEach((name) => {
  const passport = oldPassport(name);
  const tallyOld = oldTally(name);
  const next = tally.players[name] || {wins: 0, games: 0};
  if (!passport.games && !tallyOld.games && !next.games) return;
  const shownPassportWins = SCREEN_PASSPORT[name] ? `**${SCREEN_PASSPORT[name].wins}**` : String(passport.wins);
  const shownPassportGames = SCREEN_PASSPORT[name] ? `**${SCREEN_PASSPORT[name].games}**` : String(passport.games);
  lines.push(`| ${name} | ${shownPassportWins} | ${shownPassportGames} | ${tallyOld.wins} | ${tallyOld.games} | ${next.wins} | ${next.games} | ${why(name, passport, tallyOld, next)} |`);
});

lines.push(
  '',
  'Matching totals alone is not a pass. Each player’s Passport wins and games must equal the tally row, and both screens must render those same two numbers.',
  '',
  '| Game | Date | Final scores | Winner(s) | Tied | Assisted | Left early | Counts | Why |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'
);

tally.rows.forEach((row) => {
  const scores = row.totals
    ? Object.entries(row.totals).map(([name, score]) => `${name} ${score}`).join(', ')
    : '-';
  lines.push(`| ${row.game || '-'} | ${row.date || '-'} | ${scores} | ${(row.winners || []).join(', ') || '—'} | ${row.tied ? 'yes' : 'no'} | ${row.assisted ? 'yes' : 'no'} | ${(row.leftEarly || []).join(', ') || '—'} | ${row.counts ? 'yes' : 'no'} | ${row.reason} |`);
});

mkdirSync('artifacts', {recursive: true});
writeFileSync('artifacts/rc4-win-tally.md', `${lines.join('\n')}\n`);
console.log(JSON.stringify({
  counted: tally.counted,
  winSum: tally.winSum,
  players: tally.players,
  leftEarlyNights: tally.rows.filter((row) => (row.leftEarly || []).length).map((row) => ({
    game: row.game,
    date: row.date,
    leftEarly: row.leftEarly,
    winners: row.winners
  }))
}, null, 2));
