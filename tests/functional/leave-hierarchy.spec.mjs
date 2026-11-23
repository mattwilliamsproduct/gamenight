import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

// bpg2 Phase 2: Leave game and Scratch are one hierarchy. Fictional names only.
const FOUR = ['Hazel', 'Otis', 'Juniper', 'Rafael'];

async function boot(page) {
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  page.dialogs = [];
  page.dialogAnswer = true;
  page.on('dialog', (dialog) => { page.dialogs.push(dialog.message()); page.dialogAnswer ? dialog.accept() : dialog.dismiss(); });
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof navigateTo === 'function' && window.BPGScorebook);
}

test.afterEach(async ({page}) => {
  expect(page.pageErrors || []).toEqual([]);
});

async function liveGame(page, {name, roster, rounds, totals, maxRounds}) {
  await page.evaluate(({name, roster, rounds, totals, maxRounds}) => {
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    prefs.statMontage = false;
    currentGame = {
      id: null, name, originalRoster: roster.slice(), currentRound: rounds.length + 1, maxRounds,
      rounds, totals, hailMaryUsed: [], retired: [], currentScoreDrafts: {}, auditLog: [], winners: [], completed: false
    };
    BPGScorebook.ensureGameId(currentGame);
    saveData({fullPersist: true, syncCold: true});
    navigateTo('game-screen');
    if (window.BPGSlice2) BPGSlice2.refresh('game');
  }, {name, roster, rounds, totals, maxRounds});
  await expect(page.locator('#actions-btn')).toBeVisible();
}

const twoRounds = {
  name: 'Five Crowns', roster: FOUR, maxRounds: 11,
  rounds: [{round: 1, scores: {Hazel: 3, Otis: 10, Juniper: 3, Rafael: 7}}, {round: 2, scores: {Hazel: 5, Otis: 2, Juniper: 5, Rafael: 1}}],
  totals: {Hazel: 8, Otis: 12, Juniper: 8, Rafael: 8}
};

