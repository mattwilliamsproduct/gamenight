import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.MODAL_SHOT_DIR || '/opt/cursor/artifacts/rc1-modals';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '390', width: 390, height: 844},
  {name: '1024', width: 1024, height: 650},
  {name: '1440', width: 1440, height: 900}
];

function longFiveCrownsMatch() {
  const players = ['Megan', 'Matt', 'Cat', 'Mike', 'Vikki', 'Duke', 'Brick', 'Linda'];
  const rounds = Array.from({length: 11}, (_, index) => ({
    round: index + 1,
    scores: Object.fromEntries(players.map((name, playerIndex) => [name, (index + 1) * 3 + playerIndex]))
  }));
  const totals = Object.fromEntries(players.map((name) => [
    name,
    rounds.reduce((sum, round) => sum + round.scores[name], 0)
  ]));
  return {
    id: 1784391110001,
    game: 'Five Crowns',
    date: '10/26/2026',
    totals,
    winners: ['Megan'],
    rounds,
    originalRoster: players,
    currentRound: 12,
    hailMaryUsed: [],
    retired: []
  };
}

async function waitQa(page, url) {
  await page.goto(`${BASE}${url}`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => (
    document.body.dataset.gnDemoReady === 'seeded' || document.body.dataset.gnQaReady === 'true'
  ), null, {timeout: 20000});
  await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
}

async function measure(page, id) {
  return page.evaluate((modalId) => {
    const shell = document.getElementById(modalId);
    const panel = shell?.querySelector('.bp-modal-panel, .surface-raised, .dice-dialog, .whammy-card');
    const box = panel?.getBoundingClientRect();
    return {
      id: modalId,
      viewport: {width: window.innerWidth, height: window.innerHeight},
      width: box ? Math.round(box.width) : 0,
      height: box ? Math.round(box.height) : 0,
      share: box ? Number((box.width / window.innerWidth).toFixed(3)) : 0
    };
  }, id);
}

const browser = await chromium.launch();
mkdirSync(OUT, {recursive: true});
mkdirSync('/opt/cursor/artifacts/screenshots', {recursive: true});
const inventory = [];

for (const size of SIZES) {
  const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
  await waitQa(page, '/?gnqa=1&gallery=0&scenario=home-party&surface=home');
  await page.evaluate((match) => {
    if (!history.some((item) => item.id === match.id)) history.unshift(match);
    if (window.BPGSlice2) window.BPGSlice2.refresh('home');
    openScorecard(match.id);
  }, longFiveCrownsMatch());
  await page.locator('#scorecard-modal').waitFor({state: 'visible'});
  inventory.push({size: size.name, phase: 'after', ...(await measure(page, 'scorecard-modal'))});
  const past = `${size.name}-past-night-scorecard`;
  await page.screenshot({path: `${OUT}/${past}.png`, fullPage: false});
  await page.screenshot({path: `/opt/cursor/artifacts/screenshots/${past}.png`, fullPage: false});
  await page.evaluate(() => closeScorecard());
  await page.close();
}

const sheet = await browser.newPage({viewport: {width: 1440, height: 900}});
await waitQa(sheet, '/?demo&view=lifepreserver-low');
await sheet.locator('#wheel-modal').waitFor({state: 'visible'});
inventory.push({size: '1440', phase: 'after', ...(await measure(sheet, 'wheel-modal'))});
await sheet.screenshot({path: `${OUT}/1440-wheel.png`, fullPage: false});
await sheet.screenshot({path: '/opt/cursor/artifacts/screenshots/1440-wheel.png', fullPage: false});
await sheet.close();

const actions = await browser.newPage({viewport: {width: 1024, height: 650}});
await waitQa(actions, '/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard');
await actions.locator('#actions-btn').click();
await actions.getByRole('button', {name: /Add Player Mid-Game/}).click();
await actions.locator('#add-player-modal').waitFor({state: 'visible'});
await actions.locator('#midgame-add-player-input').fill('m');
inventory.push({size: '1024', phase: 'after', ...(await measure(actions, 'add-player-modal'))});
await actions.screenshot({path: `${OUT}/1024-add-player.png`, fullPage: false});
await actions.screenshot({path: '/opt/cursor/artifacts/screenshots/1024-add-player.png', fullPage: false});
await actions.screenshot({path: `${OUT}/1024-add-player-m.png`, fullPage: false});
await actions.screenshot({path: '/opt/cursor/artifacts/screenshots/1024-add-player-m.png', fullPage: false});
await actions.evaluate(() => closeAddPlayerModal());
await actions.locator('#actions-btn').click();
await actions.evaluate(() => requestEndGame());
await actions.locator('#end-match-modal').waitFor({state: 'visible'});
inventory.push({size: '1024', phase: 'after', ...(await measure(actions, 'end-match-modal'))});
await actions.screenshot({path: `${OUT}/1024-end-match.png`, fullPage: false});
await actions.screenshot({path: '/opt/cursor/artifacts/screenshots/1024-end-match.png', fullPage: false});
await actions.evaluate(() => closeEndMatchModal());
await actions.evaluate(() => openAuditLog());
await actions.locator('#audit-modal').waitFor({state: 'visible'});
inventory.push({size: '1024', phase: 'after', ...(await measure(actions, 'audit-modal'))});
await actions.screenshot({path: `${OUT}/1024-audit.png`, fullPage: false});
await actions.screenshot({path: '/opt/cursor/artifacts/screenshots/1024-audit.png', fullPage: false});
await actions.evaluate(() => closeAuditLog());
await actions.evaluate(() => openLifePreserverPicker());
await actions.locator('#lp-picker-modal').waitFor({state: 'visible'});
inventory.push({size: '1024', phase: 'after', ...(await measure(actions, 'lp-picker-modal'))});
await actions.screenshot({path: `${OUT}/1024-lp-picker.png`, fullPage: false});
await actions.screenshot({path: '/opt/cursor/artifacts/screenshots/1024-lp-picker.png', fullPage: false});
await actions.close();

const phoneAdd = await browser.newPage({viewport: {width: 375, height: 667}});
await waitQa(phoneAdd, '/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard');
await phoneAdd.locator('#actions-btn').click();
await phoneAdd.getByRole('button', {name: /Add Player Mid-Game/}).click();
await phoneAdd.locator('#midgame-add-player-input').fill('m');
await phoneAdd.screenshot({path: `${OUT}/375-add-player-m.png`, fullPage: false});
await phoneAdd.screenshot({path: '/opt/cursor/artifacts/screenshots/375-add-player-m.png', fullPage: false});
await phoneAdd.close();

writeFileSync(`${OUT}/inventory.json`, JSON.stringify(inventory, null, 2));
await browser.close();
console.log(JSON.stringify(inventory, null, 2));
