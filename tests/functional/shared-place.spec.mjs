import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

function placeFontPx(page, name) {
  return page.locator('#scorecard-body tr', {hasText: name}).locator('.scoreboard-rank-badge').evaluate((el) => {
    const style = getComputedStyle(el);
    const visible = style.visibility !== 'hidden' && style.display !== 'none' && parseFloat(style.opacity || '1') > 0.2;
    const box = el.getBoundingClientRect();
    return {
      text: (el.textContent || '').trim(),
      font: parseFloat(style.fontSize),
      visible,
      width: box.width,
      height: box.height
    };
  });
}

test('tied Wizard places are shared on the live card and profiles', async ({page})=>{
  await openScenario(page,{scenario:'wizard-tied-places'});

  const live=await page.locator('#scorecard-body tr').evaluateAll(rows=>rows.map(row=>({
    name:row.querySelector('.scoreboard-player-name, .dealer-player-label')?.textContent?.trim(),
    place:row.querySelector('.scoreboard-rank-badge')?.textContent?.trim()
  })));
  expect(live).toEqual([
    {name:'Alexis',place:'1st'},
    {name:'Diana',place:'2nd'},
    {name:'Ethan',place:'3rd'},
    {name:'Megan',place:'4th'},
    {name:'Matt',place:'4th'},
    {name:'Linda',place:'6th'},
    {name:'Mike',place:'6th'}
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

test('scorecard places read as visible ordinals on lowest-wins, highest-wins, and ties', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 650});
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  const crowns = await placeFontPx(page, 'Matt');
  expect(crowns.text).toMatch(/^\d+(st|nd|rd|th)$/);
  expect(crowns.visible, 'Five Crowns place is visible').toBe(true);
  expect(crowns.font, `Five Crowns place ${crowns.font}px`).toBeGreaterThanOrEqual(14);

  await openScenario(page, {scenario: 'wizard-early-8', surface: 'scorecard'});
  const wizard = await placeFontPx(page, 'Matt');
  expect(wizard.text).toMatch(/^\d+(st|nd|rd|th)$/);
  expect(wizard.visible, 'Wizard place is visible').toBe(true);
  expect(wizard.font, `Wizard place ${wizard.font}px`).toBeGreaterThanOrEqual(14);

  await openScenario(page, {scenario: 'wizard-tied-places'});
  const tied = await placeFontPx(page, 'Megan');
  expect(tied.text).toBe('4th');
  expect(tied.visible, 'tied place is visible').toBe(true);
  expect(tied.font, `tied place ${tied.font}px`).toBeGreaterThanOrEqual(14);

  await page.setViewportSize({width: 375, height: 667});
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  const phone = await placeFontPx(page, 'Matt');
  expect(phone.text).toMatch(/^\d+(st|nd|rd|th)$/);
  expect(phone.visible).toBe(true);
  expect(phone.font, `375 place ${phone.font}px`).toBeGreaterThanOrEqual(13);
});
