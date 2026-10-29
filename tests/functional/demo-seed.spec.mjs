import {expect, test} from '@playwright/test';
import {DEMO_VIEW_IDS} from '../../public/assets/demo-seed.mjs';
import {openTestView} from '../helpers/inject-book.mjs';

async function openDemo(page, view, {extra} = {}) {
  await openTestView(page, view, {game: extra?.game});
}

function hidden(page, id) {
  return page.locator(`#${id}`);
}

const VIEW_ASSERT = {
  home: async (page) => {
    await expect(hidden(page, 'home-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-home')).toContainText(/Tonight's Table/);
    await expect(page.locator('#slice2-home')).toContainText(/Start a New Match/);
    await expect(page.locator('#slice2-home')).toContainText(/Recent nights/);
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
    await expect(page.locator('#hf-rate-bar')).toBeHidden();
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
    await expect(page.locator('#wheel-mode-label')).toHaveText('Life Preserver Unlocked');
    await expect(page.locator('#wheel-result-adjustment')).toContainText('+20 points');
    await expect(page.locator('#wheel-result-total')).toContainText('41 → 61');
    await expect(page.locator('#wheel-result-standing')).toContainText('3rd → 2nd');
    await expect(page.locator('#wheel-legend')).toBeVisible();
    const painted = await page.evaluate(() => {
      const canvas = document.getElementById('wheel-canvas');
      const context = canvas.getContext('2d');
      const {data} = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a > 200 && (g > r + 20 || r > g + 20 || (r > 140 && g < 180 && b < 180))) return true;
      }
      return false;
    });
    expect(painted).toBe(true);
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
    await expect(page.locator('.s2-fame-col')).toContainText(/Career wins|Five Crowns|Unassisted matches only/);
  },
  'records-overview': async (page) => {
    await expect(hidden(page, 'history-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-show-fame')).toHaveClass(/is-on/);
    await expect(page.locator('.s2-fame-col')).toContainText(/Career wins|Unassisted matches only/);
  },
  'records-explore': async (page) => {
    await expect(hidden(page, 'history-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-show-shame')).toHaveClass(/is-on/);
    await expect(page.locator('.s2-explore-col')).toContainText(/Explore records|Most games without a win|Most consecutive last-place finishes/);
  },
  'records-nights': async (page) => {
    await expect(hidden(page, 'history-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-show-nights')).toHaveClass(/is-on/);
    await expect(page.locator('.s2-night-card.is-incomplete')).toContainText(/Incomplete/);
    await expect(page.locator('.s2-night-winner', {hasText: / and /}).first()).toBeVisible();
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
  },
  game: async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board, #game-screen')).toContainText(/Five Crowns|Wizard|818|Flip 7|Beat the Heat|Rook|Hand and Foot/);
  },
  'bids-wizard': async (page) => {
    await expect(hidden(page, 'score-entry-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#score-entry-modal')).toContainText(/Wizard|Bid|bid/i);
    await expect(page.locator('#hf-rate-bar')).toBeHidden();
  },
  'podium-tie': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#scorecard-body, #slice2-board')).toContainText(/4th|T4|tied|Matt|Megan/i);
  },
  'past-night': async (page) => {
    await expect(hidden(page, 'scorecard-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#scorecard-modal button').first()).toBeVisible();
  },
  'add-player-m': async (page) => {
    await expect(hidden(page, 'add-player-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#midgame-add-player-input')).toHaveValue('m');
    const names = await page.locator('#midgame-player-suggestions .player-name-label').allTextContents();
    expect(names.map((name) => name.trim())).toEqual(['Michelle']);
  },
  'demo-path': async (page) => {
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#slice2-board-line')).toContainText(/Five Crowns/);
    await expect(page.locator('#scorecard-body')).toContainText('June');
    await expect(page.locator('#scorecard-body')).toContainText('Theo');
  }
};

