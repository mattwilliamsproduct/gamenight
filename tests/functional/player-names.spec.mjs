import {expect,test} from '@playwright/test';
import {nextPaint,openScenario} from '../helpers/qa.mjs';

test('Five Crowns first-round Michelle glyphs fit the name box', async ({page})=>{
  await openScenario(page,{scenario:'five-crowns-name-fit-7'});
  const michelle=page.locator('#scorecard-body .scoreboard-player-name').filter({hasText:'Michelle'});
  await expect(michelle).toHaveCount(1);
  const fit=await michelle.evaluate(element=>({
    text:(element.textContent||'').trim(),
    clientWidth:element.clientWidth,
    scrollWidth:element.scrollWidth,
    fontSize:Number.parseFloat(getComputedStyle(element).fontSize),
    textOverflow:getComputedStyle(element).textOverflow
  }));
  expect(fit.text).toBe('Michelle');
  expect(fit.scrollWidth,'Michelle should not be truncated').toBeLessThanOrEqual(fit.clientWidth+1);
  expect(fit.fontSize,'Michelle should remain readable').toBeGreaterThanOrEqual(14);
  expect(fit.textOverflow,'live player names should never use an ellipsis').toBe('clip');
});

test('late five-player Wizard keeps Michelle letters unclipped', async ({page})=>{
  await openScenario(page,{scenario:'wizard-late-5'});
  await nextPaint(page);
  const michelle=await page.evaluate(()=>{
    const row=[...document.querySelectorAll('#scorecard-body tr')].find(candidate=>{
      const label=candidate.querySelector('.dealer-player-label')||candidate.querySelector('.scoreboard-player-name');
      return (label?.textContent||'').trim().toUpperCase()==='MICHELLE';
    });
    const chip=row?.querySelector('.dealer-player-label')||row?.querySelector('.scoreboard-player-name');
    return chip?{text:(chip.textContent||'').trim(),scrollWidth:chip.scrollWidth,clientWidth:chip.clientWidth}:null;
  });
  expect(michelle,'Michelle should be on the late-5 scorecard').not.toBeNull();
  expect(michelle.text.toUpperCase()).toBe('MICHELLE');
  expect(michelle.scrollWidth,'Michelle glyphs should fit their name box').toBeLessThanOrEqual(michelle.clientWidth+1);
});

test('390 scorecard names share one column size', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openScenario(page,{scenario:'wizard-scoring-8'});
  await nextPaint(page);
  const fit=await page.evaluate(()=>{
    const names=[...document.querySelectorAll('#scorecard-body .scoreboard-player-name')];
    const sizes=names.map(name=>Number.parseFloat(getComputedStyle(name).fontSize));
    const unique=[...new Set(sizes.map(size=>size.toFixed(1)))];
    const boxes=names.map(name=>{
      const cell=name.closest('td.scorecard-col-player');
      const chip=name.querySelector('.dealer-player-label')||name;
      const cellBox=cell.getBoundingClientRect();
      const chipBox=chip.getBoundingClientRect();
      return {
        text:(chip.textContent||'').trim(),
        size:Number.parseFloat(getComputedStyle(name).fontSize),
        fits:chipBox.right<=cellBox.right+1.5
      };
    });
    return {unique,boxes,min:Math.min(...sizes),max:Math.max(...sizes)};
  });
  expect(fit.boxes.length,'wizard-scoring-8 should have names').toBeGreaterThan(3);
  expect(fit.unique.length,'all names in the column share one size').toBe(1);
  expect(fit.max-fit.min,'shared size should not drift').toBeLessThan(0.15);
  expect(fit.boxes.every(row=>row.fits),'every name stays inside its cell').toBe(true);
  expect(fit.min,'shared name size stays readable').toBeGreaterThanOrEqual(12);
});

test('mid-game Add Player typing m only suggests Michelle', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 650});
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  await page.locator('#actions-btn').click();
  await page.getByRole('button', {name: /Add Player Mid-Game/}).click();
  await expect(page.locator('#add-player-modal')).not.toHaveClass(/hidden/);
  await page.locator('#midgame-add-player-input').fill('m');
  const names = await page.locator('#midgame-player-suggestions .player-suggest-option .player-name-label').allTextContents();
  expect(names.map((name) => name.trim())).toEqual(['Michelle']);
  expect(names.some((name) => name.includes(','))).toBe(false);
});
