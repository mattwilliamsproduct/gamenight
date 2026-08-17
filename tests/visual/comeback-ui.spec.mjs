import {expect,test} from '@playwright/test';

const blowoutUrl='/?gnqa=1&gallery=0&scenario=five-crowns-blowout&surface=scorecard';

async function ready(page){
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
}

function fontStack(family){
  return String(family||'').toLowerCase();
}

test('blowout Five Crowns gives Linda and Vikki Comeback chips',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the logic check once on laptop Chromium');
  await page.goto(blowoutUrl,{waitUntil:'networkidle'});
  await ready(page);

  await expect(page.locator('#round-intel')).toHaveText('Hand of 9 · 9s Wild');
  const chips=page.locator('button.scorecard-comeback-chip');
  await expect(chips).toHaveCount(2);
  await expect(page.locator('#scorecard-body tr',{hasText:'Linda'}).locator('button.scorecard-comeback-chip')).toContainText('Comeback');
  await expect(page.locator('#scorecard-body tr',{hasText:'Vikki'}).locator('button.scorecard-comeback-chip')).toContainText('Comeback');
  const totals=await page.evaluate(()=>({linda:currentGame.totals.Linda,vikki:currentGame.totals.Vikki}));
  expect(totals.linda).toBe(108);
  expect(totals.vikki).toBe(140);
});

test('Comeback extra sits inside the round score box next to the base score',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the layout check once on laptop Chromium');
  await page.goto(blowoutUrl,{waitUntil:'networkidle'});
  await ready(page);

  const geometry=await page.evaluate(()=>{
    const extra=document.querySelector('.score-cell-comeback');
    const stack=extra?.closest('.score-cell-stack');
    const input=stack?.querySelector('.score-cell-input');
    if(!extra||!stack||!input)return null;
    const extraBox=extra.getBoundingClientRect();
    const stackBox=stack.getBoundingClientRect();
    const inputBox=input.getBoundingClientRect();
    const extraStyle=getComputedStyle(extra);
    const inputStyle=getComputedStyle(input);
    return {
      extraText:(extra.textContent||'').trim(),
      inputValue:input.value,
      extraInside:extraBox.top>=stackBox.top-1&&
        extraBox.bottom<=stackBox.bottom+1&&
        extraBox.left>=stackBox.left-1&&
        extraBox.right<=stackBox.right+1,
      extraBelowBox:extraBox.top>=stackBox.bottom-0.5,
      extraFont:Number.parseFloat(extraStyle.fontSize),
      inputFont:Number.parseFloat(inputStyle.fontSize),
      extraFamily:extraStyle.fontFamily,
      inputFamily:inputStyle.fontFamily,
      sameRow:Math.abs(extraBox.top-inputBox.top)<=12
    };
  });

  expect(geometry,'Vikki\'s R6 cell should show a Comeback extra').not.toBeNull();
  expect(geometry.inputValue).toBe('0');
  expect(geometry.extraText).toBe('−15');
  expect(geometry.extraInside,'extra should stay inside the score box').toBe(true);
  expect(geometry.extraBelowBox,'extra should not float under the box').toBe(false);
  expect(geometry.sameRow,'0 and −15 should share the score box').toBe(true);
  expect(geometry.extraFont,'extra should be readable, not a tiny caption').toBeGreaterThanOrEqual(12);
  expect(fontStack(geometry.extraFamily)).toContain('bree serif');
  expect(fontStack(geometry.inputFamily)).toContain('bree serif');
});

test('Best and Worst use the same number font as round scores',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the type check once on laptop Chromium');
  await page.goto(blowoutUrl,{waitUntil:'networkidle'});
  await ready(page);
  await page.evaluate(()=>{
    recordChaseVisible=true;
    renderGame();
  });

  const fonts=await page.evaluate(()=>{
    const best=document.querySelector('.record-chase-score');
    const round=document.querySelector('.score-cell-input');
    const total=document.querySelector('.scorecard-total-value');
    return {
      best:best?getComputedStyle(best).fontFamily:'',
      round:round?getComputedStyle(round).fontFamily:'',
      total:total?getComputedStyle(total).fontFamily:'',
      bestSize:best?Number.parseFloat(getComputedStyle(best).fontSize):0
    };
  });

  expect(fontStack(fonts.best)).toContain('bree serif');
  expect(fontStack(fonts.round)).toContain('bree serif');
  expect(fontStack(fonts.best)).not.toContain('londrina');
  expect(fonts.bestSize,'Best/Worst sizing should stay large').toBeGreaterThanOrEqual(20);
});

test('history scorecard cells include Comeback extras so rows still add up',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the history check once on laptop Chromium');
  await page.goto(blowoutUrl,{waitUntil:'networkidle'});
  await ready(page);

  const result=await page.evaluate(()=>{
    const match=JSON.parse(JSON.stringify(currentGame));
    match.id=424242;
    match.game=match.name;
    match.date='8/17/2026';
    match.winners=['Megan'];
    history.unshift(match);
    openScorecard(match.id);
    const vikkiRow=[...document.querySelectorAll('#modal-scorecard-body tr')].find(row=>row.textContent.includes('Vikki'));
    const cells=[...vikkiRow.querySelectorAll('.scorecard-round-td')].map(cell=>(cell.textContent||'').replace(/\s+/g,' ').trim());
    const total=Number(vikkiRow.querySelector('.scorecard-total-value')?.textContent);
    const summed=match.rounds.filter(round=>!round.hailMaryBonus).reduce((sum,round)=>sum+BPGComeback.roundScoreForPlayer(round,'Vikki'),0);
    return {
      cells,
      total,
      summed,
      extraVisible:cells.some(text=>text.includes('−15'))
    };
  });

  expect(result.extraVisible,'history cells should show the −15 extra').toBe(true);
  expect(result.summed).toBe(result.total);
  expect(result.total).toBe(140);
});

test('renaming a player keeps Comeback extras attached to the new name',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the rename check once on laptop Chromium');
  await page.goto(blowoutUrl,{waitUntil:'networkidle'});
  await ready(page);
  await page.evaluate(()=>renamePlayerEverywhere('Vikki','Vic'));
  const moved=await page.evaluate(()=>({
    extra:currentGame.rounds[5].comeback,
    total:currentGame.totals.Vic,
    oldTotal:currentGame.totals.Vikki
  }));
  expect(moved.extra).toEqual({Vic:-15});
  expect(moved.total).toBe(140);
  expect(moved.oldTotal).toBeUndefined();
});

test('score-entry preview matches the clamped extra that would actually apply',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='laptop-chromium','Run the preview check once on laptop Chromium');
  await page.goto(blowoutUrl,{waitUntil:'networkidle'});
  await ready(page);
  const preview=await page.evaluate(()=>{
    const draft={scores:{Vikki:0}};
    return BPGComeback.previewComebackApply(currentGame,'Vikki',draft,getActivePlayers(currentGame));
  });
  expect(preview.success).toBe(true);
  expect(preview.extra).toBeLessThan(0);
  expect(preview.label).toContain('0 −');
  const applied=await page.evaluate(extra=>{
    const round={round:7,scores:{Vikki:0}};
    BPGComeback.applyComebackToRound(currentGame,round,getActivePlayers(currentGame));
    return round.comeback?.Vikki||0;
  });
  expect(applied).toBe(preview.extra);
});