for (const size of [{width: 1180, height: 820}, {width: 1024, height: 768}, {width: 390, height: 844}]) {
  test(`Leave game is one hierarchy at ${size.width}: primary, neutral, then a separated red Delete game`, async ({page}) => {
    await page.setViewportSize(size);
    await boot(page);
    await liveGame(page, twoRounds);
    await page.locator('#actions-btn').click();
    await expect(page.locator('#actions-menu')).not.toContainText(/Scratch/i);
    await page.evaluate(() => closeActionsMenu());
    await page.locator('#actions-btn').click();
    await page.locator('#actions-save-end').click();
    const modal = page.locator('#end-match-modal');
    await expect(page.locator('#end-match-title')).toHaveText('Leave game');
    const kicker = page.locator('#end-match-kicker');
    await expect(kicker).toHaveText(/Five Crowns · 2 of 11 rounds scored/);
    await expect(kicker).not.toHaveText(/Leave game/i);
    await expect(modal.getByRole('button', {name: 'Close'})).toBeVisible();
    // Let the pop-in scale animation settle before measuring.
    await page.waitForFunction(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#end-match-modal')).length === 0);
    await page.waitForTimeout(100);
    const roles = await page.evaluate(() => {
      const css = (id) => {
        const el = document.getElementById(id);
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {bg: s.backgroundColor, color: s.color, border: s.borderTopColor, top: r.top, bottom: r.bottom, h: r.height, w: r.width};
      };
      return {save: css('leave-save-later'), end: css('leave-end-now'), keep: css('leave-keep-playing'), del: css('leave-delete-any'), vh: innerHeight};
    });
    // Order: Save for later, End game now, Keep playing, then Delete game last.
    expect(roles.save.top).toBeLessThan(roles.end.top);
    expect(roles.end.top).toBeLessThan(roles.keep.top);
    expect(roles.keep.bottom + 12).toBeLessThanOrEqual(roles.del.top);
    // Destructive looks different from safe: red text, not the primary fill or the neutral style.
    expect(roles.del.color).toBe('rgb(161, 38, 58)');
    expect(roles.del.bg).not.toBe(roles.save.bg);
    expect(roles.del.color).not.toBe(roles.keep.color);
    for (const key of ['save', 'end', 'keep', 'del']) expect(roles[key].h, `${key} height`).toBeGreaterThanOrEqual(44);
    expect(roles.del.bottom).toBeLessThanOrEqual(roles.vh + 1);
    await page.screenshot({path: `test-results/leave-hierarchy-${size.width}.png`});
  });
}

test('Delete game on a scored game asks first; dismissing keeps everything', async ({page}) => {
  await boot(page);
  await liveGame(page, twoRounds);
  await page.locator('#actions-btn').click();
  await page.locator('#actions-save-end').click();
  page.dialogAnswer = false;
  await page.locator('#leave-delete-any').click();
  expect(page.dialogs.at(-1)).toMatch(/^Delete this Five Crowns game\? 2 scored rounds are discarded\./);
  expect(await page.evaluate(() => ({live: !!currentGame, rounds: currentGame.rounds.length}))).toEqual({live: true, rounds: 2});
  page.dialogAnswer = true;
  await page.locator('#leave-delete-any').click();
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  expect(await page.evaluate(() => ({live: !!currentGame, history: history.length}))).toEqual({live: false, history: 0});
});

test('a zero-round result screen offers no Run it back or Share receipt', async ({page}) => {
  await boot(page);
  await liveGame(page, {name: 'Five Crowns', roster: FOUR, maxRounds: 11, rounds: [], totals: {Hazel: 0, Otis: 0, Juniper: 0, Rafael: 0}});
  await page.locator('#actions-btn').click();
  await page.locator('#actions-save-end').click();
  await page.locator('#leave-end-now').click();
  await page.locator('#leave-count-no').click();
  await expect(page.locator('#victory-names')).toHaveText('No rounds played');
  await expect(page.locator('#victory-modal').getByRole('button', {name: /Run it back/})).toBeHidden();
  await expect(page.locator('#victory-modal').getByRole('button', {name: /Share receipt/})).toBeHidden();
  await expect(page.locator('#victory-next')).toHaveText('Done');
});

test('a counted result still offers Run it back and Share receipt', async ({page}) => {
  await boot(page);
  await liveGame(page, twoRounds);
  await page.locator('#actions-btn').click();
  await page.locator('#actions-save-end').click();
  await page.locator('#leave-end-now').click();
  await page.locator('#leave-count-yes').click();
  await expect(page.locator('#victory-modal').getByRole('button', {name: /Run it back/})).toBeVisible();
  await expect(page.locator('#victory-modal').getByRole('button', {name: /Share receipt/})).toBeVisible();
  await expect(page.locator('#victory-next')).toHaveText('Next →');
});

test('an uncounted past night shows no 1st/1st/3rd and says it is not counted; Delete game is red', async ({page}) => {
  await boot(page);
  await liveGame(page, twoRounds);
  await page.locator('#actions-btn').click();
  await page.locator('#actions-save-end').click();
  await page.locator('#leave-end-now').click();
  await page.locator('#leave-count-no').click();
  await page.evaluate(() => { document.getElementById('victory-modal').classList.add('hidden'); goHome(); showHistory(); });
  await page.locator('#slice2-show-nights').click();
  const card = page.locator('.s2-night-card').first();
  await expect(card).toContainText('not counted');
  await expect(card.locator('.s2-night-place')).toHaveText(['', '', '', '']);
  const del = card.locator('[data-s2-action="night-delete"]');
  await expect(del).toHaveText('Delete game');
  expect(await del.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(161, 38, 58)');
});


test('See results and Run it back use the final seating order and keep the saved result', async ({page}) => {
  await boot(page);
  const rounds = Array.from({length: 11}, (_, index) => ({
    round: index + 1, scores: {Hazel: 1, Otis: 2, Juniper: 3, Rafael: 4}
  }));
  await liveGame(page, {
    ...twoRounds, rounds, totals: {Hazel: 11, Otis: 22, Juniper: 33, Rafael: 44}
  });
  const finishedId = await page.evaluate(() => {
    currentGame.retired = ['Otis'];
    openReorderPlayersModal();
    return currentGame.id;
  });
  const reorder = page.locator('#reorder-players-modal');
  await reorder.getByRole('button', {name: 'Move up'}).last().click();
  await reorder.getByRole('button', {name: /Apply|Save/}).click();
  await page.getByRole('button', {name: 'See results'}).click();
  await expect(page.locator('#victory-modal')).toBeVisible();
  await page.getByRole('button', {name: 'Run it back', exact: true}).click();
  await expect(page.locator('#slice2-board-line')).toContainText('Round 1 of 11');

  const read = async () => page.evaluate((id) => {
    const finished = history.find(match => match.id === id);
    return {
      id: currentGame.id,
      roster: currentGame.originalRoster,
      totals: currentGame.totals,
      rounds: currentGame.rounds.length,
      saved: finished && {totals: finished.totals, rounds: finished.rounds.length, retired: finished.retired}
    };
  }, finishedId);
  const newMatch = await read();
  expect(newMatch.id).not.toBe(finishedId);
  expect(newMatch.roster).toEqual(['Hazel', 'Rafael', 'Juniper']);
  expect(newMatch.totals).toEqual({Hazel: 0, Rafael: 0, Juniper: 0});
  expect(newMatch.rounds).toBe(0);
  expect(newMatch.saved).toEqual({
    totals: {Hazel: 11, Otis: 22, Juniper: 33, Rafael: 44}, rounds: 11, retired: ['Otis']
  });
  await page.reload();
  await page.waitForFunction(() => currentGame?.currentRound === 1);
  expect(await read()).toEqual(newMatch);
});


test('Canasta Run it back keeps the same sides and clears the new scores', async ({page}) => {
  await boot(page);
  await openScenario(page, {scenario: 'canasta-house-round', surface: 'scorecard'});
  const previous = await page.evaluate(() => {
    const sides = currentGame.handFoot.sides;
    currentGame.rounds = Array.from({length: 4}, (_, index) => ({
      round: index + 1,
      scores: Object.fromEntries(sides.flatMap((side, sideIndex) => side.members.map(name => [name, 100 * (sideIndex + 1)])))
    }));
    currentGame.currentRound = 5;
    recomputeGameTotals(currentGame);
    goActiveMatch();
    return {roster: currentGame.originalRoster, teams: currentGame.handFoot};
  });
  await page.getByRole('button', {name: 'See results', exact: true}).click();
  await page.getByRole('button', {name: 'Run it back', exact: true}).click();
  const rematch = await page.evaluate(() => ({
    name: currentGame.name, roster: currentGame.originalRoster, teams: currentGame.handFoot,
    round: currentGame.currentRound, scores: Object.values(currentGame.totals),
    savedRounds: history[0].rounds.length
  }));
  expect(rematch).toMatchObject({...previous, name: 'Hand and Foot', round: 1, savedRounds: 4});
  expect(rematch.scores.length).toBeGreaterThan(0);
  expect(rematch.scores.every(total => total === 0)).toBe(true);
});
