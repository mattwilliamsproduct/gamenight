import {expect,test} from '@playwright/test';

async function ready(page){
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
}

test('path replay shows place-over-time with winner and last lit',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the path replay check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=postgame-race&surface=race',{waitUntil:'networkidle'});
  await ready(page);

  await expect(page.locator('#stat-montage')).toBeVisible();
  await expect(page.locator('#montage-race-legend .montage-race-key')).toHaveCount(4);
  await expect(page.locator('#montage-race-title')).toHaveText('Five Crowns · place by round');
  await expect(page.locator('#montage-race-chart')).toBeVisible();
  const keys=page.locator('.montage-race-key');
  await expect(keys).toHaveCount(4);
  await expect(page.locator('.montage-race-key',{hasText:'Megan'})).toHaveClass(/is-hot/);
  await expect(page.locator('.montage-race-key',{hasText:'Matt'})).toHaveClass(/is-hot/);
  await expect(page.locator('.montage-race-key',{hasText:'Cat'})).toHaveClass(/is-dim/);
  await expect(page.locator('#montage-race-records')).toContainText('Megan set a new Five Crowns best');

  const path=await page.evaluate(()=>buildMatchPlacePath(history[0]));
  expect(path.winners).toEqual(['Megan']);
  expect(path.losers).toEqual(['Matt']);
  expect(path.ranks.Megan.at(-1)).toBe(1);
  expect(path.ranks.Matt.at(-1)).toBe(4);
  expect(path.ranks.Matt[0]).toBe(1);

  await page.locator('.montage-race-key',{hasText:'Cat'}).click();
  await expect(page.locator('.montage-race-key',{hasText:'Cat'})).toHaveClass(/is-hot/);
  await expect(page.locator('.montage-race-key',{hasText:'Megan'})).toHaveClass(/is-dim/);
});

test('path replay skips matches with fewer than three scoring rounds',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the path replay check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&surface=home',{waitUntil:'networkidle'});
  await ready(page);
  const skipped=await page.evaluate(()=>{
    const short={
      id:1,
      game:'Five Crowns',
      totals:{Megan:4,Matt:9},
      winners:['Megan'],
      originalRoster:['Megan','Matt'],
      rounds:[
        {round:1,scores:{Megan:2,Matt:4}},
        {round:2,scores:{Megan:2,Matt:5}}
      ]
    };
    return buildMatchPlacePath(short);
  });
  expect(skipped).toBeNull();
});
