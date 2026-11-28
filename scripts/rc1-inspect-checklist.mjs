import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.INSPECT_DIR || '/opt/cursor/artifacts/screenshots/inspect';
mkdirSync(OUT, {recursive: true});

async function seed(page) {
  await page.addInitScript(() => { window.__GN_DEMO_HOST_OVERRIDE__ = 'localhost'; });
}

async function ready(page) {
  await page.waitForFunction(() => {
    const ready = document.body.dataset.gnDemoReady;
    return ready === 'seeded' || ready === 'empty' || ready === 'skipped';
  }, null, {timeout: 25000});
  await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
}

const browser = await chromium.launch();
const findings = [];

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({path, fullPage: false});
  return path;
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=demo-path`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  const board = await page.evaluate(() => ({
    table: document.getElementById('slice2-table-btn')?.innerText || '',
    enter: document.getElementById('slice2-enter-btn')?.innerText || '',
    end: document.querySelector('.match-end-btn')?.innerText || '',
    actions: document.getElementById('actions-btn')?.innerText || ''
  }));
  await shot(page, '390-board-leave-end');
  await page.locator('#actions-btn').click();
  const scratch = await page.locator('#actions-menu').innerText();
  await shot(page, '390-actions-discard');
  await page.evaluate(() => requestEndGame());
  const endCopy = await page.evaluate(() => ({
    title: document.getElementById('end-match-title')?.textContent,
    copy: document.getElementById('end-match-copy')?.textContent
  }));
  await shot(page, '390-end-incomplete');
  findings.push({
    id: 'leave-end-discard',
    tableLabel: board.table,
    endLabel: board.end,
    actionsLabel: board.actions,
    scratchText: scratch,
    endTitle: endCopy.title,
    endCopy: endCopy.copy,
    leaveIsModal: false,
    discardIsNativeConfirm: /Scratch this match/.test(String(scratch)) || /discard/i.test(scratch)
  });
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=game&game=hand-and-foot`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  const before = await page.evaluate(() => ({
    name: currentGame?.name,
    totals: currentGame?.totals,
    teams: currentGame?.teams || currentGame?.partnerships,
    rounds: (currentGame?.rounds || []).length
  }));
  await shot(page, '390-canasta-card');
  await page.evaluate(() => openScoreEntryModal());
  await page.waitForFunction(() => {
    const el = document.getElementById('score-entry-modal');
    return el && !el.classList.contains('hidden');
  });
  await shot(page, '390-canasta-entry');
  const entry = await page.evaluate(() => document.getElementById('score-entry-modal')?.innerText?.slice(0, 400));
  findings.push({id: 'canasta', before, entrySnippet: entry});
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=demo-path`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  const retired = await page.evaluate(() => {
    if (!currentGame) return null;
    currentGame.retired = currentGame.retired || [];
    if (!currentGame.retired.includes('Hank')) currentGame.retired.push('Hank');
    if (typeof renderGame === 'function') renderGame();
    return {
      retired: currentGame.retired,
      totals: currentGame.totals,
      recorded: typeof getRecordedPlayers === 'function' ? getRecordedPlayers(currentGame) : null
    };
  });
  await shot(page, '390-retired-hank');
  findings.push({id: 'retired', retired});
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=game&game=hand-and-foot`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  const large = await page.evaluate(() => {
    const game = BPGDemoLiveGame();
    const body = document.body.innerText;
    return {totals: game?.totals, sees3695: /3695/.test(body), sees1430: /1430/.test(body)};
  });
  await shot(page, '390-canasta-large-totals');
  findings.push({id: 'large-totals', large});
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=game&game=wizard`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  const negatives = await page.evaluate(() => {
    const game = BPGDemoLiveGame();
    if (!game) return {ok: false};
    const first = (game.originalRoster || Object.keys(game.totals || {}))[0];
    if (game.rounds?.[0]) game.rounds[0].scores[first] = -12;
    if (typeof renderGame === 'function') renderGame();
    const live = BPGDemoLiveGame();
    const body = document.body.innerText;
    return {
      player: first,
      totals: live?.totals,
      seesNeg: /-12/.test(body),
      bodyHasMinus: /−12|-12/.test(body)
    };
  });
  await shot(page, '390-wizard-negative');
  findings.push({id: 'negatives', negatives});
  await page.close();
}

writeFileSync(join(OUT, 'findings.json'), JSON.stringify(findings, null, 2));
await browser.close();
console.log(JSON.stringify(findings, null, 2));
