import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const handler = require('../api/sync.js');

const KEYS = ['VERCEL_ENV', 'GN_SYNC_PASSWORD', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
const realFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = async () => { fetchCalls++; return { ok: true, json: async () => ({ result: null }) }; };

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
    for (const method of ['GET', 'PUT']) {
      if (env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = env;
      const res = mockRes();
      await handler(req(method), res);
      assert.equal(res.code, 503, `${env} ${method} must be refused`);
      assert.equal(res.body.error, 'not-production');
    }
  }
  assert.equal(fetchCalls, 0, 'no Redis call outside production');

  process.env.VERCEL_ENV = 'production';
  const res = mockRes();
  await handler(req('GET'), res);
  assert.equal(res.code, 200, 'production still reaches the store');
  assert.equal(fetchCalls, 1);
  console.log('sync prod guard: 6 non-production calls refused with no Redis call, production allowed');
} finally {
  globalThis.fetch = realFetch;
  for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
}
