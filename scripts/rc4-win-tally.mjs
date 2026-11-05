import {mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {buildDemoBook} from '../public/demo/try-demo-cast.mjs';

const require = createRequire(import.meta.url);
const Records = require('../public/assets/records-logic.js');
const Scorebook = require('../public/assets/scorebook.js');

const book = buildDemoBook(QA_SCENARIOS);
const tally = Records.careerWinTally
  ? Records.careerWinTally(book.history, {scorebook: Scorebook})
  : null;

if (!tally) {
  console.error('careerWinTally not exported yet');
  process.exit(2);
}

const lines = [
  '# RC4 career-win tally',
  '',
  `Rule: ${tally.rule}`,
  '',
  `Completed nights that count: ${tally.counted}`,
  `Career wins sum (every stored winner, ties included): ${tally.winSum}`,
  '',
  '| Game | Date | Final scores | Winner(s) | Tied | Assisted | Counts | Why |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |'
];

tally.rows.forEach((row) => {
  const scores = row.totals
    ? Object.entries(row.totals).map(([name, score]) => `${name} ${score}`).join(', ')
    : '-';
  lines.push(`| ${row.game || '-'} | ${row.date || '-'} | ${scores} | ${(row.winners || []).join(', ') || '—'} | ${row.tied ? 'yes' : 'no'} | ${row.assisted ? 'yes' : 'no'} | ${row.counts ? 'yes' : 'no'} | ${row.reason} |`);
});

mkdirSync('artifacts', {recursive: true});
writeFileSync('artifacts/rc4-win-tally.md', `${lines.join('\n')}\n`);
console.log(JSON.stringify({counted: tally.counted, winSum: tally.winSum, skipped: tally.rows.filter((row) => !row.counts).length}, null, 2));
