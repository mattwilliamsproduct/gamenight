import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const out = '/opt/cursor/artifacts/card-picker';
await mkdir(out, {recursive: true});

const browser = await chromium.launch({headless: true});

async function open(w, h, scenario) {
  const page = await browser.newPage({viewport: {width: w, height: h}, deviceScaleFactor: 1});
  await page.goto(`http://127.0.0.1:4173/?gnqa=1&gallery=0&scenario=${scenario}`, {waitUntil: 'networkidle'});
  await page.waitForSelector('#slice2-start-btn');
  await page.evaluate(() => document.fonts?.ready);
  if (w <= 860) {
    await page.evaluate(() => document.querySelector('.s2-home-start')?.scrollIntoView({block: 'start'}));
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 150)));
  }
  return page;
}

const home = await open(1024, 768, 'card-picker');
await home.screenshot({path: `${out}/home-1024-4seated.png`, fullPage: false});
await home.close();

const tv = await open(1920, 1080, 'card-picker');
await tv.screenshot({path: `${out}/home-1920-4seated.png`, fullPage: false});
const tvFit = await tv.evaluate(() => {
  const frames = [...document.querySelector('.s2-home-start')?.querySelectorAll('.s2-card-frame') || []].map((n) => n.getBoundingClientRect());
  const start = document.querySelector('#slice2-start-btn')?.getBoundingClientRect();
  const panel = document.querySelector('.s2-home-start')?.getBoundingClientRect();
  const names = [...document.querySelectorAll('.s2-home-table .s2-seat .s2-name, .s2-home-table .s2-seat-name')].map((n) => ({
    text: n.textContent.trim(),
    overflow: n.scrollWidth > n.clientWidth + 1
  }));
  return {
    card: frames[0] ? {w: Math.round(frames[0].width), h: Math.round(frames[0].height)} : null,
    startInside: !!(start && panel && start.left >= panel.left - 1 && start.right <= panel.right + 1 && start.bottom <= panel.bottom + 1),
    names
  };
});
await tv.close();

const phone = await open(390, 844, 'card-picker');
await phone.screenshot({path: `${out}/home-390.png`, fullPage: false});
const phoneFit = await phone.evaluate(() => {
  const start = document.querySelector('#slice2-start-btn')?.getBoundingClientRect();
  return {
    startOnScreen: !!(start && start.bottom <= window.innerHeight + 1),
    startText: document.querySelector('#slice2-start-btn')?.textContent.trim()
  };
});
await phone.close();
await browser.close();

console.log(JSON.stringify({out, tvFit, phoneFit}, null, 2));
