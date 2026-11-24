import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const handler = require('../api/sync.js');

const KEYS = ['VERCEL_ENV', 'GN_SYNC_PASSWORD', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
const realFetch = globalThis.fetch;
let fetchCalls = 0;
let nextRedisResult = null;
globalThis.fetch = async () => { fetchCalls++; return { ok: true, json: async () => ({ result: nextRedisResult }) }; };

function mockRes() {
  return { code: 0, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; } };
}
const req = (method = 'GET') => ({ method, headers: { 'x-porch-key': 'fictional-key' }, body: { history: [] } });

process.env.GN_SYNC_PASSWORD = 'fictional-key';
process.env.KV_REST_API_URL = 'https://redis.invalid';
process.env.KV_REST_API_TOKEN = 'fictional-token';
try {
  for (const env of ['preview', 'development', undefined]) {
    for (const method of ['GET', 'POST', 'PUT']) {
      if (env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = env;
      const res = mockRes();
      await handler(req(method), res);
      assert.equal(res.code, 503, `${env} ${method} must be refused`);
      assert.equal(res.body.error, 'not-production');
    }
  }
  assert.equal(fetchCalls, 0, 'no Redis call outside production');

  process.env.VERCEL_ENV = 'production';
  nextRedisResult = null;
  for (const method of ['GET', 'POST']) {
    const res = mockRes();
    await handler(req(method), res);
    assert.equal(res.code, 200, `production ${method} reaches the store`);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.backup, null, `absent Redis key returns backup: null for ${method}`);
  }
  assert.equal(fetchCalls, 2);

  // Corrupt or non-backup stored Redis values must return 500, never backup: null
  for (const corrupt of ['{truncated-json', 'not-json', '[]', '{}', '42']) {
    nextRedisResult = corrupt;
    const res = mockRes();
    await handler(req('POST'), res);
    assert.equal(res.code, 500, `corrupt Redis value ${corrupt} must return 500`);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error, 'corrupt-backup');
  }

  // Valid stored JSON string parses cleanly
  nextRedisResult = JSON.stringify({ history: [{ id: 1, game: 'Wizard', totals: { Matt: 90 } }], allPlayers: ['Matt'] });
  const validRes = mockRes();
  await handler(req('POST'), validRes);
  assert.equal(validRes.code, 200);
  assert.equal(validRes.body.backup.allPlayers[0], 'Matt');

  console.log('sync prod guard: non-production calls refused, production GET/POST allowed, corrupt JSON returns 500');
} finally {
  globalThis.fetch = realFetch;
  for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
}
