import {expect, test} from '@playwright/test';
import {openScoreEntry, silencePorchPrompts, submitEntry, typeRound} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers: 'block'});

async function openCanastaCard(page) {
  await page.goto('/?gnqa=1&gallery=0&scenario=canasta-house-round', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true' && typeof renderGame === 'function');
  await page.evaluate(() => {
    const base = currentGame.rounds[0];
    currentGame.rounds = [1, 2, 3, 4].map((round) => {
      const next = JSON.parse(JSON.stringify(base));
      next.round = round;
      return next;
    });
    currentGame.currentRound = 5;
    currentGame.maxRounds = 4;
    renderGame();
  });
  await expect(page.locator('#scorecard-capture thead th.scorecard-round-th').filter({hasText: 'R4'})).toBeVisible();
}

test('Actions names the wheel Back Porch Wheel', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.getByRole('button', {name: /Actions/}).click();
  const item = page.locator('#actions-life-preserver-btn');
  await expect(item).toBeVisible();
  await expect(item.locator('.actions-menu-label-text')).toHaveText('Back Porch Wheel');
  await expect(page.locator('#actions-menu')).not.toContainText('Life Preserver');
});

test('1024 Canasta meld labels stay in their own columns and R4 stays on the card', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openCanastaCard(page);
  const boxes = await page.evaluate(() => {
    const card = document.getElementById('scorecard-capture').getBoundingClientRect();
    const headers = [...document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th')].map((th) => ({
      text: th.innerText.replace(/\s+/g, ' ').trim(),
      left: th.getBoundingClientRect().left,
      right: th.getBoundingClientRect().right
    }));
    return {cardRight: card.right, cardLeft: card.left, headers};
  });
  const meld110 = boxes.headers.find((header) => /110/.test(header.text));
  const meld150 = boxes.headers.find((header) => /150/.test(header.text));
  expect(meld110, JSON.stringify(boxes.headers)).toBeTruthy();
  expect(meld150, JSON.stringify(boxes.headers)).toBeTruthy();
  expect(meld110.right).toBeLessThanOrEqual(meld150.left + 1);
  expect(meld150.right).toBeLessThanOrEqual(boxes.cardRight + 1);
  expect(meld150.left).toBeGreaterThanOrEqual(boxes.cardLeft);
});

test('a phone lead toast stays off R3 and R4 and agrees with the leader', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openCanastaCard(page);
  const copy = await page.evaluate(() => ({
    one: leadChangeCopy(['Ava']),
    pair: leadChangeCopy(['Ava', 'Ben']),
    team: leadChangeCopy(['Ann & Bo'])
  }));
  expect(copy.one).toBe('👑 Ava takes the lead!');
  expect(copy.pair).toBe('👑 Ava and Ben take the lead!');
  expect(copy.team).toBe('👑 Ann & Bo take the lead!');
  await page.evaluate(() => toast(leadChangeCopy(['Ann & Bo']), 'success'));
  await expect(page.locator('#toast-container .toast')).toContainText('Ann & Bo take the lead!');
  const boxes = await page.evaluate(() => {
    const toastBox = document.querySelector('#toast-container .toast').getBoundingClientRect();
    const rounds = [...document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th')]
      .filter((el) => getComputedStyle(el).display !== 'none');
    const edge = (el) => el && el.getBoundingClientRect();
    const r3 = edge(rounds[2]);
    const r4 = edge(rounds[3]);
    const container = document.getElementById('toast-container');
    const style = getComputedStyle(container);
    return {
      toastRight: toastBox.right,
      r3Left: r3 && r3.left,
      r4Left: r4 && r4.left,
      width: window.innerWidth,
      matchClass: document.body.className,
      gameHidden: document.getElementById('game-screen')?.className || '',
      parked: container.className,
      container: {left: style.left, right: style.right, width: style.width, maxWidth: style.maxWidth, transform: style.transform},
      rounds: rounds.map((el) => el.innerText.replace(/\s+/g, ' ').trim())
    };
  });
  expect(boxes.r3Left, JSON.stringify(boxes)).toBeGreaterThan(0);
  expect(boxes.toastRight, JSON.stringify(boxes)).toBeLessThanOrEqual(boxes.r3Left + 1);
  expect(boxes.toastRight, JSON.stringify(boxes)).toBeLessThanOrEqual(boxes.r4Left + 1);
  const clearance = await page.evaluate(() => {
    const toastBox = document.querySelector('#toast-container .toast').getBoundingClientRect();
    const card = document.getElementById('scorecard-capture').getBoundingClientRect();
    const nav = document.getElementById('top-nav');
    const navBox = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : null;
    return {
      toastBottom: toastBox.bottom,
      toastLeft: toastBox.left,
      toastRight: toastBox.right,
      cardLeft: card.left,
      cardRight: card.right,
      navTop: navBox && navBox.height > 8 ? navBox.top : null
    };
  });
  expect(clearance.toastLeft, JSON.stringify(clearance)).toBeGreaterThanOrEqual(clearance.cardLeft - 1);
  expect(clearance.toastRight, JSON.stringify(clearance)).toBeLessThanOrEqual(clearance.cardRight + 1);
  if (clearance.navTop != null) expect(clearance.toastBottom, JSON.stringify(clearance)).toBeLessThanOrEqual(clearance.navTop + 1);
});

