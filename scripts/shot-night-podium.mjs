import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const LOCAL = 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/night-podium';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '1024', width: 1024, height: 650},
  {name: '1440', width: 1440, height: 900}
];

await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const context = await browser.newContext({serviceWorkers: 'block'});
const page = await context.newPage();

async function ready() {
  await page.waitForFunction(() => document.body?.dataset?.gnDemoReady || document.getElementById('slice2-home'), null, {timeout: 25000});
  await page.waitForSelector('#slice2-home .s2-nights', {timeout: 15000});
  await page.waitForTimeout(250);
}

async function measure() {
  return page.evaluate(() => {
    const nights = document.querySelector('#slice2-home .s2-nights');
    const cards = [...(nights?.querySelectorAll('.s2-night') || [])];
    const podiums = [...(nights?.querySelectorAll('.s2-night-podium') || [])];
    const badges = [...(nights?.querySelectorAll('.s2-podium-badge') || [])];
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)};
    };
    const cardNotes = cards.map((card) => {
      const r = card.getBoundingClientRect();
      const copy = card.querySelector('.s2-night-copy');
      const podium = card.querySelector('.s2-night-podium');
      const who = card.querySelector('.s2-night-who')?.textContent || '';
      const title = card.querySelector('strong')?.textContent || '';
      const date = card.querySelector('.s2-night-date')?.textContent || '';
      const faces = [...card.querySelectorAll('.s2-podium-face')].map((face) => {
        const fr = face.getBoundingClientRect();
        const badge = face.querySelector('.s2-podium-badge');
        const br = badge?.getBoundingClientRect();
        return {
          clipped: br ? br.right > r.right + 1 || br.bottom > r.bottom + 1 || br.left < r.left - 1 : false,
          badge: br ? {w: Math.round(br.width), h: Math.round(br.height), text: badge.textContent} : null,
          face: {w: Math.round(fr.width), h: Math.round(fr.height)}
        };
      });
      return {
        title,
        date,
        who,
        card: box(card),
        copy: box(copy),
        podium: box(podium),
        faceCount: faces.length,
        clippedBadge: faces.some((face) => face.clipped),
        faces
      };
    });
    return {
      nightCount: cards.length,
      podiumCount: podiums.length,
      badgeCount: badges.length,
      cards: cardNotes
    };
  });
}

const report = [];
for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  await page.goto(`${LOCAL}/?gnqa=1&gallery=0&scenario=home-nights-podium`, {waitUntil: 'domcontentloaded'});
  await ready();
  const nights = page.locator('#slice2-home .s2-nights');
  await nights.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);

  await page.addStyleTag({content: '.s2-night-podium{display:none !important}'});
  await nights.screenshot({path: `${OUT}/before-nights-${size.name}.png`});
  await page.screenshot({path: `${OUT}/before-home-${size.name}.png`, fullPage: size.width < 800});

  await page.reload({waitUntil: 'domcontentloaded'});
  await ready();
  await nights.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await nights.screenshot({path: `${OUT}/after-nights-${size.name}.png`});
  await page.screenshot({path: `${OUT}/after-home-${size.name}.png`, fullPage: size.width < 800});
  const cards = page.locator('#slice2-home .s2-night');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    await cards.nth(i).screenshot({path: `${OUT}/after-card-${i + 1}-${size.name}.png`});
  }
  const found = await measure();
  report.push({size: size.name, ...found});
  console.log(JSON.stringify({
    size: size.name,
    nights: found.nightCount,
    podiums: found.podiumCount,
    badges: found.badgeCount,
    clipped: found.cards.some((card) => card.clippedBadge),
    cards: found.cards.map((card) => ({title: card.title, who: card.who, faces: card.faceCount, clipped: card.clippedBadge}))
  }));
}

await writeFile(`${OUT}/metrics.json`, JSON.stringify(report, null, 2));
await writeFile(`${OUT}/README.md`, `Recent nights podium shots.

Query: /?gnqa=1&gallery=0&scenario=home-nights-podium
Also: /?demo&view=home
`);

await browser.close();
