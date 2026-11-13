import {expect, test} from '@playwright/test';
import {freshTable, seatPlayers, silencePorchPrompts} from '../helpers/hand-foot.mjs';
import {openScenario} from '../helpers/qa.mjs';

test.use({serviceWorkers: 'block'});

test.beforeEach(async ({page}) => {
  await silencePorchPrompts(page);
});

const GAMES = [
  {id: 'Five Crowns', title: 'Five Crowns'},
  {id: '818', title: '818'},
  {id: 'Wizard', title: 'Wizard'},
  {id: 'Flip 7 Vengeance', title: 'Flip 7'},
  {id: 'Beat the Heat', title: 'Beat the Heat'},
  {id: 'Hand and Foot', title: 'Canasta'}
];

test('Home shows six equal 5:7 cards with no labels; select then Start opens the game', async ({page}) => {
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);

  const cards = page.locator('.s2-home-start [data-s2-action="pick-game"]');
  await expect(cards).toHaveCount(6);
  await expect(page.locator('.s2-home-start [data-s2-action="pick-game"][data-s2-game="Rook"]')).toHaveCount(0);
  await expect(page.locator('.s2-home-start .s2-game-name')).toHaveCount(6);
  await expect(page.locator('.s2-home-start [data-s2-action="start-game-now"]')).toHaveCount(0);

  for (const game of GAMES) {
    const tile = page.locator(`.s2-home-start [data-s2-action="pick-game"][data-s2-game="${game.id}"]`);
    await expect(tile).toHaveAttribute('aria-label', new RegExp(game.title, 'i'));
    await expect(tile.locator('.s2-game-name')).toHaveText(game.title);
  }

  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('.s2-home-start');
    const panelBox = panel.getBoundingClientRect();
    const cs = getComputedStyle(panel);
    const inset = {
      left: panelBox.left + parseFloat(cs.paddingLeft),
      right: panelBox.right - parseFloat(cs.paddingRight),
      top: panelBox.top + parseFloat(cs.paddingTop),
      bottom: panelBox.bottom - parseFloat(cs.paddingBottom)
    };
    return [...document.querySelectorAll('.s2-home-start .s2-card-frame')].map((node) => {
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        ratio: box.width / box.height,
        inside: box.left >= inset.left - 1 && box.right <= inset.right + 1 && box.top >= inset.top - 1 && box.bottom <= inset.bottom + 1
      };
    });
  });
  expect(metrics).toHaveLength(6);
  const widths = metrics.map((card) => card.width);
  const heights = metrics.map((card) => card.height);
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  for (const card of metrics) {
    expect(card.ratio).toBeGreaterThan(0.704);
    expect(card.ratio).toBeLessThan(0.724);
    expect(card.width).toBeLessThanOrEqual(220);
    expect(card.inside, 'card stays inside the Start panel').toBe(true);
  }

  const photos = page.locator('.s2-home-start .s2-card-photo');
  await expect(photos).toHaveCount(6);
  for (let i = 0; i < 6; i += 1) {
    await expect(photos.nth(i)).toHaveCSS('object-fit', 'cover');
  }

  const borderOf = (id) => page.locator(`.s2-home-start [data-s2-game="${id}"] .s2-card-frame`).evaluate((node) => {
    const ring = getComputedStyle(node, '::after').boxShadow || '';
    const px = (ring.match(/(\d+(?:\.\d+)?)px/g) || []).map((part) => parseFloat(part));
    const spread = px.length >= 4 ? px[3] : 0;
    const color = (ring.match(/rgba?\([^)]+\)/) || [])[0] || '';
    return {
      width: spread,
      style: spread > 0 ? 'solid' : 'none',
      color,
      text: (node.closest('button')?.innerText || '').trim()
    };
  });
  const flipIdle = await borderOf('Flip 7 Vengeance');
  const crownsIdle = await borderOf('Five Crowns');
  expect(flipIdle.width).toBeGreaterThanOrEqual(2);
  expect(flipIdle.style).toBe('solid');
  expect(flipIdle.text).not.toMatch(/Selected/);
  expect(crownsIdle.width).toBeGreaterThan(flipIdle.width);
  expect(crownsIdle.color).toBe('rgb(10, 92, 84)');
  await page.locator('.s2-home-start [data-s2-game="Flip 7 Vengeance"]').click();
  const flipOn = await borderOf('Flip 7 Vengeance');
  const crownsOff = await borderOf('Five Crowns');
  expect(flipOn.width).toBeGreaterThan(crownsOff.width);
  expect(flipOn.color).toBe('rgb(10, 92, 84)');
  expect(flipOn.text).not.toMatch(/Selected/);
  await page.locator('.s2-home-start [data-s2-game="Wizard"]').click();
  const wizardOn = await borderOf('Wizard');
  const flipOff = await borderOf('Flip 7 Vengeance');
  expect(wizardOn.width).toBeGreaterThan(flipOff.width);
  expect(wizardOn.color).toBe('rgb(10, 92, 84)');
  expect(flipOff.color).not.toBe('rgb(10, 92, 84)');

  const wizard = page.locator('.s2-home-start [data-s2-action="pick-game"][data-s2-game="Wizard"]');
  await wizard.click();
  await expect(wizard).toHaveClass(/is-selected/);
  await expect(page.locator('#slice2-start-btn')).toHaveText('Start Wizard');
  await expect(page.locator('#slice2-start-summary')).toContainText('Wizard');
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#game-title')).toContainText('Wizard');
});

