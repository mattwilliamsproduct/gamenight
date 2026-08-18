import {expect,test} from '@playwright/test';

async function openHallOfFame(page){
  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&surface=home',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await page.getByRole('button',{name:'Records',exact:true}).first().click();
  await page.locator('#tab-fame').click();
  await expect(page.locator('#hall-of-fame-view')).toBeVisible();
}

test('Hall of Fame and Shame include 818, Beat the Heat, and Comeback extras',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the records check once on laptop Chromium');
  await openHallOfFame(page);

  const fame=page.locator('#fame-content');
  const shame=page.locator('#shame-content');
  await expect(fame).toContainText('818: Best Score');
  await expect(fame).toContainText('818: Exact Bids');
  await expect(fame).toContainText('Beat the Heat: Coolest Score');
  await expect(fame).toContainText('Beat the Heat: Ice Rounds');
  await expect(fame).not.toContainText('Closest To 66');
  await expect(fame).toContainText('Comeback Extra: Most In One Game');
  await expect(shame).toContainText('818: Worst Score');
  await expect(shame).toContainText('818: Most Missed Bids');
  await expect(shame).toContainText('Beat the Heat: Hottest Score');

  await page.locator('#tab-records').click();
  const records=page.locator('#records-view');
  await expect(records).toContainText('818');
  await expect(records).toContainText('Most Exact Bids In One Game');
  await expect(records).not.toContainText('Closest Finish To 66');
  await expect(records).not.toContainText('Closest To 66');
  await expect(records).toContainText('The 818 Brick');
  await expect(records).toContainText('The Meltdown');
});

test('818 Hall of Fame uses that game\'s exact-bid scoring',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the records check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&surface=home',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  const metric=await page.evaluate(()=>{
    history=[{
      id:909090,
      game:'818',
      date:'8/17/2026',
      totals:{Megan:40,Matt:1},
      winners:['Megan'],
      originalRoster:['Megan','Matt'],
      rounds:[
        {round:1,bids:{Megan:2,Matt:1},actuals:{Megan:2,Matt:0},scores:{Megan:12,Matt:0}},
        {round:2,bids:{Megan:3,Matt:1},actuals:{Megan:3,Matt:1},scores:{Megan:13,Matt:11}},
        {round:3,bids:{Megan:5,Matt:2},actuals:{Megan:5,Matt:0},scores:{Megan:15,Matt:0}}
      ]
    }];
    markHistoryChanged();
    const fame=calculateHallOfFame();
    const records=calculateAllTimeRecords();
    return {
      best:fame['818'].bestScore,
      bestPlayer:fame['818'].bestPlayer,
      exacts:fame['818'].mostExactBids,
      exactsPlayer:fame['818'].mostExactBidsPlayer,
      missed:fame['818'].mostMissedBids,
      missedPlayer:fame['818'].mostMissedBidsPlayer,
      bestRound:fame['818'].bestRound,
      recordsBest:records.games['818'].bestGame?.value,
      recordsExacts:records.games['818'].mostExactSingleGame?.value
    };
  });
  expect(metric.best).toBe(40);
  expect(metric.bestPlayer).toBe('Megan');
  expect(metric.exacts).toBe(3);
  expect(metric.exactsPlayer).toBe('Megan');
  expect(metric.missed).toBe(2);
  expect(metric.missedPlayer).toBe('Matt');
  expect(metric.bestRound).toBe(15);
  expect(metric.recordsBest).toBe(40);
  expect(metric.recordsExacts).toBe(3);
});
