import {expect,test} from '@playwright/test';

const cases=[
  {name:'home-setup',scenario:'home-party',surface:'home',visible:'#home-screen:not(.hidden)'},
  {name:'wizard-scorecard-10-players',scenario:'wizard-10',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',assertScorecardScale:true},
  {name:'five-crowns-scorecard-4-players',scenario:'five-crowns-4',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',assertScorecardScale:true},
  {name:'five-crowns-life-preservers',scenario:'five-crowns-preservers',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',assertScorecardScale:true},
  {name:'wizard-bid-entry-10-players',scenario:'wizard-10',surface:'entry-bids',visible:'#score-entry-modal:not(.hidden)',rows:'#score-entry-rows .score-entry-row',container:'#score-entry-modal .score-entry-panel'},
  {name:'five-crowns-score-entry-8-players',scenario:'five-crowns-preservers',surface:'entry-scores',visible:'#score-entry-modal:not(.hidden)',rows:'#score-entry-rows .score-entry-row',container:'#score-entry-modal .score-entry-panel'},
  {name:'settings-over-active-match',scenario:'wizard-10',surface:'settings',visible:'#settings-modal:not(.hidden)',container:'#settings-modal .surface-raised'},
  {name:'profiles-yearbook',scenario:'profile-yearbook',surface:'profiles',visible:'#profiles-screen:not(.hidden)'},
  {name:'actions-menu',scenario:'wizard-10',surface:'actions',visible:'#actions-menu:not(.hidden)',container:'#actions-menu'},
  {name:'whammy-8-players',scenario:'whammy-8',surface:'whammy',visible:'#whammy-modal:not(.hidden)',rows:'#whammy-scores .whammy-score-row',container:'#whammy-modal .whammy-card'},
  {name:'nolie-8-players',scenario:'whammy-8',surface:'nolie',visible:'#whammy-modal:not(.hidden)',rows:'#whammy-scores .whammy-score-row',container:'#whammy-modal .whammy-card'}
];

async function expectInsideViewport(locator,page,label){
  const box=await locator.boundingBox();
  expect(box,`${label} should have a visible bounding box`).not.toBeNull();
  const viewport=page.viewportSize();
  expect(box.x,`${label} should not escape the left edge`).toBeGreaterThanOrEqual(-1);
  expect(box.y,`${label} should not escape the top edge`).toBeGreaterThanOrEqual(-1);
  expect(box.x+box.width,`${label} should not escape the right edge`).toBeLessThanOrEqual(viewport.width+1);
  expect(box.y+box.height,`${label} should not escape the bottom edge`).toBeLessThanOrEqual(viewport.height+1);
}

async function expectRowsInsideContainer(page,rowSelector,containerSelector){
  const rows=page.locator(rowSelector);
  expect(await rows.count(),`${rowSelector} should contain rows`).toBeGreaterThan(0);
  const container=containerSelector?page.locator(containerSelector):null;
  const bounds=container?await container.boundingBox():{x:0,y:0,width:page.viewportSize().width,height:page.viewportSize().height};
  expect(bounds,'row container should be visible').not.toBeNull();
  for(let index=0;index<await rows.count();index++){
    const box=await rows.nth(index).boundingBox();
    expect(box,`row ${index+1} should be visible`).not.toBeNull();
    expect(box.y,`row ${index+1} should stay inside its container`).toBeGreaterThanOrEqual(bounds.y-2);
    expect(box.y+box.height,`row ${index+1} should stay inside its container`).toBeLessThanOrEqual(bounds.y+bounds.height+2);
  }
}

async function expectScorecardUsesRowHeight(page){
  const row=page.locator('#scorecard-body tr').first();
  const rowBox=await row.boundingBox();
  expect(rowBox,'scorecard row should be visible').not.toBeNull();
  const sizes=await page.locator('#scorecard-body tr').first().evaluate(element=>({
    name:Number.parseFloat(getComputedStyle(element.querySelector('.scoreboard-player-name')).fontSize),
    total:Number.parseFloat(getComputedStyle(element.querySelector('.scorecard-total-cell')).fontSize),
    avatar:element.querySelector('.avatar-img-sc')?.getBoundingClientRect().height||0
  }));
  expect(sizes.name/rowBox.height,'player names should use most of their row height').toBeGreaterThanOrEqual(0.58);
  expect(sizes.total/rowBox.height,'totals should use most of their row height').toBeGreaterThanOrEqual(0.54);
  expect(sizes.avatar/rowBox.height,'avatars should use most of their row height').toBeGreaterThanOrEqual(0.72);
}

async function expectScorecardNamesFit(page){
  const names=page.locator('#scorecard-body .scoreboard-player-name');
  expect(await names.count(),'scorecard should contain player names').toBeGreaterThan(0);
  for(let index=0;index<await names.count();index++){
    const fit=await names.nth(index).evaluate(element=>{
      const label=element.querySelector('.dealer-player-label')||element;
      return {
        name:(label.textContent||'').trim(),
        clientWidth:label.clientWidth,
        scrollWidth:label.scrollWidth
      };
    });
    if(fit.name.length<=10){
      expect(fit.scrollWidth,`${fit.name} should not be clipped`).toBeLessThanOrEqual(fit.clientWidth+1);
    }
  }
}

for(const view of cases){
  test(view.name,async({page})=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});

    await page.goto(`/?gnqa=1&gallery=0&scenario=${encodeURIComponent(view.scenario)}&surface=${encodeURIComponent(view.surface)}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
    await expect(page.locator(view.visible)).toBeVisible();
    await page.addStyleTag({content:'*{caret-color:transparent!important} #toast-container,#save-indicator,#pwa-update-notice{display:none!important}'});

    if(view.container)await expectInsideViewport(page.locator(view.container),page,view.container);
    if(view.rows)await expectRowsInsideContainer(page,view.rows,view.container);
    if(view.assertScorecardScale){
      await expectScorecardUsesRowHeight(page);
      await expectScorecardNamesFit(page);
    }
    expect(errors,'page should not emit runtime errors').toEqual([]);
    await expect(page).toHaveScreenshot(`${view.name}.png`);
  });
}

test('wizard-scorecard-fits-after-text-size-change',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('gn_ui_scale','24'));
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('#scorecard-capture')).toHaveClass(/scorecard-fit-rows/);
  await expectRowsInsideContainer(page,'#scorecard-body tr','#scorecard-capture .scorecard-table-wrap');
  await expectScorecardNamesFit(page);

  await page.evaluate(()=>adjustUI(-8));
  await page.evaluate(()=>adjustUI(8));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
  const fitMetrics=await page.evaluate(()=>{
    const root=document.querySelector('#scorecard-capture');
    const wrap=document.querySelector('#scorecard-capture .scorecard-table-wrap');
    const table=wrap?.querySelector('table.scorecard-table');
    const rows=[...table?.querySelectorAll('tbody tr')||[]];
    return {
      rootClass:root?.className||'',
      rootFont:getComputedStyle(document.documentElement).fontSize,
      wrapHeight:wrap?.getBoundingClientRect().height||0,
      tableHeight:table?.getBoundingClientRect().height||0,
      rowHeights:rows.map(row=>row.getBoundingClientRect().height),
      fittedRow:root?.style.getPropertyValue('--scorecard-row-height')||''
    };
  });
  expect(fitMetrics.tableHeight,`scorecard fit metrics: ${JSON.stringify(fitMetrics)}`).toBeLessThanOrEqual(fitMetrics.wrapHeight+1);
  await expect(page.locator('#scorecard-capture')).toHaveClass(/scorecard-fit-rows/);
  await expectRowsInsideContainer(page,'#scorecard-body tr','#scorecard-capture .scorecard-table-wrap');
  await expectScorecardNamesFit(page);
});
