import {expect,test} from '@playwright/test';

const cases=[
  {name:'home-setup',scenario:'home-party',surface:'home',visible:'#home-screen:not(.hidden)'},
  {name:'wizard-scorecard-10-players',scenario:'wizard-10',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'wizard-scorecard-scoring-8-players',scenario:'wizard-scoring-8',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'wizard-scorecard-early-8-players',scenario:'wizard-early-8',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true,assertIdentityTotalAdjacent:true},
  {name:'five-crowns-scorecard-4-players',scenario:'five-crowns-4',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'five-crowns-comeback',scenario:'five-crowns-comeback',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'five-crowns-blowout',scenario:'five-crowns-blowout',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'wizard-bid-entry-10-players',scenario:'wizard-10',surface:'entry-bids',visible:'#score-entry-modal:not(.hidden)',rows:'#score-entry-rows .score-entry-row',container:'#score-entry-modal .score-entry-panel'},
  {name:'five-crowns-score-entry-8-players',scenario:'five-crowns-comeback',surface:'entry-scores',visible:'#score-entry-modal:not(.hidden)',rows:'#score-entry-rows .score-entry-row',container:'#score-entry-modal .score-entry-panel'},
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

async function expectCenteredInVisualViewport(page,{modalSelector,cardSelector,label,gutter=16}){
  const geometry=await page.evaluate(({modalSelector,cardSelector,gutter})=>{
    const modal=document.querySelector(modalSelector);
    const card=document.querySelector(cardSelector);
    if(!modal||!card)return null;
    const visual=window.visualViewport;
    const viewport={
      left:visual?.offsetLeft||0,
      top:visual?.offsetTop||0,
      width:visual?.width||window.innerWidth,
      height:visual?.height||window.innerHeight
    };
    const rect=element=>{
      const box=element.getBoundingClientRect();
      return {left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:box.width,height:box.height};
    };
    const modalBox=rect(modal);
    const cardBox=rect(card);
    const center=box=>({x:box.left+(box.width/2),y:box.top+(box.height/2)});
    const viewportCenter={x:viewport.left+(viewport.width/2),y:viewport.top+(viewport.height/2)};
    const cardCenter=center(cardBox);
    const modalCenter=center(modalBox);
    return {
      modalBox,
      cardBox,
      viewport,
      modalCenterDeltaX:Math.abs(modalCenter.x-viewportCenter.x),
      modalCenterDeltaY:Math.abs(modalCenter.y-viewportCenter.y),
      cardCenterDeltaX:Math.abs(cardCenter.x-viewportCenter.x),
      cardCenterDeltaY:Math.abs(cardCenter.y-viewportCenter.y),
      cardGutter:Math.min(
        cardBox.left-viewport.left,
        viewport.left+viewport.width-cardBox.right,
        cardBox.top-viewport.top,
        viewport.top+viewport.height-cardBox.bottom
      ),
      cardFits:cardBox.left>=viewport.left+gutter-1&&
        cardBox.right<=viewport.left+viewport.width-gutter+1&&
        cardBox.top>=viewport.top+gutter-1&&
        cardBox.bottom<=viewport.top+viewport.height-gutter+1,
      modalPosition:getComputedStyle(modal).position
    };
  },{modalSelector,cardSelector,gutter});

  expect(geometry,`${label} should have painted modal and card boxes`).not.toBeNull();
  expect(geometry.modalPosition,`${label} shell should be fixed to the viewport`).toBe('fixed');
  expect(geometry.modalCenterDeltaX,`${label} shell should be horizontally centered`).toBeLessThanOrEqual(2);
  expect(geometry.modalCenterDeltaY,`${label} shell should be vertically centered`).toBeLessThanOrEqual(2);
  expect(geometry.cardCenterDeltaX,`${label} card should be horizontally centered`).toBeLessThanOrEqual(2);
  expect(geometry.cardCenterDeltaY,`${label} card should be vertically centered`).toBeLessThanOrEqual(2);
  expect(geometry.cardGutter,`${label} card should keep a ${gutter}px visual-viewport gutter`).toBeGreaterThanOrEqual(gutter-0.5);
  expect(geometry.cardFits,`${label} card should remain inside the visual viewport`).toBe(true);
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
    if(view.assertIdentityTotalAdjacent){
      const gap=await page.locator('#scorecard-body tr').first().evaluate(row=>{
        const player=row.querySelector('.scorecard-col-player')?.getBoundingClientRect();
        const total=row.querySelector('.scorecard-col-total')?.getBoundingClientRect();
        return player&&total?Math.abs(total.left-player.right):Infinity;
      });
      expect(gap,'Total should sit directly beside the player identity column').toBeLessThanOrEqual(2);
    }
    if(view.name==='five-crowns-comeback'||view.name==='five-crowns-blowout'){
      const chips=page.locator('button.scorecard-comeback-chip');
      expect(await chips.count(),'scorecard should show Comeback chips').toBeGreaterThan(0);
      expect(await page.locator('button.scorecard-life-preserver-rank').count(),'rank should not be a spin control').toBe(0);
    }
    if(view.name==='five-crowns-blowout'){
      await expect(page.locator('#scorecard-body tr',{hasText:'Linda'}).locator('button.scorecard-comeback-chip')).toHaveCount(1);
      await expect(page.locator('#scorecard-body tr',{hasText:'Vikki'}).locator('button.scorecard-comeback-chip')).toHaveCount(1);
      const extra=page.locator('.score-cell-stack.has-comeback .score-cell-comeback');
      await expect(extra).toHaveCount(1);
      await expect(extra).toHaveText('−15');
    }
    expect(errors,'page should not emit runtime errors').toEqual([]);
    await expect(page).toHaveScreenshot(`${view.name}.png`);
  });
}

