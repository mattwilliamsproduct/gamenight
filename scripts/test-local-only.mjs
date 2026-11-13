import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const slice2 = readFileSync(new URL('../public/assets/slice2.js', import.meta.url), 'utf8');
const records = readFileSync(new URL('../public/assets/records-logic.js', import.meta.url), 'utf8');
const sync = readFileSync(new URL('../api/sync.js', import.meta.url), 'utf8');

test('porch cloud keeps the production gate, key, and endpoint', () => {
  assert.match(html, /const GN_PORCH_KEY='gn_porch_key'/);
  assert.match(html, /location\.hostname==='cardknight\.vercel\.app' && !GN_QA_MODE/);
  assert.match(html, /BPGTryDemo\.backupBlocked\(\)/);
  assert.match(html, /fetch\('\/api\/sync'/);
  assert.match(html, /'x-porch-key':key/);
  assert.match(html, /if\(!_porchApplying\) schedulePorchPush\(\)/);
  assert.match(html, /id="porch-cloud-key"/);
  assert.match(html, /if\(canPorchCloud\(\)&&getPorchKey\(\)\)/);
  assert.doesNotMatch(html, /function canPorchCloud\(\)\{\s*return false;/);
  assert.match(sync, /gamenight:backup:v1/);
  assert.doesNotMatch(slice2, /\/api\/sync/);
  assert.doesNotMatch(records, /\/api\/sync/);
});

test('Settings and Records keep the local-storage sentence', () => {
  assert.match(html, /Scores and history are saved in this browser on this device\./);
  assert.match(records, /Scores and history are saved in this browser on this device\./);
  assert.match(html, /Saved on this device/);
});
