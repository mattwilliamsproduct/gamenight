import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';
import {
  MEDIA_DIR,
  freshTable,
  openHandFootSetup,
  openScoreEntry,
  playRound,
  seatPlayers,
  submitEntry,
  silencePorchPrompts,
  startHandFoot,
  typeRound,
  withSevensField
} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers:'block', deviceScaleFactor:2});

test.beforeEach(async ({page})=>{
  await silencePorchPrompts(page);
});

const VIEWPORTS=[
  {name:'phone', width:390, height:844, setup:'phone-setup.png', entry:'phone-entry-keypad.png', card:'phone-scorecard-four-rounds.png', also:'phone-entry-clean-dirty.png'},
  {name:'ipad', width:768, height:1024, setup:'ipad-setup.png', entry:'ipad-entry-keypad.png', card:'ipad-scorecard-four-rounds.png'}
];

function box(el){
  const r=el.getBoundingClientRect();
  return {x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom};
}

async function entryProblems(page){
  return page.evaluate(()=>{
    const boxOf=el=>{
      const r=el.getBoundingClientRect();
      return {x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom, text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0, 32)};
    };
    const hit=(a,b)=>a.width>0 && b.width>0 && a.x<b.right-0.5 && a.right>b.x+0.5 && a.y<b.bottom-0.5 && a.bottom>b.y+0.5;
    const problems=[];
    const keypad=document.querySelector('#score-entry-modal .score-entry-keypad');
    const keyBox=boxOf(keypad);
    const scroller=document.getElementById('score-entry-rows');
    const view=scroller?.getBoundingClientRect();
    const footer=[...document.querySelectorAll('#score-entry-modal .score-entry-panel > .border-t button')].map(boxOf);
    const fields=[...document.querySelectorAll('#score-entry-modal .hf-field, #score-entry-modal .hf-round, #score-entry-modal .hf-rate')].map(el=>({el, box:boxOf(el)}));
    const keys=[...document.querySelectorAll('#score-entry-modal .score-entry-key')].map(boxOf);
    const visibleBox=(el, box)=>{
      if(!scroller || !scroller.contains(el) || !view) return box;
      const x=Math.max(box.x, view.x);
      const y=Math.max(box.y, view.y);
      const right=Math.min(box.right, view.right);
      const bottom=Math.min(box.bottom, view.bottom);
      return {x, y, right, bottom, width:right-x, height:bottom-y, text:box.text};
    };
    const clippedAway=(el, box)=>scroller && scroller.contains(el) && view && (box.bottom<=view.top+1 || box.top>=view.bottom-1);
    fields.forEach(item=>{
      if(clippedAway(item.el, item.box)) return;
      const shown=visibleBox(item.el, item.box);
      if(shown.width<=0 || shown.height<=0) return;
      if(hit(shown, keyBox)) problems.push(`field overlaps keypad: ${item.box.text}`);
      footer.forEach(btn=>{ if(hit(shown, btn)) problems.push(`field overlaps ${btn.text}`); });
      if(item.box.width<44 || item.box.height<44) problems.push(`field ${Math.round(item.box.width)}x${Math.round(item.box.height)} ${item.box.text}`);
      const label=item.el.querySelector('.score-entry-meta-label');
      const value=item.el.querySelector('.hf-field-value, .hf-round-value');
      if(label && parseFloat(getComputedStyle(label).fontSize)<11) problems.push(`label ${getComputedStyle(label).fontSize} ${item.box.text}`);
      if(value && parseFloat(getComputedStyle(value).fontSize)<14) problems.push(`value ${getComputedStyle(value).fontSize} ${item.box.text}`);
    });
    keys.forEach(key=>{
      footer.forEach(btn=>{ if(hit(key, btn)) problems.push(`key overlaps ${btn.text}`); });
      if(key.width<44 || key.height<44) problems.push(`key ${Math.round(key.width)}x${Math.round(key.height)} ${key.text}`);
    });
    footer.forEach(btn=>{
      if(btn.width<44 || btn.height<44) problems.push(`footer ${Math.round(btn.width)}x${Math.round(btn.height)} ${btn.text}`);
      if(parseFloat(getComputedStyle(document.querySelector('#score-entry-modal .score-entry-panel > .border-t button')).fontSize)<12) problems.push('footer font');
    });
    const labels=[...document.querySelectorAll('#score-entry-modal .hf-field .score-entry-meta-label')].map(el=>el.textContent.trim());
    ['Clean','Dirty','Sevens','Red 3s','Going out','Card points','Cards left'].forEach(label=>{
      if(!labels.includes(label)) problems.push(`missing label ${label}`);
    });
    return problems;
  });
}

