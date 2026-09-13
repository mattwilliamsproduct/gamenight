import {expect,test} from '@playwright/test';

test('tied scoreboard totals share a place', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-early-8&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  await page.evaluate(() => {
    currentGame.originalRoster = ['Brick', 'Michelle', 'Vikki', 'Matt', 'Megan', 'Linda', 'Mike'];
    currentGame.retired = [];
    currentGame.totals = {Brick: 170, Michelle: 150, Vikki: 140, Matt: 130, Megan: 130, Linda: 110, Mike: 110};
    currentGame.currentRound = 7;
    renderGame();
  });

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
