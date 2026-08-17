import {expect,test} from '@playwright/test';

const closeUrl='/?gnqa=1&gallery=0&scenario=beat-the-heat-close&surface=scorecard';
const overUrl='/?gnqa=1&gallery=0&scenario=beat-the-heat-over&surface=scorecard';

async function ready(page){
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
}

test('Beat the Heat stays open below 66 heat',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the logic check once on laptop Chromium');
  await page.goto(closeUrl,{waitUntil:'networkidle'});
  await ready(page);

  await expect(page.locator('#round-intel')).toHaveText('R4 · First to 66');
  await expect(page.locator('#submit-action-btn')).toBeVisible();
  await expect(page.locator('#game-over-section')).toBeHidden();

  await page.evaluate(()=>{
    currentGame.currentScoreDrafts={Megan:10,Matt:2,Cat:1,Mike:0};
    submitRound({skipConfirm:true});
  });

  await expect(page.locator('#round-intel')).toHaveText('R5 · First to 66');
  await expect(page.locator('#submit-section')).toBeVisible();
  await expect(page.locator('#game-over-section')).toBeHidden();
  expect(await page.evaluate(()=>currentGame.totals.Megan)).toBe(65);
});

test('Beat the Heat shows Match Complete when a player already has 66+ heat',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the logic check once on laptop Chromium');
  await page.goto(overUrl,{waitUntil:'networkidle'});
  await ready(page);

  await expect(page.locator('#round-intel')).toHaveText('Final Scores');
  await expect(page.locator('#game-over-section')).toBeVisible();
  await expect(page.locator('#game-over-copy')).toHaveText('Someone reached 66 heat. The match is over.');
  await expect(page.locator('#submit-section')).toBeHidden();
  await expect(page.getByRole('button',{name:'End Match & See Winner'})).toBeVisible();
  expect(await page.evaluate(()=>currentGame.totals.Megan)).toBe(67);
});

test('Beat the Heat auto-ends at 66 and continues through winner, loser, and metrics',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the logic check once on laptop Chromium');
  page.on('dialog',dialog=>dialog.accept());

  await page.goto(closeUrl,{waitUntil:'networkidle'});
  await ready(page);

  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#score-entry-context')).toContainText('First to 66');
  await expect(page.locator('#score-entry-primary-btn')).toHaveText('Submit Heat');

  await page.locator('#score-entry-row-Megan').click();
  await page.locator('.score-entry-keypad').getByRole('button',{name:'1',exact:true}).click();
  await page.locator('.score-entry-keypad').getByRole('button',{name:'1',exact:true}).click();
  await page.locator('.score-entry-key.next').click();
  await page.getByRole('button',{name:'Submit Heat',exact:true}).click();

  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await expect(page.locator('#game-over-section')).toBeVisible();
  await expect(page.locator('#submit-section')).toBeHidden();
  await expect(page.locator('#round-intel')).toHaveText('Final Scores');
  await expect(page.locator('#game-over-copy')).toHaveText('Someone reached 66 heat. The match is over.');
  expect(await page.evaluate(()=>currentGame.totals.Megan)).toBe(66);

  await page.getByRole('button',{name:'End Match & See Winner'}).click();
  await expect(page.locator('#victory-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#victory-names')).toContainText('Mike');

  await page.locator('#victory-modal').getByRole('button',{name:'Next →'}).click();
  await expect(page.locator('#loser-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#loser-names')).toContainText('Megan');

  await page.getByRole('button',{name:'Return Home'}).click();
  await expect(page.locator('#stat-montage:not(.hidden), #home-screen:not(.hidden)').first()).toBeVisible();
});
