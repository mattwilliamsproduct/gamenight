import {expect, test} from '@playwright/test';

async function openDemoBoard(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('bpg_try_demo_tip', '1'); } catch (error) {}
  });
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await page.waitForSelector('#scorecard-body tr');
}

async function boardState(page) {
  return page.evaluate(() => {
    const viewBottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height
      : window.innerHeight;
    const buttonOf = (el) => {
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        height: box.height,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    };
    const nav = document.getElementById('top-nav');
    const navBox = nav.getBoundingClientRect();
    const navStyle = getComputedStyle(nav);
    const wrap = document.querySelector('#scorecard-capture .scorecard-table-wrap');
    const last = document.querySelector('#scorecard-body tr:last-child .scoreboard-player-name');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
    const lastBox = last?.getBoundingClientRect();
    const wrapBox = wrap?.getBoundingClientRect();
    const gear = [...document.querySelectorAll('#top-nav .nav-btn')].find((el) => (el.getAttribute('title') || '') === 'Settings' || (el.textContent || '').includes('⚙'));
    return {
      width: window.innerWidth,
      viewBottom,
      controls: [
        buttonOf(document.getElementById('slice2-table-btn')),
        buttonOf(document.getElementById('actions-btn')),
        buttonOf(document.getElementById('slice2-enter-btn'))
      ],
      nav: {
        display: navStyle.display,
        top: navBox.top,
        bottom: navBox.bottom,
        height: navBox.height,
        text: (nav.innerText || '').replace(/\s+/g, ' ').trim(),
        gear: !!gear && getComputedStyle(gear).display !== 'none'
      },
      last: lastBox ? {
        text: (last.textContent || '').replace(/\s+/g, ' ').trim(),
        top: lastBox.top,
        bottom: lastBox.bottom,
        inWrap: !!wrapBox && lastBox.top >= wrapBox.top - 2 && lastBox.bottom <= wrapBox.bottom + 2,
        inView: lastBox.top >= -1 && lastBox.bottom <= viewBottom + 1
      } : null
    };
  });
}

test('phone home nav says Player Passports and Settings', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&surface=home', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  const nav = await page.evaluate(() => {
    return [...document.querySelectorAll('#top-nav .nav-btn')].filter((el) => {
      const box = el.getBoundingClientRect();
      return getComputedStyle(el).display !== 'none' && box.width > 0 && box.height > 0;
    }).map((el) => {
      const box = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        left: box.left,
        right: box.right,
        top: box.top
      };
    });
  });
  const labels = nav.map((button) => button.text);
  expect(labels).toContain('Player Passports');
  expect(labels).toContain('Settings');
  expect(labels.join(' ')).not.toMatch(/Profiles|⚙/);
  const tops = nav.map((button) => button.top);
  expect(Math.max(...tops) - Math.min(...tops), JSON.stringify(nav)).toBeLessThanOrEqual(4);
  const brand = await page.evaluate(() => {
    const mark = document.querySelector('#top-nav .bp-brand');
    const home = [...document.querySelectorAll('#top-nav .nav-btn')].find((el) => (el.textContent || '').trim() === 'Home');
    const markBox = mark.getBoundingClientRect();
    const homeBox = home.getBoundingClientRect();
    return {markRight: markBox.right, markBottom: markBox.bottom, homeLeft: homeBox.left, homeTop: homeBox.top};
  });
  const clear = brand.homeLeft >= brand.markRight - 1 || brand.homeTop >= brand.markBottom - 2;
  expect(clear, `Home covers the wordmark ${JSON.stringify(brand)}`).toBe(true);
  nav.forEach((button) => {
    expect(button.left, button.text).toBeGreaterThanOrEqual(-1);
    expect(button.right, `${button.text} past the phone`).toBeLessThanOrEqual(391);
  });
});