async function homeCardLayout(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.s2-home-start');
    const bar = document.querySelector('.s2-home-start .s2-startbar');
    const rules = document.querySelector('.s2-home-start .s2-rules-select');
    const toast = document.getElementById('save-indicator');
    const frames = [...document.querySelectorAll('.s2-home-start .s2-card-frame')].map((node) => node.getBoundingClientRect());
    const panelBox = panel.getBoundingClientRect();
    const pad = getComputedStyle(panel);
    const inset = {
      left: panelBox.left + parseFloat(pad.paddingLeft),
      right: panelBox.right - parseFloat(pad.paddingRight),
      top: panelBox.top + parseFloat(pad.paddingTop),
      bottom: panelBox.bottom - parseFloat(pad.paddingBottom)
    };
    const hits = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    const lastBottom = Math.max(...frames.map((box) => box.bottom));
    const barTop = bar.getBoundingClientRect().top;
    return {
      count: frames.length,
      widths: frames.map((box) => box.width),
      heights: frames.map((box) => box.height),
      inside: frames.every((box) => box.left >= inset.left - 1 && box.right <= inset.right + 1 && box.top >= inset.top - 1 && box.bottom <= inset.bottom + 1),
      band: Math.round(barTop - lastBottom),
      toastHitsRules: hits(toast.getBoundingClientRect(), rules.getBoundingClientRect()),
      toastText: (toast.textContent || '').trim()
    };
  });
}

test('1920 TV cards stay inside Start a New Match and stay identical', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);
  const layout = await homeCardLayout(page);
  expect(layout.count).toBe(6);
  expect(layout.inside, '1920 cards stay inside the Start panel').toBe(true);
  expect(Math.max(...layout.widths) - Math.min(...layout.widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.heights) - Math.min(...layout.heights)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.widths)).toBeLessThanOrEqual(420);
  expect(layout.widths[0] / layout.heights[0]).toBeGreaterThan(0.704);
  expect(layout.widths[0] / layout.heights[0]).toBeLessThan(0.724);
});

test('1024 landscape fills the start panel and Saved misses Game Instructions', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);
  await page.evaluate(() => {
    if (window.BPGSlice2) BPGSlice2.parkSaveIndicator();
    const toast = document.getElementById('save-indicator');
    toast.hidden = false;
    toast.classList.add('show');
  });
  const layout = await homeCardLayout(page);
  expect(layout.count).toBe(6);
  expect(layout.inside, '1024 cards stay inside the Start panel').toBe(true);
  expect(Math.max(...layout.widths) - Math.min(...layout.widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.heights) - Math.min(...layout.heights)).toBeLessThanOrEqual(1);
  expect(layout.band, `dead band between cards and Start ${layout.band}px`).toBeLessThanOrEqual(36);
  expect(layout.toastHitsRules, 'Saved does not cover Game Instructions').toBe(false);
  expect(layout.toastText).toMatch(/Saved on this device/);
  expect(Math.min(...layout.widths), `1024 cards too narrow ${Math.min(...layout.widths)}`).toBeGreaterThanOrEqual(110);
});