test('viewport-centered celebrations use painted visual-viewport geometry',async({page})=>{
  const celebrationRoute='/?gnqa=1&gallery=0&scenario=whammy-8&surface=';
  const waitForModal=async selector=>{
    await expect(page.locator(selector)).toBeVisible();
    await page.waitForTimeout(600);
  };

  await page.goto(`${celebrationRoute}whammy`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await waitForModal('#whammy-modal:not(.hidden)');
  await expect(page.locator('#whammy-title')).toHaveText('WHAMMY!');
  await expectCenteredInVisualViewport(page,{
    modalSelector:'#whammy-modal',
    cardSelector:'#whammy-modal .whammy-card',
    label:'WHAMMY celebration'
  });

  await page.goto(`${celebrationRoute}nolie`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await waitForModal('#whammy-modal:not(.hidden)');
  await expect(page.locator('#whammy-title')).toHaveText('NOLIE!');
  await expectCenteredInVisualViewport(page,{
    modalSelector:'#whammy-modal',
    cardSelector:'#whammy-modal .whammy-card',
    label:'NOLIE celebration'
  });

  await page.goto(`${celebrationRoute}scorecard`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await page.evaluate(()=>showCamiWhammiModal({type:'cami-whammi',round:4,scores:[
    {player:'Megan',score:-20},{player:'Matt',score:-30},{player:'Mike',score:-40},{player:'Cat',score:-20},
    {player:'Vikki',score:-30},{player:'Duke',score:-40},{player:'Brick',score:-20},{player:'Linda',score:-30}
  ]}));
  await waitForModal('#whammy-modal:not(.hidden)');
  await expect(page.locator('#whammy-title')).toHaveText('CAMI WHAMMI!');
  await expectCenteredInVisualViewport(page,{
    modalSelector:'#whammy-modal',
    cardSelector:'#whammy-modal .whammy-card',
    label:'CAMI WHAMMI celebration'
  });
});

test('representative centered modal families use the shared viewport shell',async({page})=>{
  const waitForModal=async selector=>{
    await expect(page.locator(selector)).toBeVisible();
    await page.waitForTimeout(450);
  };
  const measure={
    settings:['#settings-modal','#settings-modal .surface-raised','Settings modal'],
    rules:['#rules-modal','#rules-modal .surface-raised','Rules modal'],
    dealer:['#dealer-modal','#dealer-modal .surface-raised','Dealer modal'],
    retire:['#retire-player-modal','#retire-player-modal .surface-raised','Retire-player modal'],
    reorder:['#reorder-players-modal','#reorder-players-modal .surface-raised','Reorder-players modal'],
    comebackRules:['#comeback-rules-modal','#comeback-rules-modal .comeback-rules-card','Comeback rules modal'],
    victory:['#victory-modal','#victory-modal .postgame-card','Victory modal'],
    loser:['#loser-modal','#loser-modal .postgame-card','Loser modal']
  };

  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=settings',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await waitForModal('#settings-modal:not(.hidden)');
  await expectCenteredInVisualViewport(page,{modalSelector:measure.settings[0],cardSelector:measure.settings[1],label:measure.settings[2]});

  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=entry-scores',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await waitForModal('#score-entry-modal:not(.hidden)');
  await expectCenteredInVisualViewport(page,{
    modalSelector:'#score-entry-modal',
    cardSelector:'#score-entry-modal .score-entry-panel',
    label:'Score-entry modal'
  });

  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  for(const [name,fn] of [['rules','openRules'],['dealer','openDealerModal'],['retire','openRetirePlayerModal'],['reorder','openReorderPlayersModal'],['comebackRules','openComebackRules']]){
    await page.evaluate(fnName=>window[fnName](),fn);
    await waitForModal(`${measure[name][0]}:not(.hidden)`);
    await expectCenteredInVisualViewport(page,{modalSelector:measure[name][0],cardSelector:measure[name][1],label:measure[name][2]});
    await page.evaluate(selector=>document.querySelector(selector)?.classList.add('hidden'),measure[name][0]);
  }

  for(const [name,modalSelector] of [['victory','#victory-modal'],['loser','#loser-modal']]){
    await page.evaluate(selector=>{
      const modal=document.querySelector(selector);
      modal?.classList.remove('hidden','opacity-0');
    },modalSelector);
    await waitForModal(`${modalSelector}:not(.hidden)`);
    await expectCenteredInVisualViewport(page,{modalSelector:measure[name][0],cardSelector:measure[name][1],label:measure[name][2]});
    await page.evaluate(selector=>document.querySelector(selector)?.classList.add('hidden'),modalSelector);
  }
});

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

test('view-pace-switch-is-compact-and-controls-pace-and-rounds-with-accessible-runtime-state',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=scorecard',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');

  const toggle=page.locator('#scorecard-view-pace-toggle');
  await expect(page.locator('#scorecard-view-toggle-wrap')).toBeVisible();
  await expect(toggle).toHaveRole('switch',{name:'View Pace'});
  await expect(toggle).toHaveAttribute('aria-label','View Pace');
  await expect(toggle).toHaveAttribute('aria-checked','true');
  await expect(toggle).toContainText('View Pace');
  await expect(toggle).not.toContainText('ON');
  await expect(toggle).not.toContainText('OFF');
  await expect(page.locator('#scorecard-view-toggle-state')).toHaveCount(0);
  await expect(page.locator('#record-chase-panel')).toBeVisible();
  const paceRoundCount=await page.locator('#scorecard-head [data-sc-round]').count();
  expect(paceRoundCount,'Player Pace should show more than the old two-round slice').toBeGreaterThanOrEqual(2);
  expect(paceRoundCount,'Player Pace should cap visible rounds at the latest five').toBeLessThanOrEqual(5);
  expect(await page.locator('.record-chase-row').count(),'Record Chase should have one row per player').toBe(10);
  expect(await page.locator('.record-chase-row .record-chase-avatar').count(),'Player Pace should not duplicate the scorecard avatars').toBe(0);
  expect(await page.locator('.record-chase-secondary').count(),'Record Chase should not include a supporting metric column').toBe(0);
  await expectRowsInsideContainer(page,'.record-chase-row','#record-chase-list');

  const toggleGeometry=await page.evaluate(()=>{
    const toggle=document.querySelector('#scorecard-view-pace-toggle');
    const label=document.querySelector('.scorecard-view-toggle-label');
    const box=toggle?.getBoundingClientRect();
    const viewport={width:window.innerWidth,height:window.innerHeight};
    return {
      width:box?.width||0,
      height:box?.height||0,
      fitsViewport:!!box&&box.left>=0&&box.top>=0&&box.right<=viewport.width+1&&box.bottom<=viewport.height+1,
      labelWhiteSpace:label?getComputedStyle(label).whiteSpace:''
    };
  });
  expect(toggleGeometry.width,'View Pace switch should have a painted width').toBeGreaterThan(0);
  expect(toggleGeometry.width,'View Pace switch should be materially narrower without visible state text').toBeLessThanOrEqual(135);
  expect(toggleGeometry.height,'View Pace switch should have a painted height').toBeGreaterThan(0);
  expect(toggleGeometry.fitsViewport,'View Pace switch should remain inside each target viewport').toBe(true);
  expect(toggleGeometry.labelWhiteSpace,'View Pace label should remain on one line').toBe('nowrap');

  await toggle.focus();
  expect(await toggle.evaluate(element=>document.activeElement===element),'View Pace switch should be keyboard focusable').toBe(true);
  await page.keyboard.press('Space');
  await expect(page.locator('#record-chase-panel')).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-checked','false');
  await expect(toggle).not.toContainText('ON');
  await expect(toggle).not.toContainText('OFF');
  await expect(page.locator('#scorecard-live-layout')).not.toHaveClass(/record-chase-active/);
  expect(await page.locator('#scorecard-head [data-sc-round]').count(),'the traditional scorecard should restore every completed round').toBe(5);

  await page.keyboard.press('Enter');
  await expect(page.locator('#record-chase-panel')).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked','true');
  await expect(toggle).not.toContainText('ON');
  await expect(toggle).not.toContainText('OFF');
  await expect(page.locator('#scorecard-live-layout')).toHaveClass(/record-chase-active/);
  const restoredRoundCount=await page.locator('#scorecard-head [data-sc-round]').count();
  expect(restoredRoundCount,'restoring Player Pace should keep the latest five-round window').toBeGreaterThanOrEqual(2);
  expect(restoredRoundCount,'restoring Player Pace should cap visible rounds at the latest five').toBeLessThanOrEqual(5);
});

test('record-chase-preview keeps real player history and aligned metrics',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=record-chase-preview&surface=scorecard',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');

  const rows=page.locator('.record-chase-row');
  await expect(rows).toHaveCount(8);
  await expectRowsInsideContainer(page,'.record-chase-row','#record-chase-list');
  await expect(page.locator('#record-chase-panel')).toHaveAttribute('aria-label','Player Pace metrics');
  await expect(page.locator('.record-chase-head-label')).toHaveText(['Best','Avg','Worst']);
  await expect(page.locator('.record-chase-head-now')).toHaveCount(0);
  await expect(page.locator('.record-chase-head')).not.toContainText('Record Chase');
  await expect(page.locator('.record-chase-head')).not.toContainText('ahead of');
  await expect(page.locator('.record-chase-head')).not.toContainText('now');
  await expect(page.locator('.record-chase-pace')).toHaveCount(0);

  const metrics=await rows.evaluateAll(elements=>elements.map(element=>({
    player:element.getAttribute('data-player')||'',
    title:element.getAttribute('title')||'',
    scores:[...element.querySelectorAll('.record-chase-score')].map(score=>(score.textContent||'').trim())
  })));
  expect(metrics.map(metric=>metric.player)).toEqual(['Megan','Matt','Cat','Mike','Vikki','Duke','Brick','Linda']);
  expect(metrics.find(metric=>metric.player==='Brick')?.scores).toEqual(['—','—','—']);
  expect(metrics.find(metric=>metric.player==='Brick')?.title.startsWith('Brick ·'),'Brick should remain the intentional fresh scorecard').toBe(true);
  expect(Object.fromEntries(metrics.map(metric=>[metric.player,metric.scores]))).toEqual({
    Megan:['60','50','40'],
    Matt:['80','65','50'],
    Cat:['60','45','30'],
    Mike:['20','5','-20'],
    Vikki:['60','50','40'],
    Duke:['50','10','-20'],
    Brick:['—','—','—'],
    Linda:['40','3','-20']
  });
  expect(metrics.filter(metric=>metric.player!=='Brick').every(metric=>metric.scores.every(score=>score!=='—')),'players with history should show best, average, and worst').toBe(true);

  const rowAlignment=await page.evaluate(()=>{
    const scoreRows=[...document.querySelectorAll('#scorecard-body tr')].map(row=>row.getBoundingClientRect().y);
    const paceRows=[...document.querySelectorAll('.record-chase-row')].map(row=>row.getBoundingClientRect().y);
    return scoreRows.map((y,index)=>Math.abs(y-(paceRows[index]??Infinity)));
  });
  expect(rowAlignment.every(gap=>gap<=2),'Player Pace rows should stay aligned with the corresponding player rows').toBe(true);

  const pairNumbersFit=await page.locator('.record-chase-score').evaluateAll(elements=>elements.every(element=>
    element.scrollWidth<=element.clientWidth+1
  ));
  expect(pairNumbersFit,'Player Pace pair numbers should fit without clipping').toBe(true);

  const alignment=await page.evaluate(()=>{
    const center=element=>{
      const box=element?.getBoundingClientRect();
      return box?box.left+(box.width/2):null;
    };
    const headCells=[...document.querySelectorAll('.record-chase-head-label')];
    const firstRow=[...document.querySelectorAll('.record-chase-row')[0].querySelectorAll('.record-chase-score')];
    return headCells.map((head,index)=>({
      label:(head.textContent||'').trim(),
      gap:Math.abs(center(head)-center(firstRow[index]))
    }));
  });
  expect(alignment.map(item=>item.label)).toEqual(['Best','Avg','Worst']);
  expect(alignment.every(item=>item.gap<=2),'each pace header should align with its numbers').toBe(true);

  const bestButton=page.locator('.record-chase-row[data-player="Megan"] button.record-chase-score').first();
  await expect(bestButton).toHaveAttribute('aria-label',/Best 60/);
  await expect(bestButton).toBeVisible();
  await bestButton.click();
  await expect(page.locator('#scorecard-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#modal-game-name')).toContainText('Wizard');
  await page.locator('#scorecard-modal button').first().click();
  await expect(page.locator('#scorecard-modal')).toBeHidden();
});

