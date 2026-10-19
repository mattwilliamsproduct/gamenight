import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test('Actions dropdown opens a visible list below the button', async ({page})=>{
  await openScenario(page,{scenario:'wizard-10'});

  const button=page.locator('#actions-btn');
  await expect(button).toBeVisible();
  await expect(page.locator('#actions-menu')).toBeHidden();

  await button.click();
  const menu=page.locator('#actions-menu:not(.hidden)');
  await expect(menu).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded','true');

  const undo=page.locator('#actions-undo');
  await expect(undo).toBeVisible();
  await expect(undo).toContainText('Undo Last Round');

  const geometry=await page.evaluate(()=>{
    const btn=document.getElementById('actions-btn');
    const menuEl=document.getElementById('actions-menu');
    const item=document.getElementById('actions-undo');
    const banner=document.querySelector('#game-screen .active-match-banner');
    const btnBox=btn.getBoundingClientRect();
    const menuBox=menuEl.getBoundingClientRect();
    const itemBox=item.getBoundingClientRect();
    const sampleX=itemBox.left+(itemBox.width/2);
    const sampleY=itemBox.top+(itemBox.height/2);
    const hit=document.elementFromPoint(sampleX,sampleY);
    return {
      menuHeight:menuBox.height,
      menuBelowButton:menuBox.top>=btnBox.bottom-1,
      itemVisible:itemBox.height>20&&itemBox.width>40,
      hitIsItem:!!(hit&&(hit===item||item.contains(hit))),
      bannerAllowsOverflow:getComputedStyle(banner).overflow==='visible',
      menuHidden:menuEl.classList.contains('hidden')
    };
  });
  expect(geometry.menuHidden,'Actions menu should drop open').toBe(false);
  expect(geometry.menuHeight,'Actions menu should have a real list height').toBeGreaterThan(200);
  expect(geometry.menuBelowButton,'Actions menu should appear under the button').toBe(true);
  expect(geometry.itemVisible,'Undo Last Round should occupy a clickable box').toBe(true);
  expect(geometry.hitIsItem,'Undo Last Round should not be clipped by the match banner').toBe(true);
  expect(geometry.bannerAllowsOverflow,'open Actions menu must escape banner overflow clipping').toBe(true);

  await page.locator('#scorecard-capture').click({position:{x:24,y:24}});
  await expect(page.locator('#actions-menu')).toBeHidden();
  await expect(button).toHaveAttribute('aria-expanded','false');
});