async function startFold(page) {
  return page.evaluate(() => {
    const start = document.querySelector('#slice2-start-btn')?.getBoundingClientRect();
    const bar = document.querySelector('.s2-home-start .s2-startbar')?.getBoundingClientRect();
    const panel = document.querySelector('.s2-home-start')?.getBoundingClientRect();
    const vh = window.innerHeight;
    return {
      startOnScreen: !!(start && start.height > 20 && start.top >= 0 && start.bottom <= vh + 1),
      barOnScreen: !!(bar && bar.height > 20 && bar.top >= 0 && bar.bottom <= vh + 1),
      startInsidePanel: !!(start && panel && start.bottom <= panel.bottom + 1 && start.top >= panel.top - 1)
    };
  });
}

test('1024 with 6 seated keeps Start above the fold', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'home-party', surface: 'home'});
  const fold = await startFold(page);
  expect(fold.startOnScreen, 'Start sits below the 1024 fold with 6 seated').toBe(true);
  expect(fold.barOnScreen, 'Start bar sits below the 1024 fold').toBe(true);
  expect(fold.startInsidePanel, 'Start left the picker panel').toBe(true);
});

async function openDemoHome(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('bpg_try_demo_tip', '1'); } catch (error) {}
  });
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
  await page.waitForSelector('#home-screen:not(.hidden)');
}

test('1440 and 1280 keep Start on screen without clipping Tonight\'s Table', async ({page}) => {
  for (const size of [{width: 1440, height: 900}, {width: 1280, height: 800}]) {
    await page.setViewportSize(size);
    await openDemoHome(page);
    await page.evaluate(() => {
      currentGame = null;
      if (typeof saveData === 'function') saveData();
      if (typeof goHome === 'function') goHome();
      if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
    });
    for (const count of [0, 4, 8, 9]) {
      await page.evaluate((n) => {
        const names = (typeof allPlayers !== 'undefined' && allPlayers ? allPlayers : []).slice();
        players = names.slice(0, n);
        if (typeof saveData === 'function') saveData();
        if (typeof goHome === 'function') goHome();
        if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
      }, count);
      const layout = await page.evaluate(() => {
        const table = document.querySelector('.s2-home-table');
        const start = document.querySelector('.s2-home-start');
        const btn = document.querySelector('#slice2-start-btn');
        const add = table?.querySelector('.s2-add .s2-btn');
        const title = table?.querySelector('h2');
        const cards = [...document.querySelectorAll('.s2-home-start .s2-card-frame')].map((node) => node.getBoundingClientRect());
        const overflow = (el) => !el || el.scrollHeight <= el.clientHeight + 1;
        const box = btn?.getBoundingClientRect();
        const inView = (el) => {
          const b = el?.getBoundingClientRect();
          return !!(b && b.height > 8 && b.bottom <= (table?.getBoundingClientRect().bottom || 0) + 1);
        };
        return {
          startOnScreen: !!(box && box.height > 20 && box.top >= 0 && box.bottom <= window.innerHeight + 1),
          startBtnBottom: box ? Math.round(box.bottom) : null,
          tableOpen: overflow(table),
          startOpen: overflow(start),
          titleInTable: inView(title),
          addInTable: inView(add),
          seatScroll: table ? getComputedStyle(table.querySelector('.s2-seat-grid')).overflowY : '',
          cardMaxW: cards.length ? Math.max(...cards.map((c) => c.width)) : 0,
          cardCount: cards.length,
          bannerOn: !!(document.querySelector('.s2-banner')?.getBoundingClientRect().height > 20)
        };
      });
      expect(layout.startOnScreen, `${size.width} ${count}p Start below the fold at ${layout.startBtnBottom}`).toBe(true);
      expect(layout.tableOpen, `${size.width} ${count}p Tonight's Table clipped`).toBe(true);
      expect(layout.startOpen, `${size.width} ${count}p Start panel clipped`).toBe(true);
      expect(layout.titleInTable, `${size.width} ${count}p table title clipped`).toBe(true);
      expect(layout.addInTable, `${size.width} ${count}p Add Player clipped`).toBe(true);
      expect(['visible', 'auto']).toContain(layout.seatScroll);
      expect(layout.cardCount, `${size.width} missing cards`).toBe(6);
      expect(layout.cardMaxW, `${size.width} cards oversized`).toBeLessThanOrEqual(420);
      expect(layout.cardMaxW, `${size.width} cards collapsed`).toBeGreaterThan(40);
    }
  }
});