test('beat-the-heat pace still opens the best finished scorecard',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=beat-the-heat-pace&surface=scorecard',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');

  await expect(page.locator('.record-chase-head-label')).toHaveText(['Best','Avg','Worst']);
  await expect(page.locator('.record-chase-pace')).toHaveCount(0);
  const linda=page.locator('.record-chase-row[data-player="Linda"]');
  await expect(linda).toHaveCount(1);
  const lindaScores=await linda.locator('.record-chase-score').evaluateAll(elements=>elements.map(element=>(element.textContent||'').trim()));
  expect(lindaScores,'Linda Best/Avg/Worst should keep the 5-point finish').toEqual(['5','45','62']);
  expect(await linda.locator('.record-chase-score').nth(1).locator('button').count(),'Average should stay non-clickable').toBe(0);
  expect(await linda.locator('button.record-chase-score').count(),'only Best and Worst should open a scorecard').toBe(2);
  const lindaTotal=await page.locator('#scorecard-body tr').filter({hasText:'Linda'}).locator('.scorecard-total-value').innerText();
  expect(lindaTotal.trim()).toBe('36');
  await expect(linda.locator('button.record-chase-score').first()).toHaveAttribute('aria-label',/Best 5/);
  await linda.locator('button.record-chase-score').first().click();
  await expect(page.locator('#scorecard-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#modal-scorecard-body')).toContainText('Linda');
  const lindaHistoryTotal=await page.locator('#modal-scorecard-body tr').filter({hasText:'Linda'}).locator('.scorecard-total-value').innerText();
  expect(lindaHistoryTotal.trim(),'Best should open the 5-point scorecard').toBe('5');
});

