import {expect,test} from '@playwright/test';

const surfaces=[
  {id:'home',visible:'#home-screen:not(.hidden)'},
  {id:'scorecard',visible:'#game-screen:not(.hidden)'},
  {id:'entry-bids',visible:'#score-entry-modal:not(.hidden)',title:'#score-entry-game',titleText:/Wizard|818/},
  {id:'entry-scores',visible:'#score-entry-modal:not(.hidden)'},
  {id:'actions',visible:'#actions-menu:not(.hidden)'},
  {id:'settings',visible:'#settings-modal:not(.hidden)'},
  {id:'profiles',visible:'#profiles-screen:not(.hidden)'},
  {id:'whammy',visible:'#whammy-modal:not(.hidden)',title:'#whammy-title',titleText:'WHAMMY!'},
  {id:'nolie',visible:'#whammy-modal:not(.hidden)',title:'#whammy-title',titleText:'NOLIE!'},
  {id:'race',visible:'#stat-montage:not(.hidden)'}
];

const scenarios=['beat-the-heat-pace','home-party','wizard-10','beat-the-heat-over'];

async function openGallery(page,scenario){
  await page.goto(`/?gnqa=1&scenario=${scenario}`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('#gn-qa-gallery')).toBeVisible();
}

async function clickSurface(page,id){
  await page.locator(`#gn-qa-gallery [data-surface="${id}"]`).click();
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
}

test('every gallery surface opens from Beat the Heat, Home, Wizard, and a finished match',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the gallery wiring check once on laptop Chromium');
  test.setTimeout(90000);
  for(const scenario of scenarios){
    await openGallery(page,scenario);
    for(const surface of surfaces){
      await clickSurface(page,surface.id);
      await expect(page.locator(surface.visible),`${scenario} → ${surface.id}`).toBeVisible();
      if(surface.title){
        await expect(page.locator(surface.title),`${scenario} → ${surface.id} title`).toHaveText(surface.titleText);
      }
    }
  }
});
