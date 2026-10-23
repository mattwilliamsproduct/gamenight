import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test('Beat the Heat stays open below 66 heat', async ({page})=>{
  await openScenario(page,{scenario:'beat-the-heat-close'});

  await expect(page.locator('#round-intel')).toHaveText('R4 · Ends at 66');
  await expect(page.locator('#submit-action-btn')).toBeVisible();
  await expect(page.locator('#game-over-section')).toBeHidden();

  await page.evaluate(()=>{
    currentGame.currentScoreDrafts={Megan:10,Matt:2,Cat:1,Mike:0};
    submitRound({skipConfirm:true});
  });

  await expect(page.locator('#round-intel')).toHaveText('R5 · Ends at 66');
  await expect(page.locator('#submit-section')).toBeVisible();
  await expect(page.locator('#game-over-section')).toBeHidden();
  expect(await page.evaluate(()=>currentGame.totals.Megan)).toBe(65);
});

test('Beat the Heat shows Match Complete when a player already has 66+ heat', async ({page})=>{
  await openScenario(page,{scenario:'beat-the-heat-over'});

  await expect(page.locator('#round-intel')).toHaveText('Final Scores');
  await expect(page.locator('#game-over-section')).toBeVisible();
  await expect(page.locator('#game-over-copy')).toHaveText('Someone reached 66 heat. The match is over.');
  await expect(page.locator('#submit-section')).toBeHidden();
  await expect(page.getByRole('button',{name:'End Match & See Winner'})).toBeVisible();
  expect(await page.evaluate(()=>currentGame.totals.Megan)).toBe(67);
});