test('late eight-player five crowns shows five rounds beside Best Avg Worst',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Check the late eight-player pace layout once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-late-8&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');

  await expect(page.locator('#record-chase-panel')).toBeVisible();
  await expect(page.locator('.record-chase-head-label')).toHaveText(['Best','Avg','Worst']);
  await expect(page.locator('.record-chase-head-now')).toHaveCount(0);
  await expect(page.locator('#scorecard-head [data-sc-round]')).toHaveCount(5);
  await expect(page.locator('#scorecard-head [data-sc-round]').first()).toHaveAttribute('data-sc-round-label','6');
  await expect(page.locator('#scorecard-head [data-sc-round]').last()).toHaveAttribute('data-sc-round-label','10');
  await expect(page.locator('.record-chase-row')).toHaveCount(8);
  await expect(page.locator('.record-chase-row').first().locator('.record-chase-score')).toHaveCount(3);
  await expect(page.locator('#round-intel')).toHaveText(/Hand of 13|Ks Wild|R11/);
});

test('late five-crowns totals stay centered and names stay whole',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-late&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');

  const totals=await page.evaluate(()=>{
    const center=element=>{
      const box=element.getBoundingClientRect();
      return box.left+box.width/2;
    };
    return [...document.querySelectorAll('#scorecard-body tr')].map(row=>{
      const cell=row.querySelector('.scorecard-col-total');
      const value=row.querySelector('.scorecard-total-value');
      const name=row.querySelector('.scoreboard-player-name');
      const playerCell=row.querySelector('.scorecard-col-player');
      const nameBox=name.getBoundingClientRect();
      const playerBox=playerCell.getBoundingClientRect();
      return {
        name:(name?.textContent||'').trim(),
        total:(value?.textContent||'').trim(),
        totalFits:value.scrollWidth<=cell.clientWidth+1,
        totalCenterGap:Math.abs(center(cell)-center(value)),
        nameFits:nameBox.right<=playerBox.right+1
      };
    });
  });
  expect(totals.map(row=>row.total),'late Five Crowns should include three-digit totals').toEqual(expect.arrayContaining(['123','135']));
  expect(totals.every(row=>row.totalFits),'three-digit totals should stay inside the Total column').toBe(true);
  expect(totals.every(row=>row.totalCenterGap<=2),'three-digit totals should stay centered in the Total column').toBe(true);
  expect(totals.find(row=>row.name==='Michelle')?.nameFits,'Michelle should not be clipped').toBe(true);

  await page.locator('#scorecard-view-pace-toggle').click();
  await expect(page.locator('#record-chase-panel')).toBeHidden();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))));
  const namesAfter=await page.evaluate(()=>[...document.querySelectorAll('#scorecard-body .scoreboard-player-name')].map(name=>{
    const label=name.querySelector('.dealer-player-label')||name;
    const playerCell=name.closest('.scorecard-col-player');
    return {
      text:(label.textContent||'').trim(),
      fits:label.getBoundingClientRect().right<=playerCell.getBoundingClientRect().right+1,
      overflow:getComputedStyle(label).textOverflow
    };
  }));
  expect(namesAfter.find(name=>name.text==='Michelle')?.fits,'Michelle should stay whole with every round visible or trimmed').toBe(true);
  expect(namesAfter.every(name=>name.overflow==='clip'),'live player names should never use an ellipsis').toBe(true);
  const totalsOff=await page.evaluate(()=>[...document.querySelectorAll('#scorecard-body .scorecard-total-value')].map(value=>{
    const cell=value.closest('.scorecard-col-total');
    const center=element=>{
      const box=element.getBoundingClientRect();
      return box.left+box.width/2;
    };
    return {
      total:(value.textContent||'').trim(),
      fits:value.scrollWidth<=cell.clientWidth+1,
      centerGap:Math.abs(center(cell)-center(value))
    };
  }));
  expect(totalsOff.filter(row=>row.total.length>=3).every(row=>row.fits&&row.centerGap<=2),'three-digit totals should stay centered after hiding Player Pace').toBe(true);
});