test.describe('test-only fixture views', () => {
  test('every listed view id has an assertion', () => {
    const missing = DEMO_VIEW_IDS.filter((id) => !VIEW_ASSERT[id]);
    expect(missing, `untested view ids: ${missing.join(', ')}`).toEqual([]);
  });

  for (const view of DEMO_VIEW_IDS) {
    test(`preview host opens ${view}`, async ({page}) => {
      test.setTimeout(45000);
      await openDemo(page, view);
      await expect(page.locator('body')).toHaveAttribute('data-gn-test-view', view);
      await expect.poll(() => page.url()).not.toMatch(/[?&]demo=/);
      await VIEW_ASSERT[view](page);
    });
  }

  for (const [game, label] of [
    ['five-crowns', /Five Crowns/],
    ['818', /818/],
    ['wizard', /Wizard/],
    ['flip7', /Flip 7/],
    ['beat-the-heat', /Beat the Heat/],
    ['hand-and-foot', /Canasta/]
  ]) {
    test(`preview host opens view=game&game=${game}`, async ({page}) => {
      test.setTimeout(45000);
      await openDemo(page, 'game', {extra: {game}});
      await expect(page.locator('body')).toHaveAttribute('data-gn-test-view', 'game');
      await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
      await expect(page.locator('#slice2-board, #game-screen')).toContainText(label);
    });
  }

  test('preview host opens view=game&game=hand-and-foot as in-progress Canasta', async ({page}) => {
    test.setTimeout(45000);
    await openDemo(page, 'game', {extra: {game: 'hand-and-foot'}});
    await expect(page.locator('body')).toHaveAttribute('data-gn-test-view', 'game');
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#game-screen')).toHaveAttribute('data-game', 'Hand and Foot');
    await expect(page.locator('#slice2-board, #game-screen')).toContainText(/Canasta/);
    await expect(page.locator('#scorecard-body')).toContainText('3695');
    await expect(page.locator('#scorecard-body')).toContainText(/Megan|Matt/);
    const live = await page.evaluate(() => (typeof window.BPGDemoLiveGame === 'function' && window.BPGDemoLiveGame()) || null);
    expect(live?.name).toBe('Hand and Foot');
    expect(live?.rounds).toHaveLength(2);
    expect(live?.handFoot?.sides).toHaveLength(2);
    expect(live?.rounds[0]?.handFootParts?.Megan?.sevensCanastas).toBe(1);
    expect(live?.rounds[0]?.handFootParts?.Megan?.redThrees).toBe(4);
  });

  test('preview host opens view=game&game=rook&games=rook', async ({page}) => {
    test.setTimeout(45000);
    await openDemo(page, 'game', {extra: {game: 'rook'}});
    await expect(page.locator('body')).toHaveAttribute('data-gn-test-view', 'game');
    await expect(hidden(page, 'game-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#rook-bid-amount-input')).toBeVisible();
  });

  test('Rook stays off the demo picker without games=rook', async ({page}) => {
    test.setTimeout(45000);
    await openDemo(page, 'home');
    await expect(hidden(page, 'home-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"]')).toBeVisible();
    await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"]')).toHaveAttribute('aria-label', /Canasta/i);
    await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Rook"]')).toHaveCount(0);
  });

  test('?demo does nothing on a first-time book', async ({page}) => {
    await page.goto('/?demo&view=home&art=dusk&logo=dusk', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('body')).toHaveAttribute('data-gn-demo-ready', 'ignored');
    const stored = await page.evaluate(() => ({
      history: localStorage.getItem('gn_history'),
      current: localStorage.getItem('gn_current'),
      flag: localStorage.getItem('gn_demo_seeded'),
      art: document.documentElement.dataset.bpArt || '',
      logo: document.documentElement.dataset.bpLogo || ''
    }));
    expect(stored.history == null || stored.history === '[]').toBeTruthy();
    expect(stored.current == null || stored.current === 'null').toBeTruthy();
    expect(stored.flag).toBeNull();
    expect(stored.art).toBe('');
    expect(stored.logo).toBe('');
    await expect(page.locator('#slice2-home .s2-btn-primary', {hasText: 'Resume'})).toHaveCount(0);
    await expect(page.locator('#demo-seed-msg')).toHaveCount(0);
  });

  test('?demo does not overwrite a personal book', async ({page}) => {
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
    await page.goto('/?demo&view=home', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('body')).toHaveAttribute('data-gn-demo-ready', 'ignored');
    await expect(page.locator('#demo-seed-msg')).toHaveCount(0);
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('gn_history') || '[]'));
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(9);
    expect(await page.evaluate(() => localStorage.getItem('gn_demo_seeded'))).toBeNull();
  });
});