async function activeRowProblems(page){
  return page.evaluate(()=>{
    const problems=[];
    const scroller=document.getElementById('score-entry-rows');
    const active=scroller?.querySelector('.score-entry-hf-row.active');
    const keypad=document.querySelector('#score-entry-modal .score-entry-keypad')?.getBoundingClientRect();
    const panel=document.querySelector('#score-entry-modal .score-entry-panel')?.getBoundingClientRect();
    const view=scroller?.getBoundingClientRect();
    const footer=[...document.querySelectorAll('#score-entry-modal .score-entry-panel > .border-t button')].map(el=>el.getBoundingClientRect());
    if(!active||!keypad||!view||!panel) return ['missing active row, keypad, or list'];
    const hit=(a,b)=>a.width>0 && b.width>0 && a.x<b.right-0.5 && a.right>b.x+0.5 && a.y<b.bottom-0.5 && a.bottom>b.y+0.5;
    const fields=[...active.querySelectorAll('.hf-field, .hf-round')];
    if(fields.filter(el=>el.classList.contains('hf-field')).length<7) problems.push('active row has fewer than 7 inputs');
    fields.forEach(el=>{
      const r=el.getBoundingClientRect();
      const label=(el.querySelector('.score-entry-meta-label')?.textContent||'').trim()||'field';
      if(r.width<44 || r.height<44) problems.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
      if(r.top<view.top-1) problems.push(`${label} clipped above the list`);
      if(r.bottom>view.bottom+1) problems.push(`${label} clipped below the list`);
      if(r.bottom>keypad.top+0.5) problems.push(`${label} sits under the keypad`);
      if(hit(r, keypad)) problems.push(`${label} overlaps the keypad`);
      footer.forEach(btn=>{ if(hit(r, btn)) problems.push(`${label} overlaps a footer button`); });
      const value=el.querySelector('.hf-field-value, .hf-round-value');
      if(value && parseFloat(getComputedStyle(value).fontSize)<14) problems.push(`${label} value font ${getComputedStyle(value).fontSize}`);
    });
    footer.forEach(btn=>{
      if(hit(btn, keypad)) problems.push('footer overlaps keypad');
    });
    if(keypad.width<panel.width*0.5) problems.push(`keypad width ${Math.round(keypad.width)} of panel ${Math.round(panel.width)}`);
    return problems;
  });
}

async function scrollActiveRowFully(page){
  await page.evaluate(()=>{
    const scroller=document.getElementById('score-entry-rows');
    const active=scroller?.querySelector('.score-entry-hf-row.active');
    if(!scroller||!active) return;
    const top=active.offsetTop;
    const bottom=top+active.offsetHeight;
    if(active.offsetHeight<=scroller.clientHeight){
      if(top<scroller.scrollTop) scroller.scrollTop=Math.max(0, top);
      else if(bottom>scroller.scrollTop+scroller.clientHeight) scroller.scrollTop=bottom-scroller.clientHeight;
    }else{
      scroller.scrollTop=top;
    }
  });
}