test('five-crowns first round uses compact avatar-led player identities',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-name-fit-7&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
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

  const scorecard=page.locator('#scorecard-capture');
  await expect(scorecard.locator('.drag-handle')).toHaveCount(0);
  await expect(scorecard.getByText('▲',{exact:true})).toHaveCount(0);
  await expect(scorecard.getByText('▼',{exact:true})).toHaveCount(0);

  const firstRow=page.locator('#scorecard-body tr').first();
  const avatar=firstRow.locator('.scorecard-avatar-slot');
  expect(await avatar.getAttribute('draggable'),'the avatar should be the drag handle').toBe('true');
  const identityGeometry=await firstRow.evaluate(row=>{
    const cell=row.querySelector('.scorecard-col-player');
    const avatar=row.querySelector('.scorecard-avatar-slot');
    const name=row.querySelector('.scoreboard-player-name');
    const cellRect=cell.getBoundingClientRect();
    const avatarRect=avatar.getBoundingClientRect();
    const nameRect=name.getBoundingClientRect();
    return {
      avatarInset:avatarRect.left-cellRect.left,
      nameGap:nameRect.left-avatarRect.right
    };
  });
  expect(identityGeometry.avatarInset,'avatar should align beneath the Player heading').toBeLessThanOrEqual(22);
  expect(identityGeometry.nameGap,'name should sit immediately beside the avatar').toBeLessThanOrEqual(5);

  const dealer=page.locator('#scorecard-body button.dealer-name-indicator');
  await expect(dealer).toHaveCount(1);
  expect((await dealer.innerText()).trim()).toBe('MEGAN');
  const dealerGeometry=await dealer.evaluate(button=>{
    const label=button.querySelector('.dealer-player-label');
    const buttonRect=button.getBoundingClientRect();
    const labelRect=label.getBoundingClientRect();
    return {
      leftInset:labelRect.left-buttonRect.left,
      rightInset:buttonRect.right-labelRect.right,
      paddingLeft:getComputedStyle(button).paddingLeft,
      paddingRight:getComputedStyle(button).paddingRight
    };
  });
  expect(dealerGeometry.paddingLeft).toBe('0px');
  expect(dealerGeometry.paddingRight).toBe('0px');
  expect(dealerGeometry.leftInset,'green dealer border should hug the M').toBeLessThanOrEqual(2.5);
  expect(dealerGeometry.rightInset,'green dealer border should hug the name').toBeLessThanOrEqual(2.5);
  await expect(firstRow.locator('.scorecard-avatar-slot .scorecard-dealer-avatar-badge')).toHaveCount(1);
});

test('navigation and match header ignore scorecard text-size zoom',async({page})=>{
  const selectors={
    brand:'#top-nav .bp-brand-main',
    brandGames:'#top-nav .bp-brand-games',
    nav:'#top-nav .nav-btn',
    game:'#game-title',
    round:'#round-intel',
    actions:'#actions-btn',
    save:'#game-screen .active-match-banner .match-end-btn'
  };
  const readSizes=()=>page.evaluate(entries=>Object.fromEntries(Object.entries(entries).map(([key,selector])=>[
    key,
    Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)
  ])),selectors);

  await page.addInitScript(()=>localStorage.setItem('gn_ui_scale','16'));
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  const normal=await readSizes();

  await page.evaluate(()=>adjustUI(-8));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const reduced=await readSizes();
  expect(reduced).toEqual(normal);
});

test('score-entry avatars stay ready when the connection drops',async({page,context})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await page.waitForFunction(()=>{
    const avatars=[...document.querySelectorAll('#scorecard-body img')];
    return avatars.length>0&&avatars.every(img=>img.complete&&img.naturalWidth>0);
  });

  await context.setOffline(true);
  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-modal:not(.hidden)')).toBeVisible();
  const avatarState=await page.locator('#score-entry-modal img').evaluateAll(avatars=>({
    count:avatars.length,
    ready:avatars.every(img=>img.complete&&img.naturalWidth>0)
  }));
  expect(avatarState.count,'score-entry modal should contain player avatars').toBeGreaterThan(0);
  expect(avatarState.ready,'cached player avatars should paint immediately').toBe(true);
});

