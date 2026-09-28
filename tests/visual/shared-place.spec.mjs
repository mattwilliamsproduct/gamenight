import {expect,test} from '@playwright/test';

test('tied Wizard places are shared on the live card, history list, and profiles', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the place check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-tied-places&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const live = await page.locator('#scorecard-body tr').evaluateAll(rows => rows.map(row => ({
    name: row.querySelector('.scoreboard-player-name, .dealer-player-label')?.textContent?.trim(),
    place: row.querySelector('.scoreboard-rank-badge')?.textContent?.trim()
  })));
  expect(live).toEqual([
    {name: 'Alexis', place: '1'},
    {name: 'Diana', place: '2'},
    {name: 'Ethan', place: '3'},
    {name: 'Megan', place: '4'},
    {name: 'Matt', place: '4'},
    {name: 'Linda', place: '6'},
    {name: 'Mike', place: '6'}
  ]);

  await page.evaluate(() => showHistory());
  const historyPlaces = await page.locator('#history-list-view .font-mono-num.text-sm').allTextContents();
  expect(historyPlaces.map(text => text.trim())).toEqual(['1.', '2.', '3.', '4.', '4.', '6.', '6.']);

  const ranks = await page.evaluate(() => ({
    megan: getProfileSummary('Megan').avgRank,
    matt: getProfileSummary('Matt').avgRank,
    linda: getProfileSummary('Linda').avgRank,
    mike: getProfileSummary('Mike').avgRank
  }));
  expect(ranks).toEqual({megan: 4, matt: 4, linda: 6, mike: 6});

  await page.evaluate(() => showProfiles());
  await page.locator('.profile-passport-name', {hasText: 'Megan'}).click();
  await expect(page.locator('.profile-stat-tile', {hasText: 'Avg Rank'}).locator('strong')).toHaveText('4.0');
  await page.evaluate(() => closeProfileDetail());
  await page.locator('.profile-passport-name', {hasText: 'Matt'}).click();
  await expect(page.locator('.profile-stat-tile', {hasText: 'Avg Rank'}).locator('strong')).toHaveText('4.0');
});
