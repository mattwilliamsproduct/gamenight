import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const handler = require('../api/sync.js');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('cloud sync rejects a stale writer and accepts the current revision', async () => {
  const previousEnv = {
    password: process.env.GN_SYNC_PASSWORD,
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN
  };
  const previousFetch = globalThis.fetch;
  let stored = null;

  process.env.GN_SYNC_PASSWORD = 'porch-test';
  process.env.KV_REST_API_URL = 'https://redis.test';
  process.env.KV_REST_API_TOKEN = 'redis-token';
  globalThis.fetch = async (_url, options) => {
    const command = JSON.parse(options.body);
    if (command[0] === 'GET') {
      return {
        ok: true,
        json: async () => ({ result: stored })
      };
    }
    if (command[0] === 'SET') {
      stored = command[2];
      return {
        ok: true,
        json: async () => ({ result: 'OK' })
      };
    }
    throw new Error(`Unexpected Redis command: ${command[0]}`);
  };

  const backup = {
    version: 2,
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [],
    playerProfiles: {}
  };
  const request = revision => ({
    method: 'PUT',
    headers: {
      'x-porch-key': 'porch-test',
      'if-match': revision
    },
    body: backup
  });

  try {
    const first = responseRecorder();
    await handler(request(''), first);
    assert.equal(first.statusCode, 200);
    assert.ok(first.body.savedAt);

    const stale = responseRecorder();
    await handler(request(''), stale);
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.body.error, 'cloud-conflict');

    const current = responseRecorder();
    await handler(request(first.body.savedAt), current);
    assert.equal(current.statusCode, 200);
    assert.ok(current.body.savedAt);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousEnv.password === undefined) delete process.env.GN_SYNC_PASSWORD;
    else process.env.GN_SYNC_PASSWORD = previousEnv.password;
    if (previousEnv.url === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = previousEnv.url;
    if (previousEnv.token === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = previousEnv.token;
  }
});
