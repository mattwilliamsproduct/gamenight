import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {buildDemoBook} from '../public/demo/try-demo-cast.mjs';

const require = createRequire(import.meta.url);
const Scorebook = require('../public/assets/scorebook.js');
const Records = require('../public/assets/records-logic.js');

function sameCounts(lines) {
  lines.filter((line) => line.includes(': wins ')).forEach((line) => {
    const match = line.match(/wins (\d+) -> (\d+), games (\d+) -> (\d+)/);
    assert.ok(match, line);
    assert.equal(match[1], match[2], line);
    assert.equal(match[3], match[4], line);
  });
}

test('history review is read-only and reports fixture and demo changes', () => {
  const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/main-format-backup.json', import.meta.url), 'utf8'));
  const fixtureReport = Records.historyReviewReport(fixture.history, Scorebook);
  assert.equal(fixtureReport.unchanged, true);
  assert.deepEqual(fixtureReport.counts, {
    '818': {complete: 0, partial: 1, uncertain: 0},
    'Five Crowns': {complete: 0, partial: 1, uncertain: 0},
    Wizard: {complete: 0, partial: 1, uncertain: 0}
  });
  assert.equal(fixtureReport.before.winSum, 0);
  assert.equal(fixtureReport.after.winSum, 0);
  assert.ok(fixtureReport.lines.includes('counted wins 0 -> 0'));
  assert.ok(fixtureReport.lines.includes('Alex Rivera: wins 0 -> 0, games 0 -> 0'));
  assert.ok(fixtureReport.lines.includes('10/31/2026 · 818 · uncertain -> ended_early · counted no -> no'));
  assert.ok(fixtureReport.lines.includes('11/1/2026 · Five Crowns · uncertain -> ended_early · counted no -> no'));
  assert.ok(fixtureReport.lines.includes('11/2/2026 · Wizard · uncertain -> ended_early · counted no -> no'));
  assert.equal(fixtureReport.lines.some((line) => line.includes('best final')), false);
  sameCounts(fixtureReport.lines);
  assert.equal(Scorebook.legacyReviewAppliedNow(), true);

  const demo = buildDemoBook(QA_SCENARIOS).history;
  const before = JSON.stringify(demo);
  const demoReport = Records.historyReviewReport(demo, Scorebook);
  assert.equal(demoReport.unchanged, true);
  assert.equal(JSON.stringify(demo), before);
  assert.deepEqual(demoReport.counts, {
    '818': {complete: 1, partial: 4, uncertain: 0},
    'Beat the Heat': {complete: 1, partial: 0, uncertain: 2},
    'Five Crowns': {complete: 1, partial: 5, uncertain: 0},
    'Flip 7 Vengeance': {complete: 0, partial: 0, uncertain: 4},
    'Hand and Foot': {complete: 0, partial: 0, uncertain: 1},
    Rook: {complete: 0, partial: 0, uncertain: 1},
    Wizard: {complete: 2, partial: 3, uncertain: 0}
  });
  assert.equal(demoReport.before.winSum, 5);
  assert.equal(demoReport.after.winSum, 5);
  assert.ok(demoReport.lines.includes('Nora: wins 2 -> 2, games 4 -> 4'));
  assert.ok(demoReport.lines.includes('June: wins 1 -> 1, games 1 -> 1'));
  assert.ok(demoReport.lines.includes('Owen: wins 1 -> 1, games 4 -> 4'));
  assert.ok(demoReport.lines.includes('Priya: wins 1 -> 1, games 4 -> 4'));
  assert.equal(demoReport.lines.some((line) => line.includes('best final')), false);
  sameCounts(demoReport.lines);
  assert.equal(Scorebook.legacyReviewAppliedNow(), true);
});
