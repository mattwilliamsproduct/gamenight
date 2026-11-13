import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {buildDemoBook} from '../public/demo/try-demo-cast.mjs';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');
const Records = require('../public/assets/records-logic.js');

function printReport(label, history) {
  const report = Records.historyReviewReport(history, Scorebook);
  console.log(`\n# ${label}`);
  report.lines.forEach((line) => console.log(line));
  if (!report.lines.length) console.log('No win or record counts would change.');
  console.log(`rows unchanged: ${report.unchanged}`);
  return report;
}

const arg = process.argv[2];
if (arg === '--demo') {
  printReport('demo book', buildDemoBook(QA_SCENARIOS).history);
} else if (arg) {
  const book = JSON.parse(readFileSync(arg, 'utf8'));
  printReport(arg, book.history || book);
} else {
  const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/main-format-backup.json', import.meta.url), 'utf8'));
  printReport('main-format fixture', fixture.history);
  printReport('demo book', buildDemoBook(QA_SCENARIOS).history);
}