test('score-entry shows progress and live entered states',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=entry-scores',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('#score-entry-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#score-entry-progress')).toHaveText('0 of 8 scores entered');
  await expect(page.locator('.score-entry-row.is-empty')).toHaveCount(8);
  await expect(page.locator('.score-entry-row.is-complete')).toHaveCount(0);

  await page.getByRole('button',{name:'7',exact:true}).click();
  await expect(page.locator('#score-entry-progress')).toHaveText('1 of 8 scores entered');
  await expect(page.locator('.score-entry-row.is-complete')).toHaveCount(1);
  await expect(page.locator('.score-entry-row.is-empty')).toHaveCount(7);
  await expect(page.locator('.score-entry-row.is-complete .score-entry-row-status')).toHaveText('✓');
  await expect(page.locator('.score-entry-row.is-complete')).toHaveAttribute('aria-label',/score entered/);
  await expect(page.getByRole('button',{name:'Review Scores',exact:true})).toBeVisible();
});

test('score-entry acknowledgement handles explicit zero and blank Next',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=entry-scores',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('#score-entry-progress')).toHaveText('0 of 8 scores entered');

  await page.getByRole('button',{name:'0',exact:true}).click();
  await expect(page.locator('#score-entry-progress')).toHaveText('1 of 8 scores entered');
  await expect(page.locator('.score-entry-row.is-complete')).toHaveCount(1);
  const explicitZero=page.locator('.score-entry-row.is-complete').first();
  await expect(explicitZero.locator('.score-entry-value')).toHaveText('0');

  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('#score-entry-progress')).toHaveText('0 of 8 scores entered');
  const firstRowId=await page.locator('#score-entry-rows .score-entry-row.active').getAttribute('id');
  const firstRow=page.locator(`#${firstRowId}`);
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('#score-entry-progress')).toHaveText('1 of 8 scores entered');
  await expect(firstRow).toHaveClass(/is-complete/);
  await expect(firstRow.locator('.score-entry-value')).toHaveText('0');
  await firstRow.click();
  await expect(firstRow).toHaveClass(/is-complete/);
});

test('score-entry Next acknowledges prefilled values without changing them',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-scoring-8&surface=entry-scores',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('.score-entry-row.is-complete')).toHaveCount(0);

  const prefilledRow=page.locator('#score-entry-row-Matt');
  await expect(prefilledRow.locator('.score-entry-value')).toHaveText('1');
  await prefilledRow.click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(prefilledRow).toHaveClass(/is-complete/);
  await expect(prefilledRow.locator('.score-entry-value')).toHaveText('1');
  await expect(page.locator('#score-entry-progress')).toHaveText('1 of 8 tricks entered · Tricks: 1 / 1');
});

test('bid-entry acknowledgement accepts an explicit zero',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=entry-bids',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('.score-entry-row.is-complete')).toHaveCount(0);
  const activeRowId=await page.locator('#score-entry-rows .score-entry-row.active').getAttribute('id');
  await page.getByRole('button',{name:'0',exact:true}).click();
  await expect(page.locator(`#${activeRowId}`)).toHaveClass(/is-complete/);
  await expect(page.locator('#score-entry-progress')).toHaveText(/1 of 10 bids entered/);
});

test('Wizard rejects bids outside the available trick range',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=entry-bids',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await page.getByRole('button',{name:'9',exact:true}).click();
  let message='';
  page.once('dialog',async dialog=>{
    message=dialog.message();
    await dialog.accept();
  });
  await page.getByRole('button',{name:'Lock Bids',exact:true}).click();
  expect(message).toContain('Wizard bids must be from 0 to 6');
  await expect(page.locator('#score-entry-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#round-intel')).toContainText('Bidding');
});