async function scorecardProblems(page){
  return page.evaluate(()=>{
    const problems=[];
    const vw=window.innerWidth;
    const headers=[...document.querySelectorAll('#scorecard-capture thead th')].map(th=>{
      const r=th.getBoundingClientRect();
      return {text:(th.textContent||'').replace(/\s+/g,' ').trim(), x:r.x, right:r.right, width:r.width, height:r.height, font:parseFloat(getComputedStyle(th).fontSize)};
    });
    ['R1','R2','R3','R4'].forEach(label=>{
      const header=headers.find(item=>item.text.startsWith(label));
      if(!header) problems.push(`missing ${label}`);
      else{
        if(header.width<24) problems.push(`${label} width ${header.width}`);
        if(header.x<-1 || header.right>vw+1) problems.push(`${label} clipped ${header.x}-${header.right} of ${vw}`);
        if(header.font<11) problems.push(`${label} font ${header.font}`);
      }
    });
    const total=headers.find(item=>/total/i.test(item.text));
    if(!total) problems.push('missing Total');
    else if(total.x<-1 || total.right>vw+1) problems.push(`Total clipped ${total.x}-${total.right}`);
    const wrap=document.querySelector('#scorecard-capture .scorecard-table-wrap');
    if(wrap && wrap.scrollWidth>wrap.clientWidth+2) problems.push(`scorecard scrolls ${wrap.scrollWidth}>${wrap.clientWidth}`);
    document.querySelectorAll('#scorecard-capture .score-cell-input, #scorecard-capture .scorecard-total-value, #scorecard-capture .scoreboard-player-name').forEach(el=>{
      const size=parseFloat(getComputedStyle(el).fontSize);
      if(size<12) problems.push(`score font ${size} ${(el.textContent||'').trim().slice(0,16)}`);
    });
    return {problems, headers};
  });
}

test('phone and iPad Hand and Foot entry and scorecard stay tappable and fully visible', async ({page})=>{
  test.setTimeout(120000);
  for(const viewport of VIEWPORTS){
    await page.setViewportSize({width:viewport.width, height:viewport.height});
    await freshTable(page);
    await seatPlayers(page, ['Ann','Bo','Cy','Dee']);
    await openHandFootSetup(page);
    await page.screenshot({path:`${MEDIA_DIR}/${viewport.setup}`, fullPage:false});
    const setupTargets=await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('#hand-foot-setup-modal .hf-pair-select, #hand-foot-setup-modal button')];
      return nodes.map(el=>{
        const r=el.getBoundingClientRect();
        return {text:(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,24), width:r.width, height:r.height};
      }).filter(item=>item.width<44 || item.height<44);
    });
    expect(setupTargets, `${viewport.name} setup targets`).toEqual([]);

    await page.getByRole('button', {name:/Start Match/}).click();
    await expect(page.locator('#game-screen')).toBeVisible();
    await openScoreEntry(page);
    await typeRound(page, [['2','1','2','1','450','95']].map(withSevensField));
    if(viewport.name==='phone'){
      await page.evaluate(()=>{
        const scroller=document.getElementById('score-entry-rows');
        const first=scroller?.querySelector('.score-entry-hf-row');
        if(scroller&&first) scroller.scrollTop=Math.max(0, first.offsetTop-4);
      });
      await page.screenshot({path:`${MEDIA_DIR}/${viewport.entry}`, fullPage:false});
      if(viewport.also) await page.screenshot({path:`${MEDIA_DIR}/${viewport.also}`, fullPage:false});
    }
    await scrollActiveRowFully(page);
    const entry=await entryProblems(page);
    expect(entry, `${viewport.name} entry`).toEqual([]);
    const active=await activeRowProblems(page);
    expect(active, `${viewport.name} active row`).toEqual([]);
    if(viewport.name==='ipad'){
      await page.screenshot({path:`${MEDIA_DIR}/${viewport.entry}`, fullPage:false});
    }
    await typeRound(page, [['0','1','0','0','0','20']].map(withSevensField));
    await submitEntry(page);
    await page.waitForFunction(()=>{
      const game=JSON.parse(localStorage.getItem('gn_current')||'null');
      return game && game.rounds && game.rounds.length===1 && game.rounds[0].scores.Ann===1955;
    });

    await playRound(page, [['0','0','0','0','0','0'], ['0','0','0','1','0','0']]);
    await playRound(page, [['1','0','0','0','0','0'], ['0','0','0','0','10','0']]);
    await playRound(page, [['0','0','1','0','0','0'], ['0','0','0','0','0','0']]);
    await expect(page.locator('#scorecard-body .score-cell-input').first()).toHaveValue('1955');
    const card=await scorecardProblems(page);
    expect(card.problems, `${viewport.name} scorecard ${JSON.stringify(card.headers)}`).toEqual([]);
    await page.screenshot({path:`${MEDIA_DIR}/${viewport.card}`, fullPage:false});

    if(viewport.name==='phone'){
      await freshTable(page);
      await startHandFoot(page, {names:['Ann','Bo','Cy','Dee','Eve','Fay'], format:'singles'});
      await openScoreEntry(page);
      const scroll=await page.evaluate(()=>{
        const scroller=document.getElementById('score-entry-rows');
        const rows=[...scroller.querySelectorAll('.score-entry-hf-row')];
        const last=rows[rows.length-1];
        const keypad=document.querySelector('#score-entry-modal .score-entry-keypad').getBoundingClientRect();
        scroller.scrollTop=scroller.scrollHeight;
        const field=last.querySelector('.hf-field').getBoundingClientRect();
        const first=rows[0].getBoundingClientRect();
        return {
          count:rows.length,
          scrollable:scroller.scrollHeight>scroller.clientHeight+4,
          fieldBottom:field.bottom,
          keypadTop:keypad.top,
          firstHeight:first.height
        };
      });
      expect(scroll.count).toBe(6);
      expect(scroll.scrollable).toBe(true);
      expect(scroll.firstHeight).toBeGreaterThan(120);
      expect(scroll.fieldBottom).toBeLessThanOrEqual(scroll.keypadTop+1);
    }
  }
});

