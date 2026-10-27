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
    const field=page.locator('#slice2-add-name, #quick-add-player').first();
    await field.fill(name);
    await page.getByRole('button', {name:/^Add( Player)?$/}).click();
    await expect(page.locator('.s2-seat-name, #lineup-list')).toContainText(name);
  }
}

export async function openHandFootSetup(page){
  const tile=page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"], button.bp-hand-foot').first();
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

export async function typeRound(page, sides){
  const tokens=sides.flatMap(tokensFor);
  await page.evaluate(list=>{
    list.forEach(token=>token==='next'?scoreEntryNext():scoreEntryKey(token));
  }, tokens);
}

export async function submitEntry(page){
  await page.locator('#score-entry-primary-btn').click();
  await page.waitForFunction(()=>document.getElementById('score-entry-modal')?.classList.contains('hidden'));
  // The scorekeeper ignores a second submit for half a second.
  await page.waitForTimeout(600);
}

function withSevensField(values){
  if(Array.isArray(values)&&values.length===6) return [values[0],values[1],'0',...values.slice(2)];
  return values;
}

export async function playRound(page, sides){
  const before=await readGame(page);
  await openScoreEntry(page);
  await typeRound(page, sides.map(withSevensField));
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

const BIG=['2','1','0','2','1','450','95'];
const SMALL=['0','0','0','0','0','-40','10'];
const QUIET=['0','1','0','0','0','0','0'];

export function roundsFor(kind){
  if(kind==='pairs2') return [BIG, SMALL];
  if(kind==='pairs4') return [BIG, ['0','1','0','0','0','20']];
  if(kind==='pairs6') return [BIG, QUIET, ['1','0','0','0','0','0']];
  if(kind==='singles4') return [BIG, SMALL, QUIET, ['0','0','1','0','0','0']];
  return [BIG, SMALL, QUIET, ['0','0','1','0','0','0'], ['0','0','0','1','0','0'], ['1','0','0','0','10','0']];
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
    seats:[...document.querySelectorAll('.hf-pair-select')].map(el=>el.value)
  }));
  await page.getByRole('button', {name:/Start Match/}).click();
  await expect(page.locator('#game-screen')).toBeVisible();
  await expect(page.locator('#scorecard-body tr').first()).toBeVisible();
  return setup;
}

export async function playFourRounds(page, kind){
  const sides=roundsFor(kind);
  for(let round=0; round<4; round++) await playRound(page, sides);
}

export async function editFirstRoundCardsLeft(page, cellId){
  await page.locator(cellId).click();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('score-entry-modal')).opacity==='1');
  await page.locator('.score-entry-hf-row').first().locator('button.hf-field', {hasText:'Cards left'}).click();
  await page.evaluate(()=>{
    for(let i=0;i<5;i++) scoreEntryKey('backspace');
    scoreEntryKey('0');
  });
  await page.locator('#score-entry-primary-btn').click();
  await page.waitForFunction(()=>document.getElementById('score-entry-modal')?.classList.contains('hidden'));
}

export function overlap(a, b){
  return a.x < b.right-0.5 && a.right > b.x+0.5 && a.y < b.bottom-0.5 && a.bottom > b.y+0.5;
}
