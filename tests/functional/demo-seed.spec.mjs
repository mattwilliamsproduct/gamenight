import {expect, test} from '@playwright/test';
import {DEMO_VIEW_IDS} from '../../public/assets/demo-seed.mjs';

const PREVIEW = 'gamenight-git-cursor-relea-23a825-mattwilliamsproducts-projects.vercel.app';

async function openDemo(page, view, {host} = {}) {
  if (host) {
    await page.addInitScript((value) => {
      window.__GN_DEMO_HOST_OVERRIDE__ = value;
    }, host);
  }
  const path = view ? `/?demo&view=${encodeURIComponent(view)}` : '/?demo';
  await page.goto(path, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => !!document.body.dataset.gnDemoReady, null, {timeout: 20000});
}

function hidden(page, id) {
  return page.locator(`#${id}`);
}

const VIEW_ASSERT = {
  home: async (page) => {
    await expect(hidden(page, 'home-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-home .s2-btn-primary', {hasText: 'Resume'})).toBeVisible();
  },
  'active-match': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board, #scorecard-body')).toBeVisible();
  },
  'scorecard-fivecrowns': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board, #game-screen')).toContainText(/Five Crowns/);
  },
  'scorecard-wizard': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board, #game-screen')).toContainText(/Wizard/);
  },
  'scorecard-818': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board, #game-screen')).toContainText(/818/);
  },
  'scorecard-flip7': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board, #game-screen')).toContainText(/Flip 7/);
  },
  'scorecard-beattheheat': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board, #game-screen')).toContainText(/Beat the Heat/);
  },
  'scorecard-rook': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#rook-bid-amount-input')).toBeVisible();
  },
  'entry-fivecrowns': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
  },
  'entry-wizard': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
  },
  'entry-818': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
  },
  'entry-flip7': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
  },
  'entry-beattheheat': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
  },
  'entry-rook': async (page) => {
    await expect(hidden(page, 'rook-results-modal')).not.toHaveClass(/hidden/);
  },
  'keypad-8p': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#score-entry-rows .score-entry-row')).toHaveCount(8);
  },
  lifepreserver: async (page) => {
    await expect(hidden(page, 'wheel-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#btn-spin')).toBeEnabled();
  },
  'lifepreserver-after': async (page) => {
    await expect(hidden(page, 'wheel-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#wheel-result')).not.toHaveClass(/hidden/);
    await expect(page.locator('#btn-spin')).toBeHidden();
  },
  'lifepreserver-low': async (page) => {
    await expect(hidden(page, 'wheel-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#wheel-player-name')).toHaveText('Linda');
    await expect(page.locator('#btn-spin')).toBeEnabled();
    await expect(page.locator('#wheel-commit-line')).toContainText(/Best help:|Largest setback:/);
  },
  records: async (page) => {
    await expect(hidden(page, 'history-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-show-fame')).toHaveClass(/is-on/);
    await expect(page.locator('.s2-fame-col')).toContainText(/Most wins|Five Crowns|Unassisted matches only/);
  },
  'records-shame': async (page) => {
    await expect(hidden(page, 'history-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-show-shame')).toHaveClass(/is-on/);
  },
  'rook-contract': async (page) => {
    await expect(page.locator('#rook-bid-amount-input')).toBeVisible();
  },
  'rook-call': async (page) => {
    await expect(hidden(page, 'rook-call-modal')).not.toHaveClass(/hidden/);
  },
  settings: async (page) => {
    await expect(hidden(page, 'settings-modal')).not.toHaveClass(/hidden/);
  },
  'settings-backup': async (page) => {
    await expect(hidden(page, 'settings-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#backup-device-summary')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Backup'})).toBeVisible();
  },
  history: async (page) => {
    await expect(hidden(page, 'history-list-view')).not.toHaveClass(/hidden/);
    await expect(page.locator('#history-list-view')).toContainText(/Rook|818|Five Crowns/);
  },
  profiles: async (page) => {
    await expect(hidden(page, 'profiles-screen')).not.toHaveClass(/hidden/);
  },
  'empty-home': async (page) => {
    await expect(hidden(page, 'home-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-home .s2-btn-primary', {hasText: 'Resume'})).toHaveCount(0);
  },
  'empty-records': async (page) => {
    await expect(hidden(page, 'history-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#hall-of-fame-view, .s2-ledger')).toContainText(/No infamous nights yet|Hall of Fame|Shame/);
  },
  'error-entry': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#score-entry-error')).toHaveClass(/is-on/);
    await expect(page.locator('#score-entry-error')).toContainText(/0 or more/);
  }
};

test.describe('TEMP demo seed views', () => {
  test('every listed view id has an assertion', () => {
    const missing = DEMO_VIEW_IDS.filter((id) => !VIEW_ASSERT[id]);
    expect(missing, `untested view ids: ${missing.join(', ')}`).toEqual([]);
  });

  for (const view of DEMO_VIEW_IDS) {
    test(`preview host opens ${view}`, async ({page}) => {
      test.setTimeout(45000);
      await openDemo(page, view, {host: PREVIEW});
      await expect(page.locator('body')).toHaveAttribute('data-gn-demo-ready', /seeded|empty/);
      await expect(page.locator('body')).toHaveAttribute('data-gn-demo-view', view);
      await expect.poll(() => page.url()).not.toMatch(/[?&]demo=/);
      await expect.poll(() => page.url()).not.toMatch(/[?&]view=/);
      await VIEW_ASSERT[view](page);
    });
  }

  test('cardknight.vercel.app ignores ?demo and writes nothing', async ({page}) => {
    await openDemo(page, 'home', {host: 'cardknight.vercel.app'});
    await expect(page.locator('body')).toHaveAttribute('data-gn-demo-ready', 'ignored');
    const stored = await page.evaluate(() => ({
      history: localStorage.getItem('gn_history'),
      current: localStorage.getItem('gn_current'),
      flag: localStorage.getItem('gn_demo_seeded')
    }));
    expect(stored.history == null || stored.history === '[]').toBeTruthy();
    expect(stored.current == null || stored.current === 'null').toBeTruthy();
    expect(stored.flag).toBeNull();
    await expect(page.locator('#slice2-home .s2-btn-primary', {hasText: 'Resume'})).toHaveCount(0);
    await expect(page.locator('#demo-seed-msg')).toHaveCount(0);
  });

  test('real history is not overwritten', async ({page}) => {
    await page.addInitScript(() => {
      localStorage.setItem('gn_history', JSON.stringify([{
        id: 9,
        game: 'Wizard',
        date: '1/1/2026',
        totals: {Matt: 10},
        winners: ['Matt'],
        rounds: [],
        originalRoster: ['Matt']
      }]));
    });
    await openDemo(page, 'home');
    await expect(page.locator('body')).toHaveAttribute('data-gn-demo-ready', 'blocked');
    await expect(page.locator('#demo-seed-msg')).toHaveText('This device already has history. Demo data was not loaded.');
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('gn_history') || '[]'));
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(9);
    expect(await page.evaluate(() => localStorage.getItem('gn_demo_seeded'))).toBeNull();
  });
});
