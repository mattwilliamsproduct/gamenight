import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.DEMO_SHOT_DIR || '/opt/cursor/artifacts/rc1-demo-views';
const SIZES = [
  {name: '390', width: 390, height: 844},
  {name: '1440', width: 1440, height: 900}
];
const VIEWS = [
  {id: 'home', path: '/?demo&view=home'},
  {id: 'game-five-crowns', path: '/?demo&view=game&game=five-crowns'},
  {id: 'game-818', path: '/?demo&view=game&game=818'},
  {id: 'game-wizard', path: '/?demo&view=game&game=wizard'},
  {id: 'game-flip7', path: '/?demo&view=game&game=flip7'},
  {id: 'game-beat-the-heat', path: '/?demo&view=game&game=beat-the-heat'},
  {id: 'game-rook', path: '/?demo&view=game&game=rook&games=rook'},
  {id: 'game-hand-and-foot', path: '/?demo&view=game&game=hand-and-foot'},
  {id: 'lifepreserver', path: '/?demo&view=lifepreserver'},
  {id: 'bids-wizard', path: '/?demo&view=bids-wizard'},
  {id: 'entry-fivecrowns', path: '/?demo&view=entry-fivecrowns'},
  {id: 'podium-tie', path: '/?demo&view=podium-tie'},
  {id: 'records', path: '/?demo&view=records'},
  {id: 'past-night', path: '/?demo&view=past-night'},
  {id: 'add-player-m', path: '/?demo&view=add-player-m'}
];

const browser = await chromium.launch();
mkdirSync(OUT, {recursive: true});
mkdirSync('/opt/cursor/artifacts/screenshots', {recursive: true});

for (const size of SIZES) {
  for (const view of VIEWS) {
    const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
    await page.addInitScript(() => {
      window.__GN_DEMO_HOST_OVERRIDE__ = 'gamenight-git-cursor-relea-23a825-mattwilliamsproducts-projects.vercel.app';
    });
    await page.goto(`${BASE}${view.path}`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !!document.body.dataset.gnDemoReady, null, {timeout: 20000});
    await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
    const name = `${size.name}-${view.id}`;
    await page.screenshot({path: `${OUT}/${name}.png`, fullPage: false});
    await page.screenshot({path: `/opt/cursor/artifacts/screenshots/${name}.png`, fullPage: false});
    await page.close();
  }
}

await browser.close();
console.log(`wrote ${SIZES.length * VIEWS.length} shots to ${OUT}`);
