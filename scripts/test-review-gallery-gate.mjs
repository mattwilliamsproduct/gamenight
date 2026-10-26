import assert from 'node:assert/strict';
import test from 'node:test';
import {access, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {DEMO_VIEW_IDS} from '../public/assets/demo-seed.mjs';
import {
  REQUIRED_REVIEW_IDS,
  REVIEW_SCREENS,
  REVIEW_SIZES,
  detectDemoDeepLinks,
  isProductionReviewEnv,
  screenLivePath
} from './review-catalog.mjs';
import {emitReviewGallery} from './build-review-gallery.mjs';
import {fitReviewFrame, formatReviewTime} from '../preview-only/review/review-lib.mjs';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();

test('review catalog covers every required screen at three sizes', () => {
  const ids = REVIEW_SCREENS.map((screen) => screen.id);
  assert.deepEqual(ids, REQUIRED_REVIEW_IDS);
  assert.deepEqual(ids, DEMO_VIEW_IDS);
  for (const needed of [
    'home', 'active-match', 'scorecard-fivecrowns', 'entry-fivecrowns', 'scorecard-wizard', 'entry-wizard',
    'scorecard-818', 'entry-818', 'scorecard-flip7', 'entry-flip7', 'scorecard-beattheheat',
    'entry-beattheheat', 'scorecard-rook', 'entry-rook', 'keypad-8p', 'lifepreserver',
    'lifepreserver-after', 'records', 'records-shame', 'rook-contract', 'rook-call',
    'settings', 'settings-backup', 'history', 'profiles', 'empty-home', 'empty-records', 'error-entry'
  ]) {
    assert.ok(ids.includes(needed), `missing screen ${needed}`);
  }
  assert.equal(REVIEW_SIZES.length, 3);
  assert.deepEqual(REVIEW_SIZES.map((size) => `${size.width}x${size.height}`), ['390x844', '768x1024', '1440x900']);
  assert.equal(REVIEW_SCREENS.length * REVIEW_SIZES.length, 84);
});

test('live paths prefer demo views and keep gnqa fallbacks', () => {
  const home = REVIEW_SCREENS.find((screen) => screen.id === 'home');
  assert.equal(screenLivePath(home, {demoReady: true, size: 'phone'}), '/?demo&view=home&size=phone');
  assert.match(screenLivePath(home, {demoReady: false}), /gnqa=1/);
  assert.match(screenLivePath(home, {demoReady: false}), /scenario=five-crowns-comeback/);
});

test('production hosts never emit /review', () => {
  assert.equal(isProductionReviewEnv({vercelEnv: 'production'}), true);
  assert.equal(isProductionReviewEnv({vercelEnv: 'preview', vercelUrl: 'cardknight.vercel.app'}), true);
  assert.equal(isProductionReviewEnv({vercelEnv: 'preview', vercelUrl: 'gamenight-git-review.vercel.app'}), false);
  assert.equal(isProductionReviewEnv({vercelEnv: 'development'}), false);
});

test('production emit leaves no public/review output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'review-gate-'));
  const publicReviewDir = join(dir, 'review');
  await mkdir(publicReviewDir, {recursive: true});
  await writeFile(join(publicReviewDir, 'leak.html'), 'nope');
  const result = await emitReviewGallery({
    env: {VERCEL_ENV: 'production', VERCEL_URL: 'cardknight.vercel.app'},
    publicReviewDir
  });
  assert.equal(result.emitted, false);
  await assert.rejects(access(publicReviewDir));
  await rm(dir, {recursive: true, force: true});
});

test('preview emit writes the catalog and source files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'review-preview-'));
  const publicReviewDir = join(dir, 'review');
  const result = await emitReviewGallery({
    env: {VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_SHA: 'deadbeef'},
    publicReviewDir
  });
  assert.equal(result.emitted, true);
  assert.equal(result.tileCount, 84);
  const catalog = JSON.parse(await readFile(join(publicReviewDir, 'catalog.json'), 'utf8'));
  assert.equal(catalog.tileCount, 84);
  assert.equal(catalog.commit, 'deadbeef');
  await access(join(publicReviewDir, 'index.html'));
  await access(join(publicReviewDir, 'review.js'));
  await rm(dir, {recursive: true, force: true});
});

test('middleware and worker never ship /review to production', async () => {
  const middleware = await readFile(join(rootDir, 'middleware.js'), 'utf8');
  assert.match(middleware, /VERCEL_ENV === 'production'/);
  assert.match(middleware, /cardknight\.vercel\.app/);
  assert.match(middleware, /status: 404/);
  const worker = await readFile(join(rootDir, 'src/service-worker.js'), 'utf8');
  assert.equal(worker.includes('/review'), false);
  assert.equal(worker.includes('./review'), false);
  const {stdout} = await execFileAsync('git', ['ls-files', 'public/review'], {cwd: rootDir});
  assert.equal(stdout.trim(), '', 'public/review must stay untracked so production output cannot ship it from git');
});

test('review frames keep exact device size and scale down to fit', () => {
  const phoneAtTv = fitReviewFrame({width: 390, height: 844}, {availableWidth: 450, maxHeight: 340});
  assert.equal(phoneAtTv.frameWidth, 390);
  assert.equal(phoneAtTv.frameHeight, 844);
  assert.equal(phoneAtTv.clipWidth, Math.round(390 * phoneAtTv.scale));
  assert.ok(phoneAtTv.clipWidth < 390, 'phone tile must shrink to the 340px cap, not leave a wide gutter');
  assert.ok(Math.abs(phoneAtTv.clipWidth / phoneAtTv.clipHeight - 390 / 844) < 0.02);

  const tabletOnPhone = fitReviewFrame({width: 768, height: 1024}, {availableWidth: 358, maxHeight: 280});
  assert.equal(tabletOnPhone.frameWidth, 768);
  assert.equal(tabletOnPhone.frameHeight, 1024);
  assert.ok(tabletOnPhone.scale < 1);
  assert.equal(tabletOnPhone.clipWidth, Math.round(768 * tabletOnPhone.scale));
});

test('review capture time is America/New_York with an ET label', () => {
  const stamp = formatReviewTime('2026-10-26T23:49:06.367Z');
  assert.match(stamp, /ET$/);
  assert.match(stamp, /19:49:06/);
  assert.equal(stamp.includes('UTC'), false);
});

test('demo detector follows the RC TEMP seed', async () => {
  const index = await readFile(join(rootDir, 'public/index.html'), 'utf8');
  assert.equal(detectDemoDeepLinks(index), true);
});
