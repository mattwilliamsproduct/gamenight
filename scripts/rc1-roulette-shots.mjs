import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.LP_SHOT_DIR || '/opt/cursor/artifacts/rc1-roulette';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '390', width: 390, height: 844},
  {name: '1024', width: 1024, height: 650},
  {name: '1440', width: 1440, height: 900},
  {name: '1920', width: 1920, height: 1080}
];

const CASES = [
  {id: 'linda-fc', url: '/?demo&view=lifepreserver-low'},
  {id: 'cat-818', url: '/?demo&view=lifepreserver'},
  {id: 'duke-fc', url: '/?gnqa=1&scenario=five-crowns-life-preserver-threshold'}
];

async function waitReady(page, url) {
  await page.goto(`${BASE}${url}`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => (
    document.body.dataset.gnDemoReady === 'seeded' || document.body.dataset.gnQaReady === 'true'
  ), null, {timeout: 20000});
  if (url.includes('five-crowns-life-preserver-threshold')) {
    const opened = await page.evaluate(() => {
      if (typeof authorizeHailMary === 'function') authorizeHailMary('Duke');
      const modal = document.getElementById('wheel-modal');
      return !!(modal && !modal.classList.contains('hidden'));
    });
    if (!opened) throw new Error('Duke wheel did not open');
    await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
  }
  await page.locator('#wheel-modal').waitFor({state: 'visible'});
  await page.evaluate(() => {
    document.body.classList.add('gn-qa-gallery-hidden');
    document.getElementById('wheel-modal')?.classList.remove('opacity-0', 'hidden');
  });
  await page.waitForFunction(() => (window.BPGSlice2?.wheelLabelReport?.().labels || []).length > 4, null, {timeout: 5000});
}

const browser = await chromium.launch();
mkdirSync(OUT, {recursive: true});
mkdirSync('/opt/cursor/artifacts/screenshots', {recursive: true});
const measures = [];

for (const size of SIZES) {
  for (const item of CASES) {
    const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
    await waitReady(page, item.url);
    const pre = await page.evaluate(() => BPGSlice2.wheelLabelReport());
    measures.push({size: size.name, case: item.id, phase: 'pre', ...pre});
    const preName = `${size.name}-${item.id}-pre`;
    const dialog = page.locator('#wheel-modal .life-preserver-dialog');
    await dialog.screenshot({path: `${OUT}/${preName}.png`});
    await dialog.screenshot({path: `/opt/cursor/artifacts/screenshots/${preName}.png`});
    await page.close();
  }
}

for (const size of SIZES) {
  for (const item of CASES.filter((entry) => entry.id !== 'duke-fc')) {
    const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await waitReady(page, item.url);
    await page.locator('#btn-spin').click();
    await page.locator('#wheel-result').waitFor({state: 'visible', timeout: 4000});
    const post = await page.evaluate(() => BPGSlice2.wheelLabelReport());
    measures.push({size: size.name, case: item.id, phase: 'post', ...post});
    const postName = `${size.name}-${item.id}-post`;
    const dialog = page.locator('#wheel-modal .life-preserver-dialog');
    await dialog.screenshot({path: `${OUT}/${postName}.png`});
    await dialog.screenshot({path: `/opt/cursor/artifacts/screenshots/${postName}.png`});
    await page.close();
  }
}

const reduce = await browser.newPage({viewport: {width: 390, height: 844}});
await reduce.emulateMedia({reducedMotion: 'reduce'});
await waitReady(reduce, '/?demo&view=lifepreserver-low');
await reduce.locator('#btn-spin').click();
await reduce.locator('#wheel-result').waitFor({state: 'visible', timeout: 4000});
const reduceReport = await reduce.evaluate(() => BPGSlice2.wheelLabelReport());
measures.push({size: '390', case: 'linda-fc', phase: 'reduced-motion', ...reduceReport});
const reduceDialog = reduce.locator('#wheel-modal .life-preserver-dialog');
await reduceDialog.screenshot({path: `${OUT}/390-linda-fc-reduced.png`});
await reduceDialog.screenshot({path: '/opt/cursor/artifacts/screenshots/390-linda-fc-reduced.png'});
await reduce.close();

writeFileSync(`${OUT}/measures.json`, JSON.stringify(measures, null, 2));
await browser.close();
console.log(JSON.stringify(measures.map((row) => ({
  size: row.size,
  case: row.case,
  phase: row.phase,
  wheel: row.wheel,
  font: row.font,
  maxFont: row.maxFont,
  diameterShare: Number(row.diameterShare?.toFixed?.(3) || row.diameterShare),
  spinInView: row.spinInView,
  labels: row.labels?.length,
  callouts: row.callouts
})), null, 2));
console.log(`wrote roulette shots to ${OUT}`);
