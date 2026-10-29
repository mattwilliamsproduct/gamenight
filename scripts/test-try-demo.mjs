import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {validateScenario} from '../public/qa/fixture-rules.mjs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const demo = readFileSync(new URL('../public/demo/try-demo.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../src/service-worker.js', import.meta.url), 'utf8');

function storageKey(active, key) {
  if (!active) return key;
  if (typeof key === 'string' && key.startsWith('gn_')) return `bpg_demo_${key.slice(3)}`;
  return key;
}

test('try-demo remaps gn_ keys only while the sample is on', () => {
  assert.equal(storageKey(false, 'gn_history'), 'gn_history');
  assert.equal(storageKey(true, 'gn_history'), 'bpg_demo_history');
  assert.equal(storageKey(true, 'gn_current'), 'bpg_demo_current');
  assert.equal(storageKey(true, 'bpg_demo_history'), 'bpg_demo_history');
});

test('only ?demo=try is the in-app sample', () => {
  assert.match(demo, /\.get\('demo'\) === 'try'/);
  assert.match(html, /demoParam!=='try'/);
  assert.match(html, /dataset\.gnDemoReady='ignored'/);
  assert.doesNotMatch(html, /classList\.add\('gn-demo-pending'\)/);
});

test('the page loads try-demo and the worker precaches it', () => {
  assert.match(html, /src="\.\/demo\/try-demo\.js"/);
  assert.match(html, /function gnKey\(key\)/);
  assert.match(worker, /'\.\/demo\/try-demo\.js'/);
  assert.match(demo, /bpg_demo_/);
  assert.match(demo, /demo-sync-blocked/);
  assert.match(demo, /Backup, restore, and sync are off in this demo/);
  assert.match(demo, /See a sample game night\. Your data stays separate\./);
  assert.match(demo, /Sample data · separate from your games/);
  assert.match(html, /BPGTryDemo\.active\(\)/);
  assert.doesNotMatch(demo, /gamenight:backup:v1/);
  assert.doesNotMatch(demo, /localStorage\.setItem\(\s*['"]gn_/);
});

test('try-demo seed is the fictional QA demo-seed book', () => {
  assert.ok(QA_SCENARIOS['demo-seed'], 'demo-seed scenario missing');
  const issues = validateScenario('demo-seed', QA_SCENARIOS['demo-seed']);
  assert.deepEqual(issues, [], issues.join('\n'));
  const data = QA_SCENARIOS['demo-seed'].data;
  assert.ok(data.players.includes('Megan'));
  assert.ok(data.players.includes('Matt'));
  assert.ok((data.history || []).length > 5);
  assert.equal(data.currentGame?.name, 'Five Crowns');
  assert.match(demo, /QA_SCENARIOS\['demo-seed'\]/);
});
