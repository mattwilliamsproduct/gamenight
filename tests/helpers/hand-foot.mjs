import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect} from '@playwright/test';

function resolveMediaDir(){
  const candidates=[
    process.env.HF_MEDIA_DIR,
    resolve('test-results/hand-and-foot')
  ].filter(Boolean);
  let lastError=null;
  for(const dir of candidates){
    try{
      mkdirSync(dir, {recursive:true});
      return dir;
    }catch(error){
      lastError=error;
    }
  }
  throw new Error(`No writable Hand and Foot screenshot directory: ${lastError&&lastError.message}`);
}

export const MEDIA_DIR=resolveMediaDir();

export async function silencePorchPrompts(page){
  page.on('dialog', dialog=>dialog.accept());
  await page.addInitScript(()=>{
    const wipe=new URLSearchParams(location.search).get('wipe')==='1';
    if(wipe && sessionStorage.getItem('hf-cleared')!=='1'){
      localStorage.clear();
      sessionStorage.removeItem('gn_demo_games');
    }
    const set=(key, value)=>{ if(localStorage.getItem(key)==null) localStorage.setItem(key, value); };
    set('gn_pref_lineupintro', '0');
    set('gn_pref_statmontage', '0');
    set('gn_pref_dealerroll', '0');
  });
}

export async function freshTable(page){
  await page.evaluate(()=>sessionStorage.removeItem('hf-cleared')).catch(()=>{});
  await page.goto('/?wipe=1', {waitUntil:'domcontentloaded'});
  await page.evaluate(()=>sessionStorage.setItem('hf-cleared','1'));
  await expect(page.locator('#home-screen')).toBeVisible();
}

export async function seatPlayers(page, names){
  for(const name of names){
    await page.locator('#quick-add-player, #slice2-add-name').fill(name);
    await page.locator('#slice2-home button[type="submit"]').click();
    await expect(page.locator('#slice2-home .s2-seat-name').filter({hasText:name})).toBeVisible();
  }
}

export async function openHandFootSetup(page){
  const tile=page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"]');
  await tile.click();
  const start=page.locator('#slice2-start-btn');
  if(await start.count()) await start.click();
  const modal=page.locator('#hand-foot-setup-modal');
  await expect(modal).toBeVisible();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('hand-foot-setup-modal')).opacity==='1');
}

export function tokensFor(values){
  const tokens=[];
  values.forEach(value=>{
    const text=String(value);
    if(text.startsWith('-')){
      tokens.push('-');
      for(const ch of text.slice(1)) tokens.push(ch);
    }else{
      for(const ch of text) tokens.push(ch);
    }
    tokens.push('next');
  });
  return tokens;
}

export async function openScoreEntry(page){
  await page.waitForFunction(()=>{
    const modal=document.getElementById('score-entry-modal');
    return !modal || modal.classList.contains('hidden');
  });
  await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
  await page.waitForFunction(()=>{
    const modal=document.getElementById('score-entry-modal');
    return !!modal && !modal.classList.contains('hidden') && getComputedStyle(modal).opacity==='1';
  });
}

function normalizeBasic(raw){
  if(Array.isArray(raw)) throw new Error('Canasta entry takes Basic, Count, and Cards left');
  return {
    basic:raw.basic==null?'0':String(raw.basic),
    count:raw.count==null?'0':String(raw.count),
    cardsLeft:raw.cardsLeft==null?'0':String(raw.cardsLeft),
    got22:!!raw.got22,
    wentOut:!!raw.wentOut
  };
}

async function pressTokens(page, value){
  await page.evaluate(list=>{
    list.forEach(token=>token==='next'?scoreEntryNext():scoreEntryKey(token));
  }, tokensFor([value]));
}

export async function typeRound(page, sides){
  for(const raw of sides){
    const side=normalizeBasic(raw);
    await pressTokens(page, side.basic);
    await pressTokens(page, side.count);
    const card=page.locator('#score-entry-modal .hf-team-card.is-active');
    if(side.got22) await card.locator('input[data-check="got22"]').click();
    if(side.wentOut){
      await card.locator('input[data-check="wentOut"]').click();
      await page.evaluate(()=>scoreEntryNext());
    } else {
      await pressTokens(page, side.cardsLeft);
    }
  }
}