test('phone wordmark stays readable and nav stays one row at 390 and 375', async ({page}) => {
  for (const size of [{width: 390, height: 844}, {width: 375, height: 667}]) {
    await page.setViewportSize(size);
    await openDemoHome(page);
    const chrome = await page.evaluate(() => {
      const mark = document.querySelector('#top-nav .bp-brand-wordmark')?.getBoundingClientRect();
      const nav = document.querySelector('#top-nav');
      const row = nav?.getBoundingClientRect();
      const buttons = [...(nav?.querySelectorAll('.nav-btn, a.nav-btn, button.nav-btn') || [])]
        .filter((el) => el.offsetParent && getComputedStyle(el).display !== 'none')
        .map((el) => el.getBoundingClientRect());
      const tops = buttons.map((box) => Math.round(box.top));
      return {
        markW: mark ? mark.width : 0,
        markH: mark ? mark.height : 0,
        navH: row ? row.height : 0,
        buttonH: buttons.length ? Math.max(...buttons.map((box) => box.height)) : 0,
        oneRow: tops.length ? Math.max(...tops) - Math.min(...tops) <= 8 : false
      };
    });
    expect(chrome.markW, `${size.width} wordmark ${chrome.markW}px`).toBeGreaterThanOrEqual(108);
    expect(chrome.markW, `${size.width} wordmark too wide ${chrome.markW}px`).toBeLessThanOrEqual(140);
    expect(chrome.oneRow, `${size.width} nav wrapped`).toBe(true);
    expect(chrome.buttonH, `${size.width} home label wrapped ${chrome.buttonH}`).toBeLessThanOrEqual(48);
    expect(chrome.navH, `${size.width} nav height ${chrome.navH}`).toBeLessThanOrEqual(120);
  }
});

test('Heat and Five Crowns load the default 5:7 faces', async ({page}) => {
  await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#home-screen')).toBeVisible();
  const defaults = await page.locator('.s2-home-start .s2-card-photo').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')));
  expect(defaults).toEqual(expect.arrayContaining([
    './assets/cards/beat-the-heat.webp',
    './assets/cards/five-crowns.webp',
    './assets/cards/wizard.webp',
    './assets/cards/canasta.webp'
  ]));
  expect(defaults).not.toEqual(expect.arrayContaining(['./assets/cards/rook.webp']));
  expect(defaults.some((src) => src && src.includes('/fill/'))).toBe(false);
});

test('clean first start explains what to tap and writes no sample data', async ({page}) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-empty-table')).toContainText(/Add a name to seat tonight's table/);
  await expect(page.locator('#slice2-home')).toContainText(/Add players, pick a game, then tap Start/);
  await expect(page.locator('#slice2-home')).not.toContainText(/Try a sample night/i);
  await expect(page.locator('#slice2-start-btn')).toBeVisible();
  const stored = await page.evaluate(() => ({
    history: localStorage.getItem('gn_history'),
    current: localStorage.getItem('gn_current'),
    flag: localStorage.getItem('gn_demo_seeded')
  }));
  expect(stored.history == null || stored.history === '[]').toBeTruthy();
  expect(stored.current == null || stored.current === 'null').toBeTruthy();
  expect(stored.flag).toBeNull();
});

test('Saved chip stays inside Tonight\'s Table at 1440, 1024, and 390', async ({page}) => {
  for (const size of [{width: 1440, height: 900}, {width: 1024, height: 768}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'empty-home', surface: 'home'});
    const fit = await page.evaluate(() => {
      const chip = document.getElementById('save-indicator');
      const card = document.querySelector('#slice2-home .s2-home-table');
      if (!chip || !card) return {ok: false};
      const chipBox = chip.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      return {
        ok: true,
        inside: chipBox.left >= cardBox.left + 8 && chipBox.right <= cardBox.right - 8 &&
          chipBox.top >= cardBox.top + 4 && chipBox.bottom <= cardBox.bottom - 4,
        text: (chip.textContent || '').replace(/\s+/g, ' ').trim()
      };
    });
    expect(fit.ok, `${size.width} missing Saved chip`).toBe(true);
    expect(fit.inside, `${size.width} Saved chip overflow`).toBe(true);
    expect(fit.text).toMatch(/Saved on this device/i);
  }
});
