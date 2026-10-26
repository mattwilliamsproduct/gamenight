import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

async function openVisiblePreserver(page){
  await openScenario(page,{scenario:'wizard-life-preserver-visible'});
}

test('a Life Preserver shows on the hand it followed, or beside Total when that hand is hidden', async ({page})=>{
  await openVisiblePreserver(page);

  const mikeRow=page.locator('#scorecard-body tr',{hasText:'Mike'});
  const lindaRow=page.locator('#scorecard-body tr',{hasText:'Linda'});
  await expect(mikeRow.locator('.score-cell-life-preserver')).toHaveCount(1);
  await expect(mikeRow.locator('[aria-label="Life Preserver +40"]')).toBeVisible();
  await expect(mikeRow.locator('.scorecard-round-td').last()).toContainText('0');
  await expect(lindaRow.locator('.score-cell-life-preserver')).toHaveCount(0);
  await expect(lindaRow.locator('[aria-label="Life Preserver +15"]')).toBeVisible();
  await expect(lindaRow.locator('.score-total-life-preserver')).toBeVisible();

  const path=await page.evaluate(()=>{
    const match=history.find(item=>item.game==='Wizard');
    const replay=buildMatchPlacePath(match);
    const finalPlaces=competitionPlaces(
      sortPlayersByTotal(getRecordedPlayers(match),match.totals,configs.Wizard),
      match.totals
    );
    return {
      steps:replay?.labels?.length||0,
      mikeLast:replay?.ranks?.Mike?.at(-1),
      mattLast:replay?.ranks?.Matt?.at(-1),
      finalMike:finalPlaces.Mike,
      finalMatt:finalPlaces.Matt
    };
  });
  expect(path.steps).toBe(6);
  expect(path.mikeLast).toBe(1);
  expect(path.mattLast).toBe(2);
  expect(path.finalMike).toBe(path.mikeLast);
  expect(path.finalMatt).toBe(path.mattLast);

  await page.evaluate(()=>showHistory());
  await expect(page.locator('#hall-of-fame-view')).toContainText('Wizard');
  await page.locator('#hall-of-fame-view [data-s2-action="night-scorecard"]').first().click();
  const historyLinda=page.locator('#modal-scorecard-body tr',{hasText:'Linda'});
  const historyMike=page.locator('#modal-scorecard-body tr',{hasText:'Mike'});
  await expect(historyLinda.locator('[aria-label="Life Preserver +15"]')).toBeVisible();
  await expect(historyLinda.locator('.score-total-life-preserver')).toHaveCount(0);
  await expect(historyMike.locator('[aria-label="Life Preserver +40"]')).toBeVisible();
});

test('a phone hides trimmed hands and keeps each Life Preserver beside Total', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openVisiblePreserver(page);
  await expect.poll(async()=>page.locator('#scorecard-body td.scorecard-round--hidden').count()).toBeGreaterThan(0);

  const view=await page.evaluate(()=>{
    const width=window.innerWidth;
    const visible=el=>{
      if(!el) return false;
      const box=el.getBoundingClientRect();
      return box.width>8&&box.left<width-4&&box.right>8;
    };
    return [...document.querySelectorAll('#scorecard-body tr')].map(row=>({
      name:row.querySelector('.scoreboard-player-name, .dealer-player-label')?.textContent?.trim(),
      totalOnScreen:visible(row.querySelector('.scorecard-total-cell')),
      totalLabel:row.querySelector('.score-total-life-preserver')?.getAttribute('aria-label')||'',
      hiddenHands:row.querySelectorAll('td.scorecard-round--hidden').length
    }));
  });

  const mike=view.find(row=>row.name==='Mike');
  const linda=view.find(row=>row.name==='Linda');
  expect(mike?.totalOnScreen).toBe(true);
  expect(linda?.totalOnScreen).toBe(true);
  expect(mike?.hiddenHands).toBeGreaterThan(0);
  expect(linda?.hiddenHands).toBeGreaterThan(0);
  expect(mike?.totalLabel).toBe('Life Preserver +40');
  expect(linda?.totalLabel).toBe('Life Preserver +15');
});

test('undo clears the Life Preserver that followed the removed hand', async ({page})=>{
  await openVisiblePreserver(page);
  await expect(page.locator('#scorecard-body tr',{hasText:'Mike'}).locator('[aria-label="Life Preserver +40"]')).toBeVisible();

  await page.getByRole('button',{name:/Actions/}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Undo Last Round',exact:true}).click();

  await expect(page.locator('#scorecard-body tr',{hasText:'Mike'}).locator('.score-cell-life-preserver')).toHaveCount(0);
  await expect(page.locator('#scorecard-body tr',{hasText:'Linda'}).locator('[aria-label="Life Preserver +15"]')).toBeVisible();
  const after=await page.evaluate(()=>({
    used:[...(currentGame.hailMaryUsed||[])],
    scoring:currentGame.rounds.filter(round=>!round.hailMaryBonus).length,
    bonus:currentGame.rounds.filter(round=>round.hailMaryBonus).length
  }));
  expect(after.used).toEqual(['Linda']);
  expect(after.scoring).toBe(5);
  expect(after.bonus).toBe(1);
});

test('Share Receipt keeps the Life Preserver mark from the live card', async ({page})=>{
  await openVisiblePreserver(page);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Save & End',exact:true}).click();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  const receipt=await page.evaluate(()=>document.getElementById('scorecard-receipt-capture')?.innerText||'');
  expect(receipt).toContain('+40');
  expect(receipt).toContain('+15');
});

test('merging two names from the same live Wizard match is refused', async ({page})=>{
  await openVisiblePreserver(page);
  const dialogs=[];
  page.on('dialog', async dialog=>{
    dialogs.push(dialog.message());
    await dialog.accept();
  });
  const merged=await page.evaluate(()=>{
    const before=JSON.stringify(currentGame);
    const ok=mergePlayerRecords('Linda','Mike');
    const scoring=currentGame.rounds.find(round=>round.round===1);
    return {
      ok,
      unchanged:JSON.stringify(currentGame)===before,
      lindaBid:scoring?.bids?.Linda,
      mikeBid:scoring?.bids?.Mike,
      roster:[...currentGame.originalRoster],
      spins:currentGame.rounds.filter(round=>round.hailMaryBonus).length
    };
  });
  expect(merged.ok).toBe(false);
  expect(merged.unchanged).toBe(true);
  expect(merged.lindaBid).toBe(1);
  expect(merged.mikeBid).toBe(1);
  expect(merged.roster).toEqual(['Matt','Mike','Linda']);
  expect(merged.spins).toBe(2);
  expect(dialogs.join('\n')).toContain('same match');
});
