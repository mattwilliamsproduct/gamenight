import {expect,test} from '@playwright/test';

const cases=[
  {name:'home-setup',scenario:'home-party',surface:'home',visible:'#home-screen:not(.hidden)'},
  {name:'wizard-scorecard-10-players',scenario:'wizard-10',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'wizard-scorecard-scoring-8-players',scenario:'wizard-scoring-8',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'wizard-scorecard-early-8-players',scenario:'wizard-early-8',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true,assertIdentityTotalAdjacent:true},
  {name:'five-crowns-scorecard-4-players',scenario:'five-crowns-4',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
  {name:'five-crowns-life-preservers',scenario:'five-crowns-preservers',surface:'scorecard',visible:'#game-screen:not(.hidden)',rows:'#scorecard-body tr',container:'#scorecard-capture .scorecard-table-wrap',assertScorecardScale:true},
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
    if(view.assertIdentityTotalAdjacent){
      const gap=await page.locator('#scorecard-body tr').first().evaluate(row=>{
        const player=row.querySelector('.scorecard-col-player')?.getBoundingClientRect();
        const total=row.querySelector('.scorecard-col-total')?.getBoundingClientRect();
        return player&&total?Math.abs(total.left-player.right):Infinity;
      });
      expect(gap,'Total should sit directly beside the player identity column').toBeLessThanOrEqual(2);
    }
    if(view.name==='five-crowns-life-preservers'){
      const available=page.locator('button.scorecard-life-preserver-rank');
      const used=page.locator('.scorecard-life-preserver-rank-used');
      const availableCount=await available.count();
      expect(availableCount,'scorecard should show available Life Preservers').toBeGreaterThan(0);
      expect(await used.count(),'scorecard should show used Life Preservers').toBeGreaterThan(0);
      const size=await available.nth(0).evaluate(element=>({
        width:element.getBoundingClientRect().width,
        height:element.getBoundingClientRect().height
      }));
      expect(size.width,'Life Preserver rank should remain noticeable').toBeGreaterThanOrEqual(24);
      expect(size.height,'Life Preserver rank should remain noticeable').toBeGreaterThanOrEqual(24);
      expect(await page.locator('.scorecard-avatar-slot .scorecard-life-preserver').count(),'Life Preserver should not cover the avatar').toBe(0);
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
    save:'#game-screen .active-match-banner .btn-accent'
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
