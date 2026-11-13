import {crc32} from 'node:zlib';
import {writeFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0, 0);
  return Buffer.concat([len, name, data, crc]);
}

function noisePng(width, height) {
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    for (let x = 0; x < width; x += 1) {
      const i = row + 1 + x * 3;
      raw[i] = (x * 13 + y) & 255;
      raw[i + 1] = (y * 7) & 255;
      raw[i + 2] = (x + y * 3) & 255;
    }
  }
  const blocks = [];
  let offset = 0;
  while (offset < raw.length) {
    const size = Math.min(65535, raw.length - offset);
    const header = Buffer.alloc(5);
    header[0] = offset + size >= raw.length ? 1 : 0;
    header.writeUInt16LE(size, 1);
    header.writeUInt16LE(size ^ 0xffff, 3);
    blocks.push(header, raw.subarray(offset, offset + size));
    offset += size;
  }
  let a = 1;
  let b = 0;
  for (let i = 0; i < raw.length; i += 1) {
    a = (a + raw[i]) % 65521;
    b = (b + a) % 65521;
  }
  const zlib = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, Buffer.alloc(4)]);
  zlib.writeUInt32BE(((b << 16) | a) >>> 0, zlib.length - 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const LARGE_PNG = '/tmp/back-porch-large.png';
const SMALL_PNG = '/tmp/back-porch-small.png';
writeFileSync(LARGE_PNG, noisePng(1400, 1200));
writeFileSync(SMALL_PNG, noisePng(32, 32));

test.use({
  browserName: 'webkit',
  viewport: {width: 1194, height: 834},
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
  serviceWorkers: 'block'
});

async function boot(page, url) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('bpg_try_demo_tip', '1'); } catch (error) {}
  });
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  if (url.includes('demo=try')) {
    await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  }
  await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
  await page.waitForSelector('#home-screen:not(.hidden) #slice2-home', {timeout: 20000});
}

async function putPhoto(page, file) {
  const input = page.locator('#avatar-photo-input');
  await input.setInputFiles(file);
}

async function openPriya(page) {
  await page.evaluate(() => {
    if (typeof showProfiles === 'function') showProfiles();
    if (typeof openProfileDetail === 'function') openProfileDetail('Priya');
    if (typeof openAvatarPicker === 'function') openAvatarPicker();
  });
  await expect(page.locator('#avatar-photo-input')).toBeAttached();
}