test('a 1024 lead toast stays inside the scorecard', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openCanastaCard(page);
  await page.evaluate(() => toast(leadChangeCopy(['Ann', 'Bo']), 'success'));
  await expect(page.locator('#toast-container .toast')).toContainText('Ann and Bo take the lead!');
  const boxes = await page.evaluate(() => {
    const toastBox = document.querySelector('#toast-container .toast').getBoundingClientRect();
    const card = document.getElementById('scorecard-capture').getBoundingClientRect();
    return {
      toastLeft: toastBox.left,
      toastRight: toastBox.right,
      cardLeft: card.left,
      cardRight: card.right
    };
  });
  expect(boxes.toastLeft, JSON.stringify(boxes)).toBeGreaterThanOrEqual(boxes.cardLeft - 1);
  expect(boxes.toastRight, JSON.stringify(boxes)).toBeLessThanOrEqual(boxes.cardRight + 1);
  expect(boxes.cardRight - boxes.toastRight, JSON.stringify(boxes)).toBeGreaterThanOrEqual(4);
});

test('the phone correction sheet gives was and now the row width', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof openRoundCorrection === 'function');
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    currentGame = {
      id: 8602,
      name: 'Wizard',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 10,
      rounds: [{
        round: 1,
        bids: {Ava: 1, Ben: 0},
        actuals: {Ava: 1, Ben: 0},
        scores: {Ava: 30, Ben: 20}
      }],
      totals: {Ava: 30, Ben: 20},
      retired: []
    };
    openRoundCorrection({source: 'live', roundIndex: 0, focusPlayer: 'Ava'});
  });
  await page.waitForFunction(() => {
    const modal = document.getElementById('round-correction-modal');
    return modal && !modal.classList.contains('hidden') && parseFloat(getComputedStyle(modal).opacity) > 0.9;
  });
  const widths = await page.locator('.round-correction-delta').first().evaluate((el) => {
    const label = el.closest('.player-name-label').getBoundingClientRect();
    const row = el.closest('.round-correction-row').getBoundingClientRect();
    return {label: label.width, row: row.width, scroll: el.scrollWidth, client: el.clientWidth};
  });
  expect(widths.label).toBeGreaterThan(widths.row * 0.85);
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
});

test('a real Canasta score entry toasts the team that passed the leader', async ({page}) => {
  test.setTimeout(60000);
  await silencePorchPrompts(page);
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/?gnqa=1&gallery=0&scenario=canasta-house-round&surface=scorecard', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  const before = await page.evaluate(() => ({
    leaders: currentLeaders(currentGame, getHandFootColumns(currentGame)),
    megan: currentGame.totals['Megan'],
    cat: currentGame.totals['Cat']
  }));
  expect(before.leaders).toEqual(['Megan & Matt']);
  expect(before.megan).toBeGreaterThan(before.cat);
  await openScoreEntry(page);
  await typeRound(page, [
    {basic: '0', count: '0', cardsLeft: '0'},
    {basic: '2800', count: '0', cardsLeft: '0'}
  ]);
  await submitEntry(page);
  const toast = page.locator('#toast-container .toast');
  await expect(toast).toContainText('Cat & Mike take the lead!');
  await expect(toast).not.toContainText('Ann');
  const after = await page.evaluate(() => ({
    leaders: currentLeaders(currentGame, getHandFootColumns(currentGame)),
    megan: currentGame.totals['Megan'],
    cat: currentGame.totals['Cat'],
    board: [...document.querySelectorAll('#scorecard-capture .hf-team-name')].map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()).join(' | ')
  }));
  expect(after.leaders).toEqual(['Cat & Mike']);
  expect(after.cat).toBeGreaterThan(after.megan);
  expect(after.board).toContain('Cat');
  expect(after.board).toContain('Mike');
  expect(after.board).not.toContain('Ann');
});

test('Canasta event stats show on Overview, Passports, and a phone', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/?gnqa=1&gallery=0&scenario=records-book&surface=records', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  const overview = page.locator('[data-canasta-events="overview"]');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('Got the 22');
  await expect(overview).toContainText('Went out');
  await expect(overview).toContainText('Cards left');
  await page.evaluate(() => showProfiles());
  const card = page.locator('[data-canasta-events="passport"]').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Got the 22');
  await expect(card).toContainText('Went out');
  await expect(card).toContainText('Cards left');
  await card.click();
  const open = page.locator('[data-canasta-events="passport-open"]');
  await expect(open).toHaveCount(3);
  await expect(open.nth(0)).toContainText('Got the 22');
  await expect(open.nth(1)).toContainText('Went out');
  await expect(open.nth(2)).toContainText('Cards left');
});