export async function submitEntry(page){
  const primary=page.locator('#score-entry-primary-btn');
  const label=((await primary.innerText())||'').trim();
  await primary.click();
  if(/^review$/i.test(label)){
    await expect(page.locator('.hf-review')).toBeVisible();
    await primary.click();
  }
  await page.waitForFunction(()=>document.getElementById('score-entry-modal')?.classList.contains('hidden'));
  // The scorekeeper ignores a second submit for half a second.
  await page.waitForTimeout(600);
}

export function withSevensField(values){
  if(Array.isArray(values)&&values.length===6) return [values[0],values[1],'0',...values.slice(2)];
  return values;
}

export async function playRound(page, sides){
  const before=await readGame(page);
  await openScoreEntry(page);
  await typeRound(page, sides);
  await submitEntry(page);
  await page.waitForFunction(count=>{
    const game=JSON.parse(localStorage.getItem('gn_current')||'null');
    return !!game && (game.rounds||[]).length===count;
  }, (before?.rounds?.length||0)+1);
}

export async function readGame(page){
  return page.evaluate(()=>JSON.parse(localStorage.getItem('gn_current')||'null'));
}

export async function readHistory(page){
  return page.evaluate(()=>JSON.parse(localStorage.getItem('gn_history')||'[]'));
}

const HIGH={basic:'1600', count:'450', got22:true, cardsLeft:'0'};
const LOW={basic:'0', count:'-40', cardsLeft:'10'};
const DIRTY={basic:'300', count:'0', cardsLeft:'20'};
const CLEAN={basic:'500', count:'0', cardsLeft:'0'};
const ZERO={basic:'0', count:'0', cardsLeft:'0'};
const TEN={basic:'0', count:'10', cardsLeft:'0'};
const SMALL_BASIC={basic:'100', count:'0', cardsLeft:'0'};

export function roundsFor(kind){
  if(kind==='pairs2') return [HIGH, LOW];
  if(kind==='pairs4') return [HIGH, DIRTY];
  if(kind==='pairs6') return [HIGH, ZERO, CLEAN];
  if(kind==='singles4') return [HIGH, LOW, ZERO, SMALL_BASIC];
  return [HIGH, LOW, ZERO, SMALL_BASIC, TEN, CLEAN];
}

export async function startHandFoot(page, {names, format}){
  await seatPlayers(page, names);
  await openHandFootSetup(page);
  if(format==='singles' && (names.length===4 || names.length===6)){
    await page.locator('#hf-format-singles').click();
  }
  const setup=await page.evaluate(()=>({
    note:document.getElementById('hand-foot-setup-note')?.textContent||'',
    sides:document.querySelectorAll('#hand-foot-setup-sides .hf-setup-side').length,
    seats:[...document.querySelectorAll('button.hf-team-person')].map(el=>el.dataset.name||'')
  }));
  await page.getByRole('button', {name:/Start match/}).click();
  await expect(page.locator('#game-screen')).toBeVisible();
  await expect(page.locator('#scorecard-body tr').first()).toBeVisible();
  return setup;
}

export async function playFourRounds(page, kind){
  const sides=roundsFor(kind);
  for(let round=0; round<4; round++) await playRound(page, sides);
}

export async function endMatch(page){
  await page.locator('#slice2-end-btn').click();
  const confirm=page.locator('#leave-end-now');
  await expect(confirm).toBeVisible();
  await confirm.click();
  const count=page.locator('#leave-count-yes');
  if(await count.isVisible().catch(()=>false)) await count.click();
}

export async function editFirstRoundCardsLeft(page, cellId){
  await page.locator(cellId).click();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('score-entry-modal')).opacity==='1');
  await page.locator('#score-entry-modal .hf-num[data-field="cardsLeft"]:not([disabled])').first().click();
  await page.evaluate(()=>{
    for(let i=0;i<6;i++) scoreEntryKey('backspace');
    scoreEntryKey('0');
    scoreEntryNext();
  });
  await submitEntry(page);
}

export function overlap(a, b){
  return a.x < b.right-0.5 && a.right > b.x+0.5 && a.y < b.bottom-0.5 && a.bottom > b.y+0.5;
}
