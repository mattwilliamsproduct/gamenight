import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {validateScenario} from '../public/qa/fixture-rules.mjs';
import {DEMO_CAST, QA_PORCH_CAST, buildDemoBook, isCanastaNight, remapDemoBook} from '../public/demo/try-demo-cast.mjs';

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
  assert.match(html, /id="backup-clear-warning"/);
  assert.match(demo, /#backup-clear-warning/);
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
  assert.match(demo, /buildDemoBook/);
});

test('demo forks the QA seed to a fictional cast with no character avatars', () => {
  assert.match(demo, /try-demo-cast\.mjs/);
  assert.match(demo, /buildDemoBook/);
  assert.deepEqual([...QA_PORCH_CAST], [
    'Megan', 'Matt', 'Cat', 'Mike', 'Vikki', 'Duke',
    'Brick', 'Linda', 'Michelle', 'Alexis', 'Ethan', 'Diana'
  ]);
  assert.deepEqual([...DEMO_CAST], [
    'Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix',
    'June', 'Marco', 'Iris', 'Quinn', 'Vera', 'Hugo'
  ]);
  const qa = QA_SCENARIOS['demo-seed'].data;
  const book = remapDemoBook(JSON.parse(JSON.stringify(qa)));
  const blob = JSON.stringify(book);
  assert.ok(book.players.includes('Nora'));
  assert.ok(book.players.includes('Owen'));
  assert.ok(book.players.includes('Priya'));
  assert.ok(book.currentGame.originalRoster.includes('Marco'));
  QA_PORCH_CAST.forEach((name) => {
    assert.equal(blob.includes(name), false, `demo book still has ${name}`);
  });
  DEMO_CAST.forEach((name) => {
    assert.equal(blob.includes(name), true, `demo book missing ${name}`);
  });
  assert.doesNotMatch(blob, /avatars\//);
  assert.doesNotMatch(blob, /\.png/);
  assert.equal(
    Object.values(book.playerProfiles).some((profile) => profile && profile.avatar),
    false
  );
  assert.equal(book.currentGame.originalRoster[1], 'Owen');
  assert.equal(book.currentGame.dealerOffset, 1);
  assert.ok(qa.players.includes('Megan'));
  assert.ok(qa.playerProfiles.Megan.avatar);
  assert.equal((qa.history || []).some(isCanastaNight), false);
});

test('demo book adds a remapped Canasta night without changing QA fixtures', () => {
  assert.match(demo, /buildDemoBook/);
  const qa = QA_SCENARIOS['demo-seed'].data;
  const records = QA_SCENARIOS['records-book'].data;
  const book = buildDemoBook(QA_SCENARIOS);
  const canasta = (book.history || []).find(isCanastaNight);
  const qaCanasta = (records.history || []).find(isCanastaNight);
  assert.ok(canasta, 'demo book missing Canasta night');
  assert.ok(qaCanasta, 'QA records-book missing Canasta night');
  assert.equal(canasta.game, 'Hand and Foot');
  assert.deepEqual(canasta.originalRoster, ['Nora', 'Owen', 'Priya', 'Theo']);
  assert.equal((qa.history || []).some(isCanastaNight), false);
  assert.ok(qaCanasta.originalRoster.includes('Megan'));
  const blob = JSON.stringify(canasta);
  QA_PORCH_CAST.forEach((name) => {
    assert.equal(blob.includes(name), false, `Canasta night still has ${name}`);
  });
  assert.doesNotMatch(blob, /avatars\/|\.png/);
});
