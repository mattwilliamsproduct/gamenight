import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

test('localhost does not call /api/sync, and a stubbed pull and push use the production request', async ({page}) => {
  const hits = [];
  page.on('request', (request) => {
    if (/\/api\//.test(request.url())) hits.push(request.url());
  });
  await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof pullPorchCloud === 'function' && typeof BPGBackup !== 'undefined');
  expect(hits, 'boot must not call the API').toEqual([]);
  expect(await page.evaluate(() => canPorchCloud())).toBe(false);

  const result = await page.evaluate(async () => {
    const calls = [];
    const orig = window.fetch;
    window.fetch = (url, opts) => {
      calls.push({
        url: String(url),
        method: opts && opts.method,
        key: opts && opts.headers && opts.headers['x-porch-key'],
        body: opts && opts.body ? JSON.parse(opts.body) : null
      });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ok: true, backup: null})
      });
    };
    const real = canPorchCloud;
    canPorchCloud = () => true;
    setPorchKey('stub-porch');
    const pulled = await pullPorchCloud();
    await pushPorchCloud();
    canPorchCloud = real;
    window.fetch = orig;
    setPorchKey('');
    return {calls, pulled, host: location.hostname, key: localStorage.getItem('gn_porch_key')};
  });

  expect(hits, 'the stub replaced fetch, so the browser made no API request').toEqual([]);
  expect(result.host).not.toBe('cardknight.vercel.app');
  expect(result.calls.map((call) => call.url)).toEqual(['/api/sync', '/api/sync']);
  expect(result.calls[0].method).toBe('GET');
  expect(result.calls[1].method).toBe('PUT');
  expect(result.calls[0].key).toBe('stub-porch');
  expect(result.calls[1].key).toBe('stub-porch');
  expect(Array.isArray(result.calls[1].body.history)).toBe(true);
  expect(Array.isArray(result.calls[1].body.allPlayers)).toBe(true);
  expect(result.pulled && result.pulled.empty).toBe(true);
  expect(result.key).toBeNull();
});
