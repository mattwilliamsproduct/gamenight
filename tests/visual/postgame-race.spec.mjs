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
  await expect(page.locator('.montage-race-key.is-hot')).toHaveCount(0);
  await expect(page.locator('.montage-race-key.is-dim')).toHaveCount(0);
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Everyone');
  await expect(page.locator('#montage-race-records')).toContainText('Megan set a new Five Crowns best');
  await expect(page.locator('.montage-race-key',{hasText:'Megan'}).locator('.montage-race-name')).toHaveCSS('color','rgb(255, 255, 255)');
  const nameSize=await page.locator('.montage-race-key').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(nameSize).toBeGreaterThanOrEqual(20);

  const path=await page.evaluate(()=>buildMatchPlacePath(history[0]));
  expect(path.winners).toEqual(['Megan']);
  expect(path.losers).toEqual(['Matt']);
  expect(path.ranks.Megan.at(-1)).toBe(1);
  expect(path.ranks.Matt.at(-1)).toBe(4);
  expect(path.ranks.Matt[0]).toBe(1);

  const firstNote=await page.locator('#montage-race-records').innerText();
  await expect(page.locator('.montage-race-key',{hasText:'Megan'})).toHaveClass(/is-hot/,{timeout:5000});
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Megan');
  await expect(page.locator('.montage-race-key.is-hot')).toHaveCount(1);
  await expect(page.locator('#montage-race-records')).not.toHaveText(firstNote,{timeout:5000});

  await page.locator('.montage-race-key',{hasText:'Cat'}).click();
  await expect(page.locator('.montage-race-key',{hasText:'Cat'})).toHaveClass(/is-hot/);
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Cat');
  await expect(page.locator('.montage-race-key',{hasText:'Megan'})).toHaveClass(/is-dim/);
  await page.waitForTimeout(3500);
  await expect(page.locator('.montage-race-key',{hasText:'Cat'})).toHaveClass(/is-hot/);
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Cat');
  await expect(page.locator('.montage-race-key.is-hot')).toHaveCount(1);
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

test('path replay can show eight players and still lets you pin one path',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the path replay check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=postgame-race-8&surface=race',{waitUntil:'networkidle'});
  await ready(page);
  await expect(page.locator('#stat-montage')).toBeVisible();
  await expect(page.locator('.montage-race-key')).toHaveCount(8);
  await expect(page.locator('.montage-race-key.is-hot')).toHaveCount(0);
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Everyone');
  const headerLayout=await page.evaluate(()=>{
    const montage=document.getElementById('stat-montage').getBoundingClientRect();
    const title=document.getElementById('montage-race-title').getBoundingClientRect();
    const pill=document.getElementById('montage-race-focus').getBoundingClientRect();
    const name=document.getElementById('montage-race-focus-name').getBoundingClientRect();
    return {
      titleOffset:Math.abs((title.left+title.width/2)-(montage.left+montage.width/2)),
      extraPill:pill.width-name.width,
      leftPad:name.left-pill.left,
      rightPad:pill.right-name.right
    };
  });
  expect(headerLayout.titleOffset).toBeLessThan(24);
  expect(headerLayout.extraPill).toBeLessThan(140);
  expect(headerLayout.leftPad).toBeGreaterThan(12);
  expect(headerLayout.rightPad).toBeGreaterThan(12);
  await expect(page.locator('.montage-race-key',{hasText:'Megan'}).locator('.montage-race-name')).toHaveCSS('color','rgb(255, 255, 255)');
  await expect(page.locator('.montage-race-key',{hasText:'Megan'})).toHaveClass(/is-hot/,{timeout:5000});
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Megan');
  await page.locator('.montage-race-key',{hasText:'Brick'}).click();
  await expect(page.locator('.montage-race-key',{hasText:'Brick'})).toHaveClass(/is-hot/);
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Brick');
  await expect(page.locator('.montage-race-key.is-hot')).toHaveCount(1);
  await page.waitForTimeout(3500);
  await expect(page.locator('.montage-race-key',{hasText:'Brick'})).toHaveClass(/is-hot/);
  await expect(page.locator('#montage-race-focus-name')).toHaveText('Brick');
});
