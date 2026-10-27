import {expect,test} from '@playwright/test';
import {enterRoundButton, openScenario} from '../helpers/qa.mjs';

test('Beat the Heat stays open below 66 heat', async ({page})=>{
  await openScenario(page,{scenario:'beat-the-heat-close'});

  await expect(page.locator('#slice2-board-line')).toContainText(/Beat the Heat · Round 4/);
  await expect(enterRoundButton(page)).toBeVisible();
  await expect(page.locator('#game-over-section')).toBeHidden();

  await page.evaluate(()=>{
    currentGame.currentScoreDrafts={Megan:10,Matt:2,Cat:1,Mike:0};
    submitRound({skipConfirm:true});
  });

  await expect(page.locator('#slice2-board-line')).toContainText(/Beat the Heat · Round 5/);
  await expect(enterRoundButton(page)).toBeVisible();
  await expect(page.locator('#game-over-section')).toBeHidden();
  expect(await page.evaluate(()=>currentGame.totals.Megan)).toBe(65);
});

test('Beat the Heat shows Match Complete when a player already has 66+ heat', async ({page})=>{
  await openScenario(page,{scenario:'beat-the-heat-over'});

  await expect(page.locator('#slice2-board-line')).toContainText(/Beat the Heat/);
  await expect(page.locator('#game-over-section')).toBeVisible();
  await expect(page.locator('#game-over-copy')).toHaveText('Someone reached 66 heat. The match is over.');
  await expect(page.locator('#submit-section')).toBeHidden();
  await expect(page.getByRole('button',{name:'End Match & See Winner'})).toBeVisible();
  expect(await page.evaluate(()=>currentGame.totals.Megan)).toBe(67);
});
