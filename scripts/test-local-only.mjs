import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const slice2 = readFileSync(new URL('../public/assets/slice2.js', import.meta.url), 'utf8');
const records = readFileSync(new URL('../public/assets/records-logic.js', import.meta.url), 'utf8');
const sync = readFileSync(new URL('../api/sync.js', import.meta.url), 'utf8');

test('the client never fetches /api/sync and leaves the Redis function in place', () => {
  assert.doesNotMatch(html, /fetch\(\s*['"`]\/api\/sync/);
  assert.match(html, /function canPorchCloud\(\)\{\s*return false;/);
  assert.match(html, /function schedulePorchPush\(\)\{\}/);
  assert.match(html, /function pullPorchCloud\(\)\{/);
  assert.match(html, /function pushPorchCloud\(\)\{/);
  assert.doesNotMatch(html, /await pullPorchCloud\(\)/);
  assert.doesNotMatch(html, /if\(!_porchApplying\) schedulePorchPush/);
  assert.doesNotMatch(html, /id="porch-cloud-key"/);
  assert.match(sync, /gamenight:backup:v1|PORCH|redis|Redis/i);
});

test('Settings and Records keep the local-storage sentence', () => {
  assert.match(html, /Scores and history are saved in this browser on this device\./);
  assert.match(records, /Scores and history are saved in this browser on this device\./);
  assert.match(html, /id="save-indicator">✓ Saved</);
});
