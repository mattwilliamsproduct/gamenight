import {expect,test} from '@playwright/test';

test('tied scoreboard totals share a place', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-tied-places&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const places = await page.evaluate(() => [...document.querySelectorAll('#scorecard-body tr')].map(row => {
    const nameEl = row.querySelector('.dealer-player-label') || row.querySelector('.scoreboard-player-name');
    return {
      name: (nameEl?.textContent || '').trim(),
      place: (row.querySelector('.scoreboard-rank-badge')?.textContent || '').trim(),
      total: (row.querySelector('.scorecard-total-value')?.textContent || '').trim()
    };
  }));

  expect(places).toEqual([
    {name: 'Brick', place: '1', total: '170'},
    {name: 'Michelle', place: '2', total: '150'},
    {name: 'Vikki', place: '3', total: '140'},
    {name: 'Matt', place: '4', total: '130'},
    {name: 'Megan', place: '4', total: '130'},
    {name: 'Linda', place: '6', total: '110'},
    {name: 'Mike', place: '6', total: '110'}
  ]);
});