test('active scorecard columns and panels stay geometrically aligned',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('#scorecard-head th.scorecard-col-bid')).toHaveCount(0);
  await expect(page.locator('.wizard-current-bid')).toHaveCount(0);

  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-scoring-8&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  const bidHeader=page.locator('#scorecard-head th.scorecard-col-bid');
  await expect(bidHeader).toHaveCount(1);
  await expect(bidHeader).toContainText('BID');
  await expect(bidHeader).toHaveText(/BID\s*1\/1/);
  await expect(page.locator('#scorecard-body .wizard-current-bid')).toHaveCount(8);

  const geometry=await page.evaluate(()=>{
    const center=element=>{
      const box=element?.getBoundingClientRect();
      return box?box.left+box.width/2:null;
    };
    const headerBid=document.querySelector('#scorecard-head th.scorecard-col-bid');
    const headerTotal=document.querySelector('#scorecard-head th.scorecard-col-total');
    const rowBid=document.querySelector('#scorecard-body tr .scorecard-col-bid');
    const bidPills=[...document.querySelectorAll('#scorecard-body tr .wizard-current-bid')];
    const rowTotal=document.querySelector('#scorecard-body tr .scorecard-col-total');
    const value=document.querySelector('.wizard-current-bid-value');
    const nav=document.querySelector('#top-nav');
    const banner=document.querySelector('#game-screen .active-match-banner');
    const actions=[
      document.querySelector('#scorecard-view-toggle-wrap'),
      document.querySelector('#actions-btn'),
      document.querySelector('.match-end-btn')
    ].map(element=>element?.getBoundingClientRect());
    return {
      headerBeforeTotal:(headerBid?.getBoundingClientRect().right||Infinity)<=(headerTotal?.getBoundingClientRect().left||-Infinity)+1,
      rowBeforeTotal:(rowBid?.getBoundingClientRect().right||Infinity)<=(rowTotal?.getBoundingClientRect().left||-Infinity)+1,
      bidHeaderPillAlignments:bidPills.map(pill=>Math.abs(center(headerBid)-center(pill))),
      totalHeaderCellAlignment:Math.abs(center(headerTotal)-center(rowTotal)),
      firstTotalValue:(rowTotal?.textContent||'').trim(),
      navBannerGap:(banner?.getBoundingClientRect().top||Infinity)-(nav?.getBoundingClientRect().bottom||-Infinity),
      bidFont:getComputedStyle(value).fontFamily,
      bidWhiteSpace:getComputedStyle(value).whiteSpace,
      bidFits:value?.scrollWidth<=value?.clientWidth+1,
      actionYs:actions.map(box=>box?.top||null),
      actionWidths:actions.map(box=>box?.width||0)
    };
  });
  expect(geometry.headerBeforeTotal,'BID header should be immediately left of Total').toBe(true);
  expect(geometry.rowBeforeTotal,'bid pills should stay immediately left of Total values').toBe(true);
  expect(geometry.bidHeaderPillAlignments.every(gap=>gap<=1),'BID header should align with the geometric center of every bid pill').toBe(true);
  expect(geometry.totalHeaderCellAlignment,'TOTAL header should align with each total value').toBeLessThanOrEqual(1);
  expect(geometry.firstTotalValue,'the scorecard geometry fixture should include an explicit zero total').toBe('0');
  expect(geometry.navBannerGap,'active-match nav and banner should have a visible 10–12px separation').toBeGreaterThanOrEqual(10);
  expect(geometry.navBannerGap,'active-match nav and banner should keep the intended compact separation').toBeLessThanOrEqual(12.5);
  expect(geometry.bidFont,'large bid digits should use the display font').toContain('Londrina Solid');
  expect(geometry.bidWhiteSpace,'bid digits should stay on one line').toBe('nowrap');
  expect(geometry.bidFits,'bid digits should fit inside their pills').toBe(true);
  expect(Math.max(...geometry.actionYs)-Math.min(...geometry.actionYs),'scorecard actions should stay on one row').toBeLessThanOrEqual(1);
  expect(geometry.actionWidths.every(width=>width>0),'scorecard actions should remain visible').toBe(true);

  await page.goto('/?gnqa=1&gallery=0&scenario=record-chase-preview&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  const variedTotals=await page.evaluate(()=>{
    const center=element=>{
      const box=element?.getBoundingClientRect();
      return box?box.left+(box.width/2):null;
    };
    const header=document.querySelector('#scorecard-head th.scorecard-col-total');
    const cells=[...document.querySelectorAll('#scorecard-body tr .scorecard-col-total')];
    const nav=document.querySelector('#top-nav');
    const banner=document.querySelector('#game-screen .active-match-banner');
    return {
      values:cells.map(cell=>(cell.textContent||'').trim()),
      totalHeaderCellAlignments:cells.map(cell=>Math.abs(center(header)-center(cell))),
      navBannerGap:(banner?.getBoundingClientRect().top||Infinity)-(nav?.getBoundingClientRect().bottom||-Infinity)
    };
  });
  expect(variedTotals.values,'varied-total fixture should include positive and negative values').toEqual(expect.arrayContaining(['70','-30']));
  expect(variedTotals.values.some(value=>/^\d{2,}$/.test(value)),'varied-total fixture should include a multi-digit positive value').toBe(true);
  expect(variedTotals.totalHeaderCellAlignments.every(gap=>gap<=1),'every varied total should align with the TOTAL header').toBe(true);
  expect(variedTotals.navBannerGap,'record-chase active-match panels should keep the same separation').toBeGreaterThanOrEqual(10);
  expect(variedTotals.navBannerGap,'record-chase active-match panels should keep the same compact separation').toBeLessThanOrEqual(12.5);
});

test('ties finish normally without a tiebreaker prompt',async({page})=>{
  await page.addInitScript(()=>{
    const roster=['Alex','Blair'];
    localStorage.setItem('gn_all_players',JSON.stringify(roster));
    localStorage.setItem('gn_players_v2',JSON.stringify(roster));
    localStorage.setItem('gn_history','[]');
    localStorage.setItem('gn_profiles','{}');
    localStorage.setItem('gn_pref_statmontage','0');
    localStorage.setItem('gn_current',JSON.stringify({
      name:'Five Crowns',originalRoster:roster,currentRound:2,
      rounds:[{round:1,scores:{Alex:10,Blair:10}}],totals:{Alex:10,Blair:10},
      hailMaryUsed:[],retired:[],currentScoreDrafts:{}
    }));
  });
  await page.goto('/',{waitUntil:'networkidle'});
  await expect(page.locator('#game-screen:not(.hidden)')).toBeVisible();
  expect(await page.locator('#sudden-death-modal').count(),'the removed tiebreaker UI should not exist').toBe(0);

  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Save & End',exact:true}).click();
  await expect(page.locator('#victory-modal:not(.hidden)')).toBeVisible();
  await expect(page.locator('#victory-names')).toContainText('Alex');
  await expect(page.locator('#victory-names')).toContainText('Blair');
  await expect(page.locator('#victory-names')).toContainText('Tie!');
});

