import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const PREVIEW = 'https://gamenight-git-cursor-rc1-records-mattwilliamsproducts-projects.vercel.app';
const LOCAL = 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/records';
const VIEWS = [
  'records-overview',
  'records-explore',
  'records-nights',
  'lifepreserver',
  'lifepreserver-after',
  'lifepreserver-low',
  'active-match'
];
const SIZES = [
  {name: '390', width: 390, height: 844},
  {name: '1440', width: 1440, height: 900}
];

await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();

async function ready(page, view) {
  await page.waitForFunction(() => !!document.body.dataset.gnDemoReady, null, {timeout: 25000});
  if (view.startsWith('records')) {
    await page.waitForSelector('#hall-of-fame-view .s2-segment');
  } else if (view.startsWith('lifepreserver')) {
    await page.waitForSelector('#wheel-modal:not(.hidden)');
    if (view === 'lifepreserver-after') {
      await page.waitForSelector('#wheel-result:not(.hidden)');
    }
  } else if (view === 'active-match') {
    await page.waitForSelector('#scorecard-screen:not(.hidden), #game-screen:not(.hidden)');
  }
  await page.waitForTimeout(500);
}

async function probe(url) {
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 30000});
  const title = await page.title();
  const host = await page.evaluate(() => location.hostname);
  const sso = host.includes('vercel.com') || /login|sso|authentication/i.test(title);
  return {title, host, sso};
}

const previewProbe = await probe(`${PREVIEW}/?demo&view=records-overview`);
console.log('preview-probe', previewProbe);
const BASE = previewProbe.sso ? LOCAL : PREVIEW;
console.log('shooting-from', BASE);

for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const view of VIEWS) {
    await page.goto(`${BASE}/?demo&view=${view}`, {waitUntil: 'domcontentloaded'});
    await ready(page, view);
    const path = `${OUT}/${view}-${size.name}-view.png`;
    await page.screenshot({path});
    console.log(path);
    if (view === 'records-nights') {
      const joint = page.locator('.s2-night-card.is-joint').first();
      if (await joint.count()) {
        await joint.scrollIntoViewIfNeeded();
        await page.screenshot({path: `${OUT}/nights-${size.name}-view-joint.png`});
        await page.screenshot({path: `${OUT}/records-nights-${size.name}-view-joint.png`});
      }
    }
    if (view === 'records-explore') {
      const rate = page.locator('.s2-book-row', {hasText: 'exact-bid rate'}).first();
      if (await rate.count()) {
        await rate.scrollIntoViewIfNeeded();
        await page.screenshot({path: `${OUT}/records-explore-${size.name}-exact.png`});
      }
    }
  }
}

await browser.close();
