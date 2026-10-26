import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test('tied Wizard places are shared on the live card and profiles', async ({page})=>{
  await openScenario(page,{scenario:'wizard-tied-places'});

  const live=await page.locator('#scorecard-body tr').evaluateAll(rows=>rows.map(row=>({
    name:row.querySelector('.scoreboard-player-name, .dealer-player-label')?.textContent?.trim(),
    place:row.querySelector('.scoreboard-rank-badge')?.textContent?.trim()
  })));
  expect(live).toEqual([
    {name:'Alexis',place:'1'},
    {name:'Diana',place:'2'},
    {name:'Ethan',place:'3'},
    {name:'Megan',place:'4'},
    {name:'Matt',place:'4'},
    {name:'Linda',place:'6'},
    {name:'Mike',place:'6'}
  ]);

  const ranks=await page.evaluate(()=>({
    megan:getProfileSummary('Megan').avgRank,
    matt:getProfileSummary('Matt').avgRank,
    linda:getProfileSummary('Linda').avgRank,
    mike:getProfileSummary('Mike').avgRank
  }));
  expect(ranks).toEqual({megan:4,matt:4,linda:6,mike:6});

  await page.evaluate(()=>showProfiles());
  await page.locator('.profile-passport-name',{hasText:'Megan'}).click();
  await expect(page.locator('.profile-stat-tile',{hasText:'Avg Rank'}).locator('strong')).toHaveText('4.0');
  await page.evaluate(()=>closeProfileDetail());
  await page.locator('.profile-passport-name',{hasText:'Matt'}).click();
  await expect(page.locator('.profile-stat-tile',{hasText:'Avg Rank'}).locator('strong')).toHaveText('4.0');
});
