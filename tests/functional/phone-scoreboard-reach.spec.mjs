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
    const end = document.querySelector('#slice2-board-bar .match-end-btn');
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
        buttonOf(document.getElementById('slice2-enter-btn')),
        buttonOf(document.getElementById('actions-btn')),
        buttonOf(end)
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

test('phone scoreboard keeps Home, Enter Score, Actions, and Save & End on one row', async ({page}) => {
  for (const size of [{width: 390, height: 844}, {width: 390, height: 700}, {width: 375, height: 667}]) {
    await page.setViewportSize(size);
    await openDemoBoard(page);
    const state = await boardState(page);
    const tops = state.controls.map((control) => control.top);
    expect(Math.max(...tops) - Math.min(...tops), `${size.width}x${size.height} header wraps`).toBeLessThanOrEqual(4);
    expect(state.controls[0].text, 'phone back control').toBe('Home');
    expect(state.controls[0].text, 'phone back control still says Table').not.toMatch(/Table/);
    expect(state.controls[1].text).toBe('Enter Score');
    expect(state.controls[2].text).toMatch(/^Actions/);
    expect(state.controls[3].text).toMatch(/Save & End/);
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
    expect(state.nav.text).toMatch(/Profiles/);
    expect(state.nav.gear, 'settings gear dropped').toBe(true);
    expect(state.last?.text).toMatch(/Marco/);
    expect(state.last?.inWrap, `${size.width}x${size.height} last seat not in the scrollport`).toBe(true);
    expect(state.last?.inView, `${size.width}x${size.height} last seat stays off screen`).toBe(true);
  }
});

test('laptop and iPad scoreboard keep the Table label and the long enter label', async ({page}) => {
  for (const size of [{width: 768, height: 1024}, {width: 1024, height: 768}, {width: 1440, height: 900}]) {
    await page.setViewportSize(size);
    await openDemoBoard(page);
    await expect(page.locator('#slice2-table-btn')).toHaveText('← Table');
    await expect(page.locator('#slice2-enter-btn')).toHaveText(/Enter Round \d+ Scores/);
    await expect(page.locator('#top-nav')).toBeHidden();
  }
});