test('demo keeps a large photo and a normal PNG on the passport, home, and scoreboard', async ({page}) => {
  await boot(page, '/?demo=try');
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on');
  await openPriya(page);
  const large = (await import('node:fs')).statSync(LARGE_PNG).size;
  expect(large).toBeGreaterThanOrEqual(4 * 1024 * 1024);
  await putPhoto(page, LARGE_PNG);
  const avatar = page.locator('#detail-avatar');
  await expect(avatar).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect.poll(async () => avatar.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  const stored = await page.evaluate(() => {
    const profiles = JSON.parse(localStorage.getItem('bpg_demo_profiles') || '{}');
    const real = localStorage.getItem('gn_profiles') || '';
    return {
      photo: profiles.Priya && profiles.Priya.avatar,
      leaked: real.includes('data:image/jpeg')
    };
  });
  expect(stored.photo.startsWith('data:image/jpeg')).toBe(true);
  expect(stored.photo.length).toBeLessThan(180000);
  expect(stored.leaked).toBe(false);
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-demo-passport-emulated.png'});

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on');
  await page.evaluate(() => { if (typeof openProfileDetail === 'function') openProfileDetail('Priya'); });
  await expect(page.locator('#detail-avatar')).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect.poll(async () => page.locator('#detail-avatar').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-demo-passport-after-reload-emulated.png'});

  await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
  const home = page.locator('#slice2-home img[alt="Priya"]').first();
  await expect(home).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect.poll(async () => home.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-demo-home-emulated.png'});

  await page.evaluate(() => { if (typeof goActiveMatch === 'function') goActiveMatch(); });
  const board = page.locator('#game-screen img[alt="Priya"]').first();
  await expect(board).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect.poll(async () => board.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-demo-scoreboard-emulated.png'});

  await page.evaluate(() => {
    if (typeof showProfiles === 'function') showProfiles();
    if (typeof openProfileDetail === 'function') openProfileDetail('Priya');
    if (typeof openAvatarPicker === 'function') openAvatarPicker();
  });
  const normal = (await import('node:fs')).statSync(SMALL_PNG).size;
  expect(normal).toBeLessThan(4 * 1024 * 1024);
  await putPhoto(page, SMALL_PNG);
  await expect(page.locator('#detail-avatar')).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect.poll(async () => page.locator('#detail-avatar').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
});

test('real games keep a large photo and a normal PNG separate from the demo', async ({page}) => {
  await boot(page, '/');
  await page.evaluate(() => {
    allPlayers = ['Priya', 'Owen'];
    players = ['Priya', 'Owen'];
    currentGame = {
      name: 'Five Crowns',
      originalRoster: ['Priya', 'Owen'],
      currentRound: 2,
      maxRounds: 11,
      dealerOffset: 0,
      rounds: [{round: 1, scores: {Priya: 10, Owen: 20}}],
      totals: {Priya: 10, Owen: 20},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      auditLog: []
    };
    if (!playerProfiles.Priya) playerProfiles.Priya = {};
    if (typeof saveData === 'function') saveData({fullPersist: true, syncCold: true});
    if (typeof openProfileDetail === 'function') openProfileDetail('Priya');
    if (typeof openAvatarPicker === 'function') openAvatarPicker();
  });
  const large = (await import('node:fs')).statSync(LARGE_PNG).size;
  expect(large).toBeGreaterThanOrEqual(4 * 1024 * 1024);
  await putPhoto(page, LARGE_PNG);
  await expect(page.locator('#detail-avatar')).toHaveAttribute('src', /^data:image\/jpeg/);
  const stored = await page.evaluate(() => {
    const profiles = JSON.parse(localStorage.getItem('gn_profiles') || '{}');
    return {
      photo: profiles.Priya && profiles.Priya.avatar,
      demo: localStorage.getItem('bpg_demo_profiles') || ''
    };
  });
  expect(stored.photo.startsWith('data:image/jpeg')).toBe(true);
  expect(stored.photo.length).toBeLessThan(180000);
  expect(stored.demo.includes(stored.photo)).toBe(false);
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-real-passport-emulated.png'});
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof openProfileDetail === 'function');
  await page.evaluate(() => { if (typeof openProfileDetail === 'function') openProfileDetail('Priya'); });
  await expect(page.locator('#detail-avatar')).toHaveAttribute('src', /^data:image\/jpeg/);
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-real-passport-after-reload-emulated.png'});
  await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
  await expect(page.locator('#slice2-home img[alt="Priya"]').first()).toHaveAttribute('src', /^data:image\/jpeg/);
  await page.evaluate(() => { if (typeof goActiveMatch === 'function') goActiveMatch(); });
  await expect(page.locator('#game-screen img[alt="Priya"]').first()).toHaveAttribute('src', /^data:image\/jpeg/);

  await page.evaluate(() => {
    if (typeof openProfileDetail === 'function') openProfileDetail('Priya');
    if (typeof openAvatarPicker === 'function') openAvatarPicker();
  });
  const normal = (await import('node:fs')).statSync(SMALL_PNG).size;
  expect(normal).toBeLessThan(4 * 1024 * 1024);
  await putPhoto(page, SMALL_PNG);
  await expect(page.locator('#detail-avatar')).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect.poll(async () => page.locator('#detail-avatar').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-real-home-score-emulated.png'});
});

test('a quota failure keeps the previous portrait and says so', async ({page}) => {
  await boot(page, '/');
  await page.evaluate(() => {
    allPlayers = ['Priya'];
    players = ['Priya'];
    commitPlayerAvatar('Priya', 'donkey.png');
    if (typeof openProfileDetail === 'function') openProfileDetail('Priya');
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).indexOf('profiles') !== -1 && String(value).indexOf('data:image') !== -1) {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return orig.call(this, key, value);
    };
    if (typeof openAvatarPicker === 'function') openAvatarPicker();
  });
  await putPhoto(page, SMALL_PNG);
  await expect(page.locator('#avatar-modal')).toBeVisible();
  await expect(page.locator('#avatar-photo-status')).toBeVisible();
  await expect(page.locator('#avatar-photo-status')).toContainText('The current picture stayed.');
  await expect(page.locator('#detail-avatar')).toHaveAttribute('src', /donkey\.png/);
  await expect.poll(async () => page.locator('#detail-avatar').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  const still = await page.evaluate(() => playerProfiles.Priya.avatar);
  expect(still).toBe('donkey.png');
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-quota-emulated.png'});
});

test('a broken stored photo falls back to the stock silhouette', async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem('gn_all_players', JSON.stringify(['Priya']));
    localStorage.setItem('gn_players_v2', JSON.stringify(['Priya']));
    localStorage.setItem('gn_profiles', JSON.stringify({Priya: {avatar: 'blob:http://gone'}}));
  });
  await boot(page, '/');
  await page.evaluate(() => { if (typeof openProfileDetail === 'function') openProfileDetail('Priya'); });
  const avatar = page.locator('#detail-avatar');
  await expect(avatar).toHaveAttribute('src', /silhouette-/);
  await expect(avatar).not.toHaveAttribute('src', /blob:/);
  await expect.poll(async () => avatar.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  const stored = await page.evaluate(() => playerProfiles.Priya.avatar);
  expect(stored).toBe('');
  await page.screenshot({path: '/opt/cursor/artifacts/avatar-broken-fallback-emulated.png'});
});