test('phone scoreboard keeps Home, Actions, and Enter Scores on one row', async ({page}) => {
  for (const size of [{width: 390, height: 844}, {width: 390, height: 700}, {width: 375, height: 667}]) {
    await page.setViewportSize(size);
    await openDemoBoard(page);
    const state = await boardState(page);
    const tops = state.controls.map((control) => control.top);
    expect(Math.max(...tops) - Math.min(...tops), `${size.width}x${size.height} header wraps`).toBeLessThanOrEqual(4);
    expect(state.controls[0].text, 'phone back control').toBe('Home');
    expect(state.controls[0].text, 'phone back control still says Table').not.toMatch(/Table/);
    expect(state.controls[1].text).toMatch(/^Actions/);
    expect(state.controls[2].text).toBe('Enter Scores');
    state.controls.forEach((control) => {
      expect(control.height, control.text).toBeGreaterThanOrEqual(44);
      expect(control.scrollWidth, `${control.text} truncated`).toBeLessThanOrEqual(control.clientWidth + 2);
      expect(control.left, control.text).toBeGreaterThanOrEqual(-1);
      expect(control.right, control.text).toBeLessThanOrEqual(size.width + 1);
    });
    for (let i = 1; i < state.controls.length; i += 1) {
      expect(state.controls[i].left, 'header controls overlap').toBeGreaterThanOrEqual(state.controls[i - 1].right - 1);
    }
    expect(state.nav.display, 'app nav hidden').not.toBe('none');
    expect(state.nav.bottom, 'nav below the visual viewport').toBeLessThanOrEqual(state.viewBottom + 1);
    expect(state.nav.top, 'nav is not on the bottom').toBeGreaterThan(size.height * 0.55);
    expect(state.nav.height, 'nav too short to tap').toBeGreaterThanOrEqual(44);
    expect(state.nav.text).toMatch(/Records/);
    expect(state.nav.text).toMatch(/Player Passports/);
    expect(state.nav.text).toMatch(/Settings/);
    expect(state.nav.text).not.toMatch(/Profiles/);
    expect(state.nav.gear, 'settings control dropped').toBe(true);
    const navButtons = await page.evaluate(() => [...document.querySelectorAll('#top-nav .nav-btn')].filter((el) => {
      const box = el.getBoundingClientRect();
      return getComputedStyle(el).display !== 'none' && box.width > 0;
    }).map((el) => {
      const box = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        left: box.left,
        right: box.right,
        width: box.width,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    }));
    const labels = navButtons.map((button) => button.text);
    expect(labels, `${size.width} nav labels`).toEqual(expect.arrayContaining(['Home', 'Records', 'Player Passports', 'Settings']));
    expect(labels.filter((text) => text !== 'Perf'), `${size.width} nav labels`).toEqual(['Home', 'Records', 'Player Passports', 'Settings']);
    const widths = navButtons.map((button) => button.width);
    expect(Math.max(...widths) - Math.min(...widths), `${size.width} nav widths ${JSON.stringify(navButtons)}`).toBeLessThanOrEqual(2);
    navButtons.forEach((button, index) => {
      expect(button.left, button.text).toBeGreaterThanOrEqual(-1);
      expect(button.right, `${button.text} past the phone`).toBeLessThanOrEqual(size.width + 1);
      expect(button.scrollWidth, `${button.text} clipped`).toBeLessThanOrEqual(button.clientWidth + 2);
      if (index > 0) {
        expect(button.left - navButtons[index - 1].right, `${navButtons[index - 1].text} touches ${button.text}`).toBeGreaterThanOrEqual(4);
      }
    });
    expect(state.last?.text).toMatch(/Marco/);
    expect(state.last?.inWrap, `${size.width}x${size.height} last seat not in the scrollport`).toBe(true);
    expect(state.last?.inView, `${size.width}x${size.height} last seat stays off screen`).toBe(true);
  }
});

test('laptop and iPad scoreboard say Home, Actions, then Enter Scores', async ({page}) => {
  for (const size of [{width: 768, height: 1024}, {width: 1024, height: 768}, {width: 1440, height: 900}]) {
    await page.setViewportSize(size);
    await openDemoBoard(page);
    await expect(page.locator('#slice2-table-btn')).toHaveText('Home');
    await expect(page.locator('#slice2-enter-btn')).toHaveText('Enter Scores');
    await expect(page.locator('#slice2-board-line')).toContainText(/Round \d+ of \d+/);
    await expect(page.locator('#actions-menu .match-end-btn')).toHaveCount(1);
    await expect(page.locator('#top-nav')).toBeHidden();
    const order = await page.evaluate(() => {
      const box = (id) => document.getElementById(id).getBoundingClientRect().left;
      return [box('slice2-table-btn'), box('actions-btn'), box('slice2-enter-btn')];
    });
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  }
});
