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