test('undo last Five Crowns hand keeps Comeback chips on stranded players',async({page})=>{
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await expect(page.locator('button.scorecard-comeback-chip')).not.toHaveCount(0);

  await page.getByRole('button',{name:/Actions/}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Undo Last Round',exact:true}).click();

  await expect(page.locator('button.scorecard-comeback-chip')).not.toHaveCount(0);
  await expect(page.locator('#round-intel')).toContainText('Hand of 10');
});

test('starting another game preserves and resumes Wizard and 818 entry state',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('gn_pref_lineupintro','0');
    localStorage.setItem('gn_pref_dealerroll','0');
  });

  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-scoring-8&surface=scorecard',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await page.evaluate(()=>{
    Object.assign(ensureCurrentScoreDrafts(),{Megan:2,Matt:1});
    saveData();
  });
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(()=>startGame('818'));

  let history=await page.evaluate(()=>JSON.parse(localStorage.getItem('gn_history')||'[]'));
  const wizard=history.find(match=>match.game==='Wizard'&&match.wizardPhase==='scoring'&&match.currentScoreDrafts?.Megan===2);
  expect(wizard,'Wizard snapshot should persist its scoring phase, bids, and drafts').toBeTruthy();
  expect(wizard.currentBids.Matt).toBe(1);
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(id=>resumeMatch(id),wizard.id);
  let resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('gn_current')));
  expect(resumed.wizardPhase).toBe('scoring');
  expect(resumed.currentBids.Matt).toBe(1);
  expect(resumed.currentScoreDrafts).toMatchObject({Megan:2,Matt:1});

  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&surface=home',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
  await page.evaluate(()=>startGame('818'));
  await page.evaluate(()=>{
    submitRound({skipConfirm:true});
    Object.assign(ensureCurrentScoreDrafts(),{Megan:3,Matt:2});
    saveData();
  });
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(()=>startGame('Five Crowns'));

  history=await page.evaluate(()=>JSON.parse(localStorage.getItem('gn_history')||'[]'));
  const eight18=history.find(match=>match.game==='818'&&match.eight18Phase==='scoring'&&match.currentScoreDrafts?.Megan===3);
  expect(eight18,'818 snapshot should persist its scoring phase, bids, and drafts').toBeTruthy();
  expect(eight18.currentBids).toBeTruthy();
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(id=>resumeMatch(id),eight18.id);
  resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('gn_current')));
  expect(resumed.eight18Phase).toBe('scoring');
  expect(resumed.currentScoreDrafts).toMatchObject({Megan:3,Matt:2});
});

test('player rename migrates drafts and Rook identity references',async({page})=>{
  await page.addInitScript(()=>{
    const roster=['Megan','Matt','Cat','Mike'];
    const rookRound={round:1,scores:{Megan:90,Matt:90,Cat:110,Mike:110},rookBid:90,rookBidder:'Megan',rookPartner:'Matt'};
    const saved={
      id:101,game:'Rook',originalRoster:[...roster],currentRound:2,rounds:[structuredClone(rookRound)],
      totals:{Megan:90,Matt:90,Cat:110,Mike:110},winners:['Cat','Mike'],hailMaryUsed:[],retired:[],
      currentBids:{Megan:1},currentScoreDrafts:{Megan:7},rookHighBidder:'Megan',rookPartner:'Matt'
    };
    localStorage.setItem('gn_all_players',JSON.stringify(roster));
    localStorage.setItem('gn_players_v2',JSON.stringify(roster));
    localStorage.setItem('gn_profiles',JSON.stringify({Megan:{color:1}}));
    localStorage.setItem('gn_history',JSON.stringify([saved]));
    localStorage.setItem('gn_current',JSON.stringify({
      name:'Rook',originalRoster:[...roster],currentRound:2,rounds:[rookRound],
      totals:{Megan:90,Matt:90,Cat:110,Mike:110},hailMaryUsed:[],retired:[],currentBids:{Megan:2},
      currentScoreDrafts:{Megan:8},rookConfig:{winTarget:300,minBid:70,totalCounters:200},
      rookPhase:'results',rookHighBid:90,rookHighBidder:'Megan',rookPartner:'Matt'
    }));
  });
  await page.goto('/',{waitUntil:'networkidle'});
  await page.evaluate(()=>renamePlayerEverywhere('Megan','Meg'));

  const state=await page.evaluate(()=>({
    current:JSON.parse(localStorage.getItem('gn_current')),
    history:JSON.parse(localStorage.getItem('gn_history')),
    players:JSON.parse(localStorage.getItem('gn_players_v2')),
    profiles:JSON.parse(localStorage.getItem('gn_profiles'))
  }));
  expect(state.current.currentBids).toEqual({Meg:2});
  expect(state.current.currentScoreDrafts).toEqual({Meg:8});
  expect(state.current.rookHighBidder).toBe('Meg');
  expect(state.current.rounds[0].rookBidder).toBe('Meg');
  expect(state.history[0].currentBids).toEqual({Meg:1});
  expect(state.history[0].currentScoreDrafts).toEqual({Meg:7});
  expect(state.history[0].rookHighBidder).toBe('Meg');
  expect(state.history[0].rounds[0].rookBidder).toBe('Meg');
  expect(state.players).toContain('Meg');
  expect(state.players).not.toContain('Megan');
  expect(state.profiles.Meg).toEqual({color:1});
});

test('all six game types reach their first scoring surface',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('gn_pref_lineupintro','0');
    localStorage.setItem('gn_pref_dealerroll','0');
  });
  const games=[
    {button:'Five Crowns',title:'Five Crowns',action:'Log Scores'},
    {button:'Wizard',title:'Wizard',action:'Log Bids'},
    {button:'818',title:'818',action:'Log Bids'},
    {button:'Flip 7',title:'Flip 7 Vengeance',action:'Log Scores'},
    {button:'Beat the Heat',title:'Beat the Heat',action:'Log Heat'},
    {button:'Rook',title:'Rook',action:'Trump & partner card →',rook:true}
  ];
  for(const game of games){
    await page.goto('/?gnqa=1&gallery=0&scenario=home-party&surface=home',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
    await page.getByRole('button',{name:game.button,exact:true}).click();
    if(game.rook)await page.getByRole('button',{name:'Start Match →',exact:true}).click();
    await expect(page.locator('#game-title')).toHaveText(game.title);
    await expect(page.getByRole('button',{name:game.action,exact:true})).toBeVisible();
  }
});
