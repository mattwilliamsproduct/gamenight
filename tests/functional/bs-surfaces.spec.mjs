import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

async function openBoard(page, width, height) {
  await page.setViewportSize({width, height});
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await expect(page.locator('#scorecard-capture .wheel-badge').first()).toBeVisible();
}

function badgeBoxes() {
  const glyphBox = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const box = range.getBoundingClientRect();
    return box.width > 0 ? box : el.getBoundingClientRect();
  };
  const rows = [...document.querySelectorAll('#scorecard-capture .wheel-badge, .s2-standing .wheel-badge')];
  return rows.map((badge) => {
    const cell = badge.closest('td, .s2-standing');
    const name = cell && cell.querySelector('.scoreboard-player-name, .dealer-player-label, .s2-seat-name');
    const nameBox = glyphBox(name);
    const badgeBox = badge.getBoundingClientRect();
    const cellBox = cell.getBoundingClientRect();
    if (badgeBox.width < 2 || nameBox.width < 2) return null;
    const overlap = nameBox.right > badgeBox.left + 1 && nameBox.left < badgeBox.right - 1 && nameBox.bottom > badgeBox.top + 1 && nameBox.top < badgeBox.bottom - 1;
    return {
      name: (name.textContent || '').replace(/\s+/g, ' ').trim(),
      overlap,
      nameRight: nameBox.right,
      badgeLeft: badgeBox.left,
      badgeRight: badgeBox.right,
      cellRight: cellBox.right,
      clipped: name.scrollWidth > name.clientWidth + 1
    };
  }).filter(Boolean);
}

test('the wheel control stays to the right of Duke, Brick, and Linda', async ({page}) => {
  for (const size of [{width: 1024, height: 768}, {width: 390, height: 844}]) {
    await openBoard(page, size.width, size.height);
    const rows = await page.evaluate(badgeBoxes);
    const wanted = rows.filter((row) => ['Duke', 'Brick', 'Linda'].includes(row.name));
    expect([...new Set(wanted.map((row) => row.name))].sort(), JSON.stringify(rows)).toEqual(['Brick', 'Duke', 'Linda']);
    wanted.forEach((row) => {
      expect(row.overlap, JSON.stringify(row)).toBe(false);
      expect(row.clipped, JSON.stringify(row)).toBe(false);
      expect(row.badgeLeft, JSON.stringify(row)).toBeGreaterThanOrEqual(row.nameRight - 1);
      expect(row.cellRight - row.badgeRight, JSON.stringify(row)).toBeLessThanOrEqual(28);
    });
  }
});

test('a team comeback names both partners and Canasta', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/?gnqa=1&gallery=0&scenario=canasta-comeback&surface=records', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.locator('#slice2-show-shame').click();
  const comeback = page.locator('.s2-book-row').filter({hasText: 'Biggest single-game comeback'});
  await expect(comeback).toContainText('Cat and Mike');
  await expect(comeback).toContainText('Last at halfway, won Canasta');
  await expect(comeback).not.toContainText('Hand and Foot');
});

test('the passport Canasta line matches its siblings and stays one line', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/?gnqa=1&gallery=0&scenario=records-book&surface=records', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.evaluate(() => showProfiles());
  const card = page.locator('.profile-passport-card', {has: page.locator('[data-canasta-events="passport"]')}).first();
  await expect(card).toBeVisible();
  const fit = await card.evaluate((root) => {
    const line = root.querySelector('.profile-canasta-events');
    const sibling = root.querySelector('.profile-career-card');
    const lineSize = parseFloat(getComputedStyle(line).fontSize);
    const siblingSize = parseFloat(getComputedStyle(sibling).fontSize);
    return {
      lineSize,
      siblingSize,
      scroll: line.scrollWidth,
      client: line.clientWidth,
      wrap: line.scrollHeight > line.clientHeight + 1
    };
  });
  expect(fit.lineSize).toBe(fit.siblingSize);
  expect(fit.scroll).toBeLessThanOrEqual(fit.client + 1);
  expect(fit.wrap).toBe(false);
});

test('the Explore Wizard thumb paints the card face', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/?gnqa=1&gallery=0&scenario=records-book&surface=records', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.locator('#slice2-show-shame').click();
  const thumb = page.locator('.s2-explore-game-title', {hasText: 'Wizard'}).locator('img');
  await expect(thumb).toBeVisible();
  const ink = await thumb.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const width = Math.max(1, Math.round(box.width));
    const height = Math.max(1, Math.round(box.height));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(el, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    let inked = 0;
    for (let i = 0; i < data.length; i += 4) {
      const delta = Math.abs(data[i] - 246) + Math.abs(data[i + 1] - 241) + Math.abs(data[i + 2] - 231);
      if (delta > 40) inked += 1;
    }
    return {inked, pixels: width * height, naturalWidth: el.naturalWidth, width, height};
  });
  expect(ink.naturalWidth).toBeGreaterThan(100);
  expect(ink.width).toBeGreaterThan(20);
  expect(ink.height).toBeGreaterThan(20);
  expect(ink.inked, JSON.stringify(ink)).toBeGreaterThan(ink.pixels * 0.25);
});