const CARD_WIDTHS = [375, 390, 1024, 1440];

async function canastaCellOverflow(page) {
  return page.evaluate(() => {
    const problems = [];
    const cells = [
      ...document.querySelectorAll('#scorecard-capture .score-cell-input, #scorecard-capture .scorecard-total-value')
    ];
    if (!cells.length) problems.push('no score cells');
    cells.forEach((el) => {
      const text = (el.value != null ? el.value : el.textContent || '').trim();
      if (!text) return;
      if (el.scrollWidth > el.clientWidth + 1) {
        problems.push(`overflow ${text} ${el.scrollWidth}>${el.clientWidth}`);
      }
    });
    return {problems, count: cells.length};
  });
}

async function canastaNameOverflow(page) {
  return page.evaluate(() => {
    const problems = [];
    const lines = [...document.querySelectorAll('#scorecard-capture .hf-team-line')];
    if (!lines.length) problems.push('no team name lines');
    const texts = lines.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim());
    lines.forEach((el) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const cell = el.closest('.scorecard-col-player');
      const lineBox = el.getBoundingClientRect();
      const cellBox = cell?.getBoundingClientRect();
      if (el.scrollWidth > el.clientWidth + 1) {
        problems.push(`line overflow ${text} ${el.scrollWidth}>${el.clientWidth}`);
      }
      if (cellBox && lineBox.right > cellBox.right + 1) {
        problems.push(`line clipped ${text} ${Math.round(lineBox.right)}>${Math.round(cellBox.right)}`);
      }
    });
    if (!texts.includes('Megan &')) problems.push(`missing Megan & (${texts.join('|')})`);
    if (!texts.includes('Matt')) problems.push(`missing Matt (${texts.join('|')})`);
    return {problems, texts};
  });
}

test('Canasta score cells never clip 4-digit or 5-digit totals', async ({page}) => {
  test.setTimeout(90000);
  for (const width of CARD_WIDTHS) {
    await page.setViewportSize({width, height: width >= 1024 ? 900 : 844});
    await openScenario(page, {scenario: 'canasta-house-round', surface: 'scorecard'});
    await expect(page.locator('#scorecard-body .score-cell-input').first()).toHaveValue(/^\d{4,}$/);
    const four = await canastaCellOverflow(page);
    expect(four.problems, `${width} 4-digit ${JSON.stringify(four)}`).toEqual([]);
    if (width <= 390) {
      const names = await canastaNameOverflow(page);
      expect(names.problems, `${width} names ${JSON.stringify(names)}`).toEqual([]);
    }
    await page.evaluate(() => {
      document.querySelectorAll('#scorecard-capture .score-cell-input').forEach((el) => {
        el.value = '12345';
      });
      document.querySelectorAll('#scorecard-capture .scorecard-total-value').forEach((el) => {
        el.textContent = '12345';
      });
    });
    const five = await canastaCellOverflow(page);
    expect(five.problems, `${width} 5-digit ${JSON.stringify(five)}`).toEqual([]);
  }
});

test('Canasta team rows stay dense and show full two-line names', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openScenario(page, {scenario: 'canasta-house-round', surface: 'scorecard'});
  const phone = await canastaNameOverflow(page);
  expect(phone.problems, `390 names ${JSON.stringify(phone)}`).toEqual([]);
  expect(phone.texts).toEqual(expect.arrayContaining(['Megan &', 'Matt', 'Cat &', 'Mike']));

  await page.setViewportSize({width: 1440, height: 900});
  await openScenario(page, {scenario: 'canasta-house-round', surface: 'scorecard'});
  const laptop = await page.evaluate(() => {
    const row = document.querySelector('#scorecard-capture tbody tr');
    const total = document.querySelector('#scorecard-capture .scorecard-total-value');
    const avatars = [...document.querySelectorAll('#scorecard-capture .hf-team-avatars .avatar-img-sc')];
    return {
      rowHeight: row ? row.getBoundingClientRect().height : 0,
      totalFont: total ? parseFloat(getComputedStyle(total).fontSize) : 0,
      avatar: avatars.map((el) => ({w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height})),
      names: [...document.querySelectorAll('#scorecard-capture .hf-team-line')].map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    };
  });
  expect(laptop.rowHeight, `1440 row ${laptop.rowHeight}`).toBeGreaterThan(64);
  expect(laptop.rowHeight, `1440 row ${laptop.rowHeight}`).toBeLessThanOrEqual(140);
  expect(laptop.totalFont, `1440 total font ${laptop.totalFont}`).toBeGreaterThanOrEqual(24);
  expect(laptop.avatar.length).toBeGreaterThanOrEqual(2);
  laptop.avatar.forEach((box) => {
    expect(box.w, JSON.stringify(box)).toBeLessThanOrEqual(48);
    expect(box.h, JSON.stringify(box)).toBeLessThanOrEqual(48);
  });
  expect(laptop.names).toEqual(expect.arrayContaining(['Megan &', 'Matt']));
});

test('Canasta rules open from Game Instructions and in-game Actions', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/?wipe=1&slice2', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.s2-rules-select');
  await page.locator('.s2-rules-select').selectOption('Hand and Foot');
  await page.waitForFunction(() => {
    const modal = document.getElementById('rules-modal');
    if (!modal || modal.classList.contains('hidden') || modal.classList.contains('opacity-0')) return false;
    return parseFloat(getComputedStyle(modal).opacity) > 0.95;
  });
  await expect(page.locator('#rules-title')).toHaveText('Canasta');
  await expect(page.locator('#rules-content')).toContainText('Clean canastas');
  await page.evaluate(() => { if (typeof closeRules === 'function') closeRules(); });

  await openScenario(page, {scenario: 'canasta-house-round', surface: 'scorecard'});
  await page.locator('#actions-btn').click();
  await page.getByRole('button', {name: /^Rules$/}).click();
  await page.waitForFunction(() => {
    const modal = document.getElementById('rules-modal');
    if (!modal || modal.classList.contains('hidden') || modal.classList.contains('opacity-0')) return false;
    return parseFloat(getComputedStyle(modal).opacity) > 0.95;
  });
  await expect(page.locator('#rules-title')).toHaveText('Canasta');
  await expect(page.locator('#rules-content')).toContainText('sevens');
});
