import fs from 'node:fs';
import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';
import {EIGHT18_BID_ACCURACY_ROUNDS} from '../../public/qa/fixtures.mjs';

const ARTIFACTS='/opt/cursor/artifacts';
const cloudHits=[];

test.beforeEach(async ({page})=>{
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  cloudHits.length=0;
  page.on('request', request=>{
    if(/cardknight\.vercel\.app|\/api\/sync/.test(request.url())) cloudHits.push(request.url());
  });
});

test.afterEach(()=>{
  expect(cloudHits,'live cloud sync stayed idle').toEqual([]);
});

function shot(page, name){
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  return page.screenshot({path:`${ARTIFACTS}/${name}.png`});
}

function armDialogs(page){
  const dialogs=[];
  page.on('dialog', async dialog=>{
    dialogs.push({type:dialog.type(), message:dialog.message()});
    await dialog.accept();
  });
  return dialogs;
}

async function entryKey(page, key){
  const modal=page.locator('#score-entry-modal');
  if(key==='-') return modal.locator('button[onclick="scoreEntryKey(\'-\')"]');
  if(key==='backspace') return modal.locator('button[onclick="scoreEntryKey(\'backspace\')"]');
  return modal.getByRole('button',{name:key, exact:true});
}

async function padKey(page, key){
  const pad=page.locator('#custom-numpad');
  if(key==='-') return pad.locator('button[onclick="numpadPress(\'-\')"]');
  if(key==='backspace') return pad.locator('button[onclick="numpadPress(\'backspace\')"]');
  return pad.getByRole('button',{name:key, exact:true});
}

function correctionKey(page, key){
  return page.locator(`#round-correction-modal button[onclick="roundCorrectionKey('${key}')"]`);
}

async function installMatch(page, game, saved){
  await openScenario(page,{scenario:'home-party', surface:'home'});
  await page.evaluate(({game,saved})=>{
    currentGame=game;
    history=saved?[saved]:[];
    BPGScorebook.ensureGameId(currentGame);
    if(saved) BPGScorebook.ensureGameId(saved);
    allPlayers=[...(game.originalRoster||[])];
    players=[...allPlayers];
    playerProfiles={};
    markHistoryChanged();
    saveData({fullPersist:true, syncCold:true});
    goActiveMatch();
  },{game,saved});
}

async function persisted(page){
  return page.evaluate(()=>({
    game:JSON.stringify(currentGame),
    history:JSON.stringify(history),
    current:localStorage.getItem('gn_current'),
    saved:localStorage.getItem('gn_history'),
    porch:localStorage.getItem('gn_porch_key'),
    cloud:canPorchCloud(),
    host:location.hostname
  }));
}

function savedCopy(game){
  return {
    id:game.id,
    game:game.name,
    date:'10/23/2026',
    totals:{...game.totals},
    winners:[...(game.winners||[])],
    rounds:JSON.parse(JSON.stringify(game.rounds)),
    originalRoster:[...game.originalRoster],
    currentRound:game.currentRound,
    maxRounds:game.maxRounds,
    endScore:game.endScore,
    completed:game.completed===true,
    assistedMatch:game.assistedMatch===true,
    hailMaryUsed:[...(game.hailMaryUsed||[])],
    retired:[...(game.retired||[])],
    auditLog:JSON.parse(JSON.stringify(game.auditLog||[]))
  };
}

function wizardRoundTen(){
  return {
    id:1010,
    name:'Wizard',
    originalRoster:['Megan','Matt','Cat'],
    currentRound:10,
    maxRounds:20,
    wizardPhase:'scoring',
    currentBids:{Megan:0, Matt:1, Cat:3},
    currentScoreDrafts:{},
    rounds:[],
    totals:{Megan:0, Matt:0, Cat:0},
    winners:[],
    auditLog:[],
    hailMaryUsed:[],
    retired:[],
    completed:false
  };
}

test('P0-01 first trick digit replaces the prefill, then later digits append', async ({page})=>{
  await installMatch(page, wizardRoundTen(), null);
  await page.locator('#submit-action-btn').click();
  const modal=page.locator('#score-entry-modal');
  await expect(modal).toBeVisible();
  await expect(page.locator('#score-entry-context')).toContainText('Round 10');

  await page.locator('#score-entry-row-Matt .score-entry-name').click();
  const matt=page.locator('#score-entry-value-Matt');
  const mattRow=page.locator('#score-entry-row-Matt');
  await expect(matt).toHaveText('1');
  await expect(mattRow).toHaveClass(/is-empty/);
  await (await entryKey(page,'0')).click();
  await expect(matt).toHaveText('0');
  await expect(mattRow).toHaveClass(/is-complete/);

  await page.locator('#score-entry-row-Cat .score-entry-name').click();
  const cat=page.locator('#score-entry-value-Cat');
  await expect(cat).toHaveText('3');
  await (await entryKey(page,'3')).click();
  await expect(cat).toHaveText('3');
  await (await entryKey(page,'3')).click();
  await expect(cat).toHaveText('33');

  await page.locator('#score-entry-row-Matt .score-entry-name').click();
  await (await entryKey(page,'1')).click();
  await expect(matt).toHaveText('1');
  await (await entryKey(page,'0')).click();
  await expect(matt).toHaveText('10');
  await page.locator('#score-entry-row-Megan .score-entry-name').click();
  await page.locator('#score-entry-row-Matt .score-entry-name').click();
  await expect(matt).toHaveText('10');
  await expect(mattRow).toHaveClass(/is-complete/);
  const state=await page.evaluate(()=>({
    matt:scoreEntryModalState.values.Matt,
    acknowledged:scoreEntryModalState.acknowledged.Matt,
    round:currentGame.currentRound
  }));
  expect(state).toEqual({matt:'10', acknowledged:true, round:10});
});

test('P0-01 NEXT and row confirm keep an untouched prefill', async ({page})=>{
  await installMatch(page, wizardRoundTen(), null);
  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();

  const matt=page.locator('#score-entry-value-Matt');
  const mattRow=page.locator('#score-entry-row-Matt');
  await page.locator('#score-entry-row-Matt .score-entry-name').click();
  await expect(matt).toHaveText('1');
  await expect(page.locator('#score-entry-status-Matt')).toContainText('Suggested: 1');
  await expect(page.locator('#score-entry-status-Matt')).toContainText('tap Next to confirm');
  await expect(page.locator('#score-entry-status-Megan')).toContainText('Suggested: 0');
  await page.locator('#score-entry-modal').getByRole('button',{name:'Next', exact:true}).click();
  await expect(matt).toHaveText('1');
  await expect(mattRow).toHaveClass(/is-complete/);
  await expect(page.locator('#score-entry-status-Matt')).toContainText('Confirmed: 1');
  await page.locator('#score-entry-row-Matt .score-entry-name').click();
  await (await entryKey(page,'0')).click();
  await expect(matt).toHaveText('10');

  await page.evaluate(()=>closeScoreEntryModalOnly());
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await page.locator('#score-entry-row-Matt .score-entry-row-status').click();
  await expect(matt).toHaveText('1');
  await expect(mattRow).toHaveClass(/is-complete/);
  await expect(page.locator('#score-entry-status-Matt')).toContainText('Confirmed: 1');
  await page.locator('#score-entry-row-Cat .score-entry-name').click();
  await page.locator('#score-entry-row-Matt .score-entry-name').click();
  await expect(matt).toHaveText('1');
  await (await entryKey(page,'0')).click();
  await expect(matt).toHaveText('10');
});

test('P0-02 balanced out-of-bounds Wizard tricks change nothing', async ({page})=>{
  const dialogs=armDialogs(page);
  const game={
    id:2002,
    name:'Wizard',
    originalRoster:['Alice','Bob'],
    currentRound:2,
    maxRounds:30,
    wizardPhase:'scoring',
    currentBids:{Alice:1, Bob:1},
    currentScoreDrafts:{},
    rounds:[],
    totals:{Alice:0, Bob:0},
    winners:[],
    auditLog:[{ts:1, action:'Match Started', detail:'Wizard'}],
    hailMaryUsed:[],
    retired:[],
    completed:false
  };
  await installMatch(page, game, null);
  const before=await persisted(page);
  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await page.locator('#score-entry-row-Alice .score-entry-name').click();
  await (await entryKey(page,'-')).click();
  await expect(page.locator('#score-entry-value-Alice')).toHaveText('-1');
  await page.locator('#score-entry-row-Bob .score-entry-name').click();
  await (await entryKey(page,'3')).click();
  await expect(page.locator('#score-entry-value-Bob')).toHaveText('3');
  await page.locator('#score-entry-primary-btn').click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0].type).toBe('alert');
  expect(dialogs[0].message).toBe('Wizard tricks must be from 0 to 2. Check Alice, Bob.');
  const after=await persisted(page);
  expect(after.game).toBe(before.game);
  expect(after.history).toBe(before.history);
  expect(after.current).toBe(before.current);
  expect(after.saved).toBe(before.saved);
  expect(after.porch).toBeNull();
  expect(after.cloud).toBe(false);
  expect(after.host).toBe('127.0.0.1');
  await expect(page.locator('#score-entry-modal')).toBeVisible();
});

test('P0-02 a blank trick counts as 0 and then the round total is checked', async ({page})=>{
  await installMatch(page,{
    id:2003,
    name:'Wizard',
    originalRoster:['Alice','Bob'],
    currentRound:2,
    maxRounds:30,
    wizardPhase:'scoring',
    currentBids:{Alice:1, Bob:1},
    currentScoreDrafts:{},
    rounds:[],
    totals:{Alice:0, Bob:0},
    winners:[],
    auditLog:[],
    hailMaryUsed:[],
    retired:[],
    completed:false
  }, null);
  const before=await persisted(page);
  await page.locator('#submit-action-btn').click();
  await page.locator('#score-entry-row-Alice .score-entry-name').click();
  await (await entryKey(page,'backspace')).click();
  await expect(page.locator('#score-entry-value-Alice')).toHaveText('');
  await expect(page.locator('#score-entry-status-Alice')).toHaveText('Blank');
  await expect(page.locator('#score-entry-status-Bob')).toContainText('Suggested: 1');
  const short=page.waitForEvent('dialog');
  await Promise.all([
    short.then(async dialog=>{
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Wizard round 2 must total 2 tricks. This table totals 1.');
      await dialog.accept();
    }),
    page.locator('#score-entry-primary-btn').click()
  ]);
  const after=await persisted(page);
  expect(after.game).toBe(before.game);
  expect(after.current).toBe(before.current);
  await page.locator('#score-entry-row-Bob .score-entry-name').click();
  await (await entryKey(page,'2')).click();
  await expect(page.locator('#score-entry-value-Bob')).toHaveText('2');
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  const stored=await page.evaluate(()=>currentGame.rounds[0].actuals);
  expect(stored).toEqual({Alice:0, Bob:2});
});

test('P0-02 an 818 round uses that round’s trick count', async ({page})=>{
  const dialogs=armDialogs(page);
  await installMatch(page,{
    id:2018,
    name:'818',
    originalRoster:['Alice','Bob'],
    currentRound:8,
    maxRounds:15,
    eight18Phase:'scoring',
    currentBids:{Alice:0, Bob:0},
    currentScoreDrafts:{},
    rounds:[],
    totals:{Alice:0, Bob:0},
    winners:[],
    auditLog:[],
    hailMaryUsed:[],
    retired:[],
    completed:false
  }, null);
  const before=await persisted(page);
  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-context')).toContainText('1 trick');
  await page.locator('#score-entry-row-Alice .score-entry-name').click();
  await (await entryKey(page,'8')).click();
  await page.locator('#score-entry-row-Bob .score-entry-row-status').click();
  await expect(page.locator('#score-entry-status-Bob')).toContainText('Confirmed: 0');
  await page.locator('#score-entry-primary-btn').click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0].message).toBe('818 tricks must be from 0 to 1. Check Alice.');
  const after=await persisted(page);
  expect(after.game).toBe(before.game);
  expect(after.current).toBe(before.current);
  const limits=await page.evaluate(()=>({
    round8:BPGScorebook.roundTrickLimit('818', 8),
    round15:BPGScorebook.roundTrickLimit('818', 15),
    currentRound:currentGame.currentRound
  }));
  expect(limits).toEqual({round8:1, round15:8, currentRound:8});
});

test('P1-05 Five Crowns, Flip 7, and Beat the Heat reject a negative played round', async ({page})=>{
  const dialogs=armDialogs(page);
  await installMatch(page,{
    id:2015,
    name:'Five Crowns',
    originalRoster:['Matt','Cat'],
    currentRound:1,
    maxRounds:11,
    rounds:[],
    totals:{Matt:0, Cat:0},
    winners:[],
    auditLog:[],
    hailMaryUsed:[],
    retired:[],
    currentScoreDrafts:{},
    completed:false
  }, null);
  const before=await persisted(page);
  await page.locator('#submit-action-btn').click();
  const mattRow=page.locator('#score-entry-row-Matt');
  await mattRow.locator('.score-entry-row-status').click();
  await expect(mattRow).toHaveClass(/is-empty/);
  await (await entryKey(page,'-')).click();
  await (await entryKey(page,'5')).click();
  await expect(page.locator('#score-entry-value-Matt')).toHaveText('-5');
  await page.locator('#score-entry-modal').getByRole('button',{name:'Next', exact:true}).click();
  const catRow=page.locator('#score-entry-row-Cat');
  await expect(catRow).toHaveClass(/is-empty/);
  await page.locator('#score-entry-modal').getByRole('button',{name:'Next', exact:true}).click();
  await expect(page.locator('#score-entry-value-Cat')).toHaveText('');
  await expect(page.locator('#score-entry-status-Cat')).toHaveText('Blank');
  await expect(page.locator('#score-entry-unconfirmed')).toHaveText('Blank scores count as 0');
  const catBlank=await page.evaluate(()=>({
    value:scoreEntryModalState.values.Cat,
    acknowledged:scoreEntryModalState.acknowledged.Cat
  }));
  expect(catBlank).toEqual({value:'', acknowledged:false});
  await expect(page.locator('#score-entry-primary-btn')).toBeEnabled();
  await page.locator('#score-entry-primary-btn').click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0].message).toBe('Five Crowns scores must be whole numbers, 0 or higher. Check Matt.');
  const after=await persisted(page);
  expect(after.game).toBe(before.game);
  expect(after.current).toBe(before.current);
  const model=await page.evaluate(()=>({
    flip:BPGScorebook.validateEntries({game:'Flip 7 Vengeance', kind:'scores', roundNumber:1, players:['Ada'], values:{Ada:'-15'}}),
    heat:BPGScorebook.validateEntries({game:'Beat the Heat', kind:'scores', roundNumber:1, players:['Ada'], values:{Ada:'-15'}}),
    wizard:BPGScorebook.validateEntries({game:'Wizard', kind:'scores', roundNumber:1, players:['Ada'], values:{Ada:'-10'}}),
    rook:BPGScorebook.validateEntries({game:'Rook', kind:'scores', roundNumber:1, players:['Ada'], values:{Ada:'-70'}})
  }));
  expect(model.flip.ok).toBe(false);
  expect(model.flip.message).toContain('Flip 7');
  expect(model.heat.ok).toBe(false);
  expect(model.heat.message).toContain('Beat the Heat');
  expect(model.wizard.ok).toBe(true);
  expect(model.wizard.values.Ada).toBe(-10);
  expect(model.rook.ok).toBe(true);
  expect(model.rook.values.Ada).toBe(-70);
});

test('P0-04 a past Five Crowns cell commits once, and cancel or a bad score writes nothing', async ({page})=>{
  const dialogs=armDialogs(page);
  const game={
    id:5151,
    name:'Five Crowns',
    originalRoster:['Matt','Cat'],
    currentRound:2,
    maxRounds:1,
    completed:true,
    winners:['Cat'],
    rounds:[{round:1, scores:{Matt:15, Cat:8}}],
    totals:{Matt:15, Cat:8},
    auditLog:[{ts:1, action:'Match Started', detail:'Five Crowns'}],
    hailMaryUsed:[],
    retired:[],
    currentScoreDrafts:{}
  };
  await installMatch(page, game, savedCopy(game));
  const cell=page.locator('#score-past-0-Matt');
  await expect(cell).toBeVisible();
  await cell.click();
  await expect(page.locator('#custom-numpad')).toBeVisible();
  await (await padKey(page,'3')).click();
  await page.keyboard.press('Escape');
  await expect(cell).toHaveValue('15');
  let audit=await page.evaluate(()=>currentGame.auditLog.map(entry=>entry.action));
  expect(audit).toEqual(['Match Started']);

  await cell.click();
  await page.locator('#numpad-cancel').click();
  await expect(cell).toHaveValue('15');
  audit=await page.evaluate(()=>currentGame.auditLog.length);
  expect(audit).toBe(1);

  const beforeNoop=await persisted(page);
  await cell.click();
  await page.getByRole('button',{name:'Close Keypad', exact:true}).click();
  await expect.poll(async ()=>page.evaluate(()=>currentGame.auditLog.length)).toBe(1);
  const afterNoop=await persisted(page);
  expect(afterNoop.game).toBe(beforeNoop.game);
  expect(afterNoop.saved).toBe(beforeNoop.saved);

  await cell.click();
  await (await padKey(page,'-')).click();
  await expect(cell).toHaveValue('-15');
  await page.getByRole('button',{name:'Close Keypad', exact:true}).click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0].message).toContain('0 or higher');
  expect(dialogs[0].message).toContain('Matt');
  const rejected=await page.evaluate(()=>({
    score:currentGame.rounds[0].scores.Matt,
    total:currentGame.totals.Matt,
    winners:[...currentGame.winners],
    audit:currentGame.auditLog.length
  }));
  expect(rejected).toEqual({score:15, total:15, winners:['Cat'], audit:1});
  await expect(page.locator('#custom-numpad')).toBeVisible();
  await page.locator('#numpad-cancel').click();
  await expect(cell).toHaveValue('15');

  await cell.click();
  await (await padKey(page,'3')).click();
  await expect(cell).toHaveValue('3');
  await page.locator('#scorecard-capture').screenshot({path:`${ARTIFACTS}/slice1-score-edit-15-to-3-typing.png`}).catch(()=>{});
  await page.getByRole('button',{name:'Close Keypad', exact:true}).click();
  await expect(page.locator('#custom-numpad')).toBeHidden();
  await expect.poll(async ()=>page.evaluate(()=>currentGame.auditLog.at(-1)?.detail)).toBe('Matt: 15 -> 3');
  const committed=await page.evaluate(()=>{
    const saved=history.find(match=>match.id===currentGame.id);
    return {
      score:currentGame.rounds[0].scores.Matt,
      total:currentGame.totals.Matt,
      winners:[...currentGame.winners],
      completed:currentGame.completed,
      round:currentGame.currentRound,
      actions:currentGame.auditLog.map(entry=>entry.action),
      savedScore:saved.rounds[0].scores.Matt,
      savedWinners:[...saved.winners],
      savedTotal:saved.totals.Matt,
      stored:localStorage.getItem('gn_history').includes('Matt: 15 -> 3')
    };
  });
  expect(committed.score).toBe(3);
  expect(committed.total).toBe(3);
  expect(committed.winners).toEqual(['Matt']);
  expect(committed.completed).toBe(true);
  expect(committed.round).toBe(2);
  expect(committed.actions).toEqual(['Match Started','R1 Score Edited']);
  expect(committed.savedScore).toBe(3);
  expect(committed.savedWinners).toEqual(['Matt']);
  expect(committed.savedTotal).toBe(3);
  expect(committed.stored).toBe(true);
  await expect(cell).toHaveValue('3');
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  await page.locator('#scorecard-capture').screenshot({path:`${ARTIFACTS}/slice1-score-edit-15-to-3.png`});
  await page.locator('#actions-btn').click();
  await page.getByRole('button',{name:'Round History / Audit Log'}).click();
  await expect(page.locator('#audit-modal')).toBeVisible();
  await expect(page.locator('#audit-list')).toContainText('R1 Score Edited');
  await expect(page.locator('#audit-list')).toContainText('Matt: 15 -> 3');
  await page.locator('#audit-modal .surface-raised').screenshot({path:`${ARTIFACTS}/slice1-audit-score-edited.png`});
  await shot(page,'slice1-audit-score-edited-viewport');
});

test('P0-06 a Wizard round correction rejects a bad table, then saves the balanced one', async ({page})=>{
  const game={
    id:4242,
    name:'Wizard',
    originalRoster:['Alice','Bob'],
    currentRound:2,
    maxRounds:1,
    completed:true,
    winners:['Bob'],
    wizardPhase:'bidding',
    currentBids:{},
    rounds:[{round:1, bids:{Alice:1, Bob:1}, actuals:{Alice:0, Bob:1}, scores:{Alice:-10, Bob:30}}],
    totals:{Alice:-10, Bob:30},
    auditLog:[{ts:1, action:'Match Started', detail:'Wizard'}],
    hailMaryUsed:[],
    retired:[]
  };
  await installMatch(page, game, savedCopy(game));
  const before=await persisted(page);
  await page.locator('#score-past-0-Alice').click();
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  await expect(page.locator('#round-correction-limit')).toContainText('1 trick');
  await correctionKey(page,'backspace').click();
  await expect(page.locator('.round-correction-row[data-player="Alice"] .round-correction-actual')).toHaveText('—');
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  const blankSaved=await persisted(page);
  expect(blankSaved.game).toBe(before.game);
  expect(blankSaved.current).toBe(before.current);
  await page.locator('#score-past-0-Alice').click();
  await correctionKey(page,'2').click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-error')).toHaveText('Wizard tricks must be from 0 to 1. Check Alice.');
  await correctionKey(page,'backspace').click();
  await page.locator('.round-correction-row[data-player="Bob"]').click();
  await correctionKey(page,'backspace').click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-error')).toHaveText('Wizard round 1 must total 1 tricks. This table totals 0.');
  await page.keyboard.press('Escape');
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  const rejected=await persisted(page);
  expect(rejected.game).toBe(before.game);
  expect(rejected.current).toBe(before.current);
  expect(rejected.saved).toBe(before.saved);

  await page.locator('#score-past-0-Alice').click();
  await correctionKey(page,'1').click();
  await page.locator('.round-correction-row[data-player="Bob"]').click();
  await correctionKey(page,'0').click();
  await expect(page.locator('#round-correction-sum')).toHaveText('Logged 1 of 1');
  await expect(page.locator('.round-correction-row[data-player="Alice"] .round-correction-score')).toHaveClass(/score-cell-hit/);
  await expect(page.locator('.round-correction-row[data-player="Bob"] .round-correction-score')).toHaveClass(/score-cell-miss/);
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  await page.locator('#round-correction-modal .surface-raised').screenshot({path:`${ARTIFACTS}/slice1-wizard-round-correction.png`});
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  await expect(page.locator('#score-past-0-Alice')).toHaveClass(/score-cell-hit/);
  await expect(page.locator('#score-past-0-Bob')).toHaveClass(/score-cell-miss/);
  await expect(page.locator('#score-past-0-Alice')).toHaveValue('30');
  await expect(page.locator('#score-past-0-Bob')).toHaveValue('-10');
  const saved=await page.evaluate(()=>{
    const row=history.find(match=>match.id===currentGame.id);
    return {
      actuals:{...currentGame.rounds[0].actuals},
      scores:{...currentGame.rounds[0].scores},
      totals:{...currentGame.totals},
      winners:[...currentGame.winners],
      completed:currentGame.completed,
      round:currentGame.currentRound,
      detail:currentGame.auditLog.at(-1).detail,
      action:currentGame.auditLog.at(-1).action,
      savedWinners:[...row.winners],
      savedActuals:{...row.rounds[0].actuals},
      edits:currentGame.auditLog.filter(entry=>entry.action==='R1 Tricks Edited').length
    };
  });
  expect(saved.actuals).toEqual({Alice:1, Bob:0});
  expect(saved.scores).toEqual({Alice:30, Bob:-10});
  expect(saved.totals).toEqual({Alice:30, Bob:-10});
  expect(saved.winners).toEqual(['Alice']);
  expect(saved.completed).toBe(true);
  expect(saved.round).toBe(2);
  expect(saved.action).toBe('R1 Tricks Edited');
  expect(saved.detail).toBe('Alice: 0 -> 1 (-10 -> +30), Bob: 1 -> 0 (+30 -> -10)');
  expect(saved.savedWinners).toEqual(['Alice']);
  expect(saved.savedActuals).toEqual({Alice:1, Bob:0});
  expect(saved.edits).toBe(1);
  await page.locator('#scorecard-capture').screenshot({path:`${ARTIFACTS}/slice1-wizard-hit-miss.png`});

  const noopBefore=await page.evaluate(()=>currentGame.auditLog.length);
  await page.locator('#score-past-0-Alice').click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  expect(await page.evaluate(()=>currentGame.auditLog.length)).toBe(noopBefore);
});

test('P0-06 an 818 historical round uses its own trick count while the table is on round 15', async ({page})=>{
  const game={
    id:8188,
    name:'818',
    originalRoster:['Alice','Bob'],
    currentRound:15,
    maxRounds:15,
    eight18Phase:'bidding',
    currentBids:{},
    completed:true,
    winners:['Alice'],
    rounds:[{round:8, bids:{Alice:1, Bob:1}, actuals:{Alice:1, Bob:0}, scores:{Alice:11, Bob:0}}],
    totals:{Alice:11, Bob:0},
    auditLog:[],
    hailMaryUsed:[],
    retired:[]
  };
  await installMatch(page, game, savedCopy(game));
  const before=await persisted(page);
  await page.locator('#score-past-0-Alice').click();
  await expect(page.locator('#round-correction-limit')).toHaveText('This round has 1 tricks.');
  await correctionKey(page,'8').click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-error')).toHaveText('818 tricks must be from 0 to 1. Check Alice.');
  const mid=await persisted(page);
  expect(mid.game).toBe(before.game);
  expect(mid.current).toBe(before.current);
  expect(await page.evaluate(()=>currentGame.currentRound)).toBe(15);

  await correctionKey(page,'backspace').click();
  await correctionKey(page,'0').click();
  await page.locator('.round-correction-row[data-player="Bob"]').click();
  await correctionKey(page,'1').click();
  await expect(page.locator('#round-correction-sum')).toHaveText('Logged 1 of 1');
  await expect(page.locator('.round-correction-row[data-player="Alice"] .round-correction-score')).toHaveClass(/score-cell-miss/);
  await expect(page.locator('.round-correction-row[data-player="Bob"] .round-correction-score')).toHaveClass(/score-cell-hit/);
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  await page.locator('#round-correction-modal .surface-raised').screenshot({path:`${ARTIFACTS}/slice1-818-round-correction.png`});
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#score-past-0-Alice')).toHaveClass(/score-cell-miss/);
  await expect(page.locator('#score-past-0-Bob')).toHaveClass(/score-cell-hit/);
  const saved=await page.evaluate(()=>{
    const row=history.find(match=>match.id===currentGame.id);
    return {
      currentRound:currentGame.currentRound,
      scores:{...currentGame.rounds[0].scores},
      actuals:{...currentGame.rounds[0].actuals},
      winners:[...currentGame.winners],
      completed:currentGame.completed,
      action:currentGame.auditLog.at(-1).action,
      savedScores:{...row.rounds[0].scores},
      savedWinners:[...row.winners]
    };
  });
  expect(saved.currentRound).toBe(15);
  expect(saved.actuals).toEqual({Alice:0, Bob:1});
  expect(saved.scores).toEqual({Alice:0, Bob:11});
  expect(saved.winners).toEqual(['Bob']);
  expect(saved.completed).toBe(true);
  expect(saved.savedWinners).toEqual(['Bob']);
  expect(saved.action).toBe('R8 Tricks Edited');
  expect(saved.savedScores).toEqual({Alice:0, Bob:11});
  await page.locator('#scorecard-capture').screenshot({path:`${ARTIFACTS}/slice1-818-hit-miss.png`});
});

test('P0-06 a Beat the Heat correction under 66 reopens the saved match', async ({page})=>{
  const game={
    id:66,
    name:'Beat the Heat',
    originalRoster:['Alice','Bob'],
    currentRound:2,
    maxRounds:999,
    endScore:66,
    completed:true,
    winners:['Alice'],
    rounds:[{round:1, scores:{Alice:10, Bob:70}}],
    totals:{Alice:10, Bob:70},
    auditLog:[{ts:1, action:'Match Started', detail:'Beat the Heat'}],
    hailMaryUsed:[],
    retired:[]
  };
  await installMatch(page, game, savedCopy(game));
  await page.locator('#score-past-0-Bob').click();
  await (await padKey(page,'2')).click();
  await (await padKey(page,'0')).click();
  await expect(page.locator('#score-past-0-Bob')).toHaveValue('20');
  await page.getByRole('button',{name:'Close Keypad', exact:true}).click();
  await expect.poll(async ()=>page.evaluate(()=>currentGame.completed)).toBe(false);
  const saved=await page.evaluate(()=>{
    const row=history.find(match=>match.id===currentGame.id);
    return {
      over:isMatchOver(currentGame),
      winners:[...currentGame.winners],
      total:currentGame.totals.Bob,
      savedCompleted:row.completed,
      savedTotal:row.totals.Bob,
      savedWinners:[...row.winners],
      action:currentGame.auditLog.at(-1).action,
      stored:localStorage.getItem('gn_history').includes('"Bob":20')
    };
  });
  expect(saved.over).toBe(false);
  expect(saved.winners).toEqual([]);
  expect(saved.total).toBe(20);
  expect(saved.savedCompleted).toBe(false);
  expect(saved.savedTotal).toBe(20);
  expect(saved.savedWinners).toEqual([]);
  expect(saved.action).toBe('R1 Score Edited');
  expect(saved.stored).toBe(true);
});

test('P0-06 history scorecard Correct updates a finished Wizard without a live table', async ({page})=>{
  await openScenario(page,{scenario:'home-party', surface:'home'});
  await page.evaluate(()=>{
    currentGame=null;
    history=[{
      id:777,
      game:'Wizard',
      date:'10/23/2026',
      originalRoster:['Alice','Bob'],
      currentRound:2,
      maxRounds:1,
      completed:true,
      winners:['Bob'],
      totals:{Alice:-10, Bob:30},
      rounds:[{round:1, bids:{Alice:1, Bob:1}, actuals:{Alice:0, Bob:1}, scores:{Alice:-10, Bob:30}}],
      hailMaryUsed:[],
      retired:[],
      auditLog:[]
    }];
    markHistoryChanged();
    saveData({fullPersist:true, syncCold:true});
    showHistory();
  });
  await page.getByRole('button',{name:'Scorecard', exact:true}).click();
  await page.locator('.round-correct-btn').click();
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  await correctionKey(page,'1').click();
  await page.locator('.round-correction-row[data-player="Bob"]').click();
  await correctionKey(page,'0').click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  const saved=await page.evaluate(()=>{
    const row=history.find(match=>match.id===777);
    return {
      live:currentGame,
      winners:[...row.winners],
      scores:{...row.rounds[0].scores},
      actuals:{...row.rounds[0].actuals},
      action:row.auditLog.at(-1).action,
      completed:row.completed
    };
  });
  expect(saved.live).toBeNull();
  expect(saved.winners).toEqual(['Alice']);
  expect(saved.scores).toEqual({Alice:30, Bob:-10});
  expect(saved.actuals).toEqual({Alice:1, Bob:0});
  expect(saved.action).toBe('R1 Tricks Edited');
  expect(saved.completed).toBe(true);
  await expect(page.locator('#modal-scorecard-body')).toContainText('Alice');
});

test('P0-03 the 12-player fixture heals Brick’s spin and keeps unassisted score records', async ({page})=>{
  await openScenario(page,{scenario:'records-assisted-heal', surface:'home'});
  const healed=await page.evaluate(()=>{
    const match=history.find(row=>row.assistedMatch===true);
    const before=JSON.stringify({totals:match.totals, rounds:match.rounds});
    BPGScorebook.recomputeTotals(match);
    BPGScorebook.recomputeTotals(match);
    const fame=calculateHallOfFame();
    const records=calculateAllTimeRecords();
    const brick=records.playerCards.find(card=>card.player==='Brick');
    return {
      same:JSON.stringify({totals:match.totals, rounds:match.rounds})===before,
      brickTotal:match.totals.Brick,
      rounds:match.rounds.length,
      players:match.originalRoster.length,
      mostGames:fame.Overall.mostGames,
      coverage:fame._coverage['Five Crowns'],
      bestScore:fame['Five Crowns'].bestScore,
      bestPlayer:fame['Five Crowns'].bestPlayer,
      worstScore:fame['Five Crowns'].worstScore,
      bestRound:records.games['Five Crowns'].bestRound,
      worstRound:records.games['Five Crowns'].worstRound.value,
      bestGame:records.games['Five Crowns'].bestGame,
      cleanest:records.games['Five Crowns'].cleanestGame?.player,
      brickCard:brick?{games:brick.games, wins:brick.wins}:null,
      cloud:canPorchCloud(),
      porch:localStorage.getItem('gn_porch_key')
    };
  });
  expect(healed.same).toBe(true);
  expect(healed.brickTotal).toBe(-18);
  expect(healed.rounds).toBe(2);
  expect(healed.players).toBe(12);
  expect(healed.mostGames).toBe(2);
  expect(healed.coverage).toEqual({assisted:1, unassisted:1});
  expect(healed.bestScore).toBe(4);
  expect(healed.bestPlayer).toBe('Matt');
  expect(healed.worstScore).toBe(10);
  expect(healed.bestRound.player).toBe('Brick');
  expect(healed.bestRound.value).toBe(0);
  expect(healed.bestRound.round).toBe(1);
  expect(healed.worstRound).toBe(12);
  expect(healed.bestGame).toMatchObject({player:'Matt', value:4});
  expect(healed.cleanest).toBe('Matt');
  expect(healed.brickCard).toBeNull();
  expect(healed.cloud).toBe(false);
  expect(healed.porch).toBeNull();

  await page.getByRole('button',{name:'Records', exact:true}).first().click();
  const cards=page.locator('#history-list-view .surface');
  await expect(cards).toHaveCount(2);
  await expect(cards.first().locator('[data-assisted-match="true"]')).toHaveText('Assisted Match');
  await expect(cards.first()).toContainText('-18');
  await expect(cards.nth(1).locator('[data-assisted-match="true"]')).toHaveCount(0);
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  await cards.first().screenshot({path:`${ARTIFACTS}/slice1-timeline-assisted.png`});
  await shot(page,'slice1-timeline-assisted-viewport');

  await page.locator('#tab-fame').click();
  const fameScore=page.locator('#fame-content .surface',{hasText:'Five Crowns: Best Score'});
  await expect(fameScore).toContainText('Unassisted matches only');
  await expect(fameScore).toContainText('Matt');
  await expect(fameScore.locator('.text-3xl')).toHaveText('4');
  await expect(fameScore).not.toContainText('-18');
  await page.locator('#hall-of-fame-view').screenshot({path:`${ARTIFACTS}/slice1-hall-of-fame-unassisted.png`});

  await page.locator('#tab-records').click();
  const bestRound=page.locator('#records-view .surface',{hasText:'Best Single Round Ever'});
  await expect(bestRound).toContainText('Brick');
  await expect(bestRound).toContainText('R1');
  await expect(bestRound).not.toContainText('-18');
  await expect(bestRound).not.toContainText('R0');
  await expect(bestRound.locator('.text-3xl')).toHaveText('0');
  const bestGame=page.locator('#records-view .surface',{hasText:'Best Game Ever'}).first();
  await expect(bestGame).toContainText('Unassisted matches only');
  await expect(bestGame).toContainText('Matt');
  await expect(bestGame.locator('.text-3xl')).toHaveText('4');
  await bestRound.scrollIntoViewIfNeeded();
  await bestRound.screenshot({path:`${ARTIFACTS}/slice1-records-best-single-round.png`});
  await shot(page,'slice1-records-best-single-round-viewport');
});

test('P0-03 an all-assisted shelf says there are no unassisted matches', async ({page})=>{
  await openScenario(page,{scenario:'records-assisted-heal', surface:'home'});
  await page.evaluate(()=>{
    history=history.filter(match=>BPGScorebook.isAssistedMatch(match));
    currentGame=null;
    markHistoryChanged();
    showHistory();
  });
  await page.locator('#tab-records').click();
  const bestGame=page.locator('#records-view .surface',{hasText:'Best Game Ever'}).first();
  await expect(bestGame).toContainText('No unassisted matches yet');
  await expect(bestGame).toContainText('Unassisted matches only');
  const bestRound=page.locator('#records-view .surface',{hasText:'Best Single Round Ever'});
  await expect(bestRound.locator('.text-3xl')).toHaveText('0');
  await page.locator('#tab-fame').click();
  const fameScore=page.locator('#fame-content .surface',{hasText:'Five Crowns: Best Score'});
  await expect(fameScore).toContainText('No unassisted matches yet');
  await expect(fameScore).toContainText('Unassisted matches only');
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  await fameScore.screenshot({path:`${ARTIFACTS}/slice1-all-assisted-empty.png`});
});

test('P0-03 spins stay out of exact bids and opening the wheel is not an assisted match', async ({page})=>{
  await openScenario(page,{scenario:'five-crowns-life-preserver-threshold'});
  const before=await page.evaluate(()=>({
    assisted:currentGame.assistedMatch===true,
    used:[...(currentGame.hailMaryUsed||[])],
    rounds:currentGame.rounds.length,
    bonus:currentGame.rounds.some(round=>round.hailMaryBonus)
  }));
  expect(before.assisted).toBe(false);
  expect(before.bonus).toBe(false);
  await page.getByRole('button',{name:/Life Preserver available for Duke/}).click();
  await expect(page.locator('#wheel-modal')).toBeVisible();
  await page.evaluate(()=>closeWheel());
  await expect(page.locator('#wheel-modal')).toBeHidden();
  const after=await page.evaluate(()=>({
    assisted:currentGame.assistedMatch===true,
    used:[...(currentGame.hailMaryUsed||[])],
    rounds:currentGame.rounds.length,
    bonus:currentGame.rounds.some(round=>round.hailMaryBonus)
  }));
  expect(after).toEqual({assisted:false, used:before.used, rounds:before.rounds, bonus:false});

  const bids=await page.evaluate(()=>{
    currentGame=null;
    history=[
      {
        id:1, game:'Wizard', date:'1/1/2026', originalRoster:['Ada','Bea'], winners:['Ada'],
        totals:{Ada:50, Bea:-10}, hailMaryUsed:['Ada'], assistedMatch:true,
        rounds:[
          {round:1, bids:{Ada:1, Bea:1}, actuals:{Ada:1, Bea:0}, scores:{Ada:30, Bea:-10}},
          {round:0, hailMaryBonus:true, scores:{Ada:40}}
        ]
      },
      {
        id:2, game:'818', date:'1/2/2026', originalRoster:['Ada','Bea'], winners:['Ada'],
        totals:{Ada:27, Bea:0}, hailMaryUsed:['Ada'],
        rounds:[
          {round:1, bids:{Ada:2, Bea:1}, actuals:{Ada:2, Bea:0}, scores:{Ada:12, Bea:0}},
          {round:0, hailMaryBonus:true, scores:{Ada:15}}
        ]
      }
    ];
    markHistoryChanged();
    const fame=calculateHallOfFame();
    return {
      wizardExact:fame.Wizard.mostExactBids,
      wizardMiss:fame.Wizard.mostBustedBids,
      wizardRound:fame.Wizard.bestRound,
      eightExact:fame['818'].mostExactBids,
      eightMiss:fame['818'].mostMissedBids,
      eightRound:fame['818'].bestRound,
      games:fame.Overall.mostGames
    };
  });
  expect(bids).toEqual({
    wizardExact:1,
    wizardMiss:1,
    wizardRound:30,
    eightExact:1,
    eightMiss:1,
    eightRound:12,
    games:2
  });
});

test('P0-07 a same-match rename is blocked for active, retired, and round-level seats', async ({page})=>{
  const dialogs=armDialogs(page);
  await openScenario(page,{scenario:'home-party', surface:'profiles'});
  const before=await page.evaluate(()=>{
    saveData({fullPersist:true, syncCold:true});
    return {
      history:localStorage.getItem('gn_history'),
      players:localStorage.getItem('gn_all_players')
    };
  });
  await page.locator('.profile-passport-card',{hasText:'Megan'}).first().click();
  await expect(page.locator('#detail-name')).toHaveText('Megan');
  await page.getByTitle('Rename').click();
  await page.locator('#rename-input').fill('Matt');
  await page.locator('#rename-modal').getByRole('button',{name:'Rename', exact:true}).click();
  await expect.poll(()=>dialogs.length).toBe(2);
  expect(dialogs[0].message).toContain('Merge');
  expect(dialogs[1].message).toContain('both played in the same match');
  const after=await page.evaluate(()=>({
    megan:allPlayers.includes('Megan'),
    history:localStorage.getItem('gn_history'),
    players:localStorage.getItem('gn_all_players')
  }));
  expect(after.megan).toBe(true);
  expect(after.history).toBe(before.history);
  expect(after.players).toBe(before.players);

  const blocked=await page.evaluate(()=>{
    function attempt(label, row){
      history=[row];
      allPlayers=['Ada','Bea'];
      playerProfiles={Ada:{}, Bea:{}};
      currentGame=null;
      markHistoryChanged();
      saveData({fullPersist:true, syncCold:true});
      const memory=JSON.stringify({history, allPlayers});
      const stored=localStorage.getItem('gn_history');
      const ok=mergePlayerRecords('Ada','Bea');
      return {
        label,
        ok,
        memory:JSON.stringify({history, allPlayers})===memory,
        stored:localStorage.getItem('gn_history')===stored
      };
    }
    return [
      attempt('retired',{
        id:1, game:'Five Crowns', originalRoster:['Cara'], retired:['Ada','Bea'],
        totals:{Cara:4}, winners:['Cara'], rounds:[{round:1, scores:{Cara:4}}]
      }),
      attempt('actuals',{
        id:2, game:'818', originalRoster:['Cara'], retired:[],
        totals:{Cara:1}, winners:['Cara'],
        rounds:[{round:8, bids:{Cara:0}, actuals:{Ada:1, Bea:0}, scores:{Cara:1}}]
      }),
      attempt('rook',{
        id:3, game:'Rook', originalRoster:['Cara'], retired:[], rookHighBidder:'Ada', rookPartner:'Bea',
        totals:{Cara:10}, winners:['Cara'],
        rounds:[{round:1, scores:{Cara:10}, rookBidder:'Ada', rookPartner:'Bea'}]
      })
    ];
  });
  blocked.forEach(result=>{
    expect(result.ok, result.label).toBe(false);
    expect(result.memory, result.label).toBe(true);
    expect(result.stored, result.label).toBe(true);
  });
  expect(dialogs.filter(dialog=>dialog.message.includes('same match')).length).toBeGreaterThanOrEqual(4);
});

test('P0-07 a fresh rename and a disjoint merge keep each match’s scores', async ({page})=>{
  const dialogs=armDialogs(page);
  await openScenario(page,{scenario:'home-party', surface:'profiles'});
  const meganBefore=await page.evaluate(()=>{
    const match=history.find(row=>row.originalRoster?.includes('Megan'));
    return {id:match.id, megan:match.totals.Megan, rounds:JSON.stringify(match.rounds)};
  });
  await page.locator('.profile-passport-card',{hasText:'Megan'}).first().click();
  await page.getByTitle('Rename').click();
  await page.locator('#rename-input').fill('Samuel');
  await page.locator('#rename-modal').getByRole('button',{name:'Rename', exact:true}).click();
  await expect(page.locator('#toast-container')).toContainText('Samuel');
  expect(dialogs).toEqual([]);
  const renamed=await page.evaluate(before=>{
    const match=history.find(row=>row.id===before.id);
    return {
      meganLeft:history.some(row=>BPGScorebook.participantNames(row).has('Megan')),
      samuel:BPGScorebook.participantNames(match).has('Samuel'),
      total:match.totals.Samuel,
      rounds:JSON.stringify(match.rounds).includes(String(before.megan))
    };
  }, meganBefore);
  expect(renamed.meganLeft).toBe(false);
  expect(renamed.samuel).toBe(true);
  expect(renamed.total).toBe(meganBefore.megan);
  expect(renamed.rounds).toBe(true);

  await page.evaluate(()=>{
    history=[
      {
        id:11, game:'Five Crowns', date:'8/1/2026', originalRoster:['Linda','Cara'],
        totals:{Linda:10, Cara:4}, winners:['Cara'], retired:[],
        rounds:[{round:1, scores:{Linda:10, Cara:4}}]
      },
      {
        id:12, game:'Wizard', date:'8/2/2026', originalRoster:['Matt'],
        totals:{Matt:30}, winners:['Matt'], retired:[],
        rounds:[{round:1, bids:{Matt:1}, actuals:{Matt:1}, scores:{Matt:30}}]
      }
    ];
    allPlayers=['Linda','Cara','Matt'];
    players=['Linda','Cara','Matt'];
    playerProfiles={Linda:{}, Cara:{}, Matt:{}};
    currentGame=null;
    markHistoryChanged();
    showProfiles();
  });
  await page.locator('.profile-passport-card',{hasText:'Linda'}).first().click();
  await page.getByTitle('Rename').click();
  await page.locator('#rename-input').fill('Matt');
  await page.locator('#rename-modal').getByRole('button',{name:'Rename', exact:true}).click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0].message).toContain('Merge');
  const merged=await page.evaluate(()=>{
    const crowns=history.find(row=>row.id===11);
    const wizard=history.find(row=>row.id===12);
    return {
      linda:allPlayers.includes('Linda'),
      crowns:{...crowns.rounds[0].scores},
      wizardScores:{...wizard.rounds[0].scores},
      wizardActual:wizard.rounds[0].actuals.Matt,
      crownsTotal:crowns.totals.Matt,
      cara:crowns.totals.Cara
    };
  });
  expect(merged.linda).toBe(false);
  expect(merged.crowns).toEqual({Matt:10, Cara:4});
  expect(merged.wizardScores).toEqual({Matt:30});
  expect(merged.wizardActual).toBe(1);
  expect(merged.crownsTotal).toBe(10);
  expect(merged.cara).toBe(4);
});

test('P0-03 phone width still shows the assisted badge and the healed round', async ({page})=>{
  await page.setViewportSize({width:390, height:844});
  await openScenario(page,{scenario:'records-assisted-heal', surface:'home'});
  await page.getByRole('button',{name:'Records', exact:true}).first().click();
  await expect(page.locator('[data-assisted-match="true"]').first()).toBeVisible();
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  await shot(page,'slice1-phone-timeline');
  await page.locator('#tab-fame').click();
  await expect(page.locator('#fame-content')).toContainText('Unassisted matches only');
  await shot(page,'slice1-phone-hall-of-fame');
  await page.locator('#tab-records').click();
  const bestRound=page.locator('#records-view .surface',{hasText:'Best Single Round Ever'});
  await bestRound.scrollIntoViewIfNeeded();
  await expect(bestRound.locator('.text-3xl')).toHaveText('0');
  await shot(page,'slice1-phone-records');
});

test('bid accuracy ignores point sign and legacy rounds that have no bid', async ({page})=>{
  await openScenario(page,{scenario:'home-party', surface:'home'});
  const rounds=EIGHT18_BID_ACCURACY_ROUNDS;
  // Legacy/inconsistent-score fixtures: bid 3 / actual 2 stored as 15, and bid 0 / actual 0 stored as 0.
  // Rule-consistent 818 sits beside them: miss scores 2, exact zero scores 10.
  expect(rounds.legacyMiss.fixtureKind).toBe('legacy-inconsistent-score');
  expect(rounds.legacyExactZero.fixtureKind).toBe('legacy-inconsistent-score');
  expect(rounds.standardMiss).toMatchObject({fixtureKind:'rule-consistent-818', scores:{Dee:2}});
  expect(rounds.standardExactZero).toMatchObject({fixtureKind:'rule-consistent-818', scores:{Eve:10}});
  const stats=await page.evaluate(fixture=>{
    currentGame=null;
    history=[
      {
        id:8181, gameId:8181, game:'818', date:'10/23/2026', completed:true, gameOver:true,
        originalRoster:['Ada','Bea','Cal'], winners:['Bea'],
        totals:{Ada:15, Bea:0, Cal:27},
        rounds:[
          {
            round:1,
            bids:{...fixture.legacyMiss.bids, ...fixture.legacyExactZero.bids},
            actuals:{...fixture.legacyMiss.actuals, ...fixture.legacyExactZero.actuals},
            scores:{...fixture.legacyMiss.scores, ...fixture.legacyExactZero.scores, Cal:15}
          },
          {round:3, scores:{Cal:12}}
        ]
      },
      {
        id:8182, gameId:8182, game:'818', date:'10/23/2026', completed:true, gameOver:true,
        originalRoster:['Dee','Eve'], winners:['Eve'],
        totals:{Dee:fixture.standardMiss.scores.Dee, Eve:fixture.standardExactZero.scores.Eve},
        rounds:[{
          round:2,
          bids:{...fixture.standardMiss.bids, ...fixture.standardExactZero.bids},
          actuals:{...fixture.standardMiss.actuals, ...fixture.standardExactZero.actuals},
          scores:{...fixture.standardMiss.scores, ...fixture.standardExactZero.scores}
        }]
      },
      {
        id:707, gameId:707, game:'Wizard', date:'10/23/2026', completed:true, gameOver:true,
        originalRoster:['Zoe','Yan'], winners:['Zoe'],
        totals:{Zoe:0, Yan:70},
        rounds:[
          {round:1, bids:{Zoe:0}, actuals:{Zoe:0}, scores:{Zoe:0, Yan:30}},
          {round:2, scores:{Yan:40}}
        ]
      }
    ];
    markHistoryChanged();
    const fame=calculateHallOfFame();
    const records=calculateAllTimeRecords();
    return {
      formula:BPGScorebook.eight18RoundScore(3,2),
      exactZeroFormula:BPGScorebook.eight18RoundScore(0,0),
      legacyMiss:BPGScorebook.classifyBidAccuracy(history[0].rounds[0], 'Ada'),
      legacyExact:BPGScorebook.classifyBidAccuracy(history[0].rounds[0], 'Bea'),
      standardMiss:BPGScorebook.classifyBidAccuracy(history[1].rounds[0], 'Dee'),
      standardExact:BPGScorebook.classifyBidAccuracy(history[1].rounds[0], 'Eve'),
      missingBid:BPGScorebook.classifyBidAccuracy(history[0].rounds[1], 'Cal'),
      eightExact:fame['818'].mostExactBids,
      eightExactPlayer:fame['818'].mostExactBidsPlayer,
      eightMiss:fame['818'].mostMissedBids,
      eightMissPlayer:fame['818'].mostMissedBidsPlayer,
      wizardExact:fame.Wizard.mostExactBids,
      wizardExactPlayer:fame.Wizard.mostExactBidsPlayer,
      wizardMiss:fame.Wizard.mostBustedBids,
      singleExact:records.games['818'].mostExactSingleGame,
      singleMiss:records.games['818'].mostMissedSingleGame,
      wizardSingle:records.games.Wizard.mostExactSingleGame
    };
  }, rounds);
  expect(stats.formula).toBe(2);
  expect(stats.exactZeroFormula).toBe(10);
  expect(stats.legacyMiss).toBe('miss');
  expect(stats.legacyExact).toBe('exact');
  expect(stats.standardMiss).toBe('miss');
  expect(stats.standardExact).toBe('exact');
  expect(stats.missingBid).toBeNull();
  expect(stats.eightExact).toBe(1);
  expect(stats.eightExactPlayer).toBe('Bea');
  expect(stats.eightMiss).toBe(1);
  expect(stats.eightMissPlayer).toBe('Ada');
  expect(stats.wizardExact).toBe(1);
  expect(stats.wizardExactPlayer).toBe('Zoe');
  expect(stats.wizardMiss).toBe(0);
  expect(stats.singleExact).toMatchObject({player:'Bea', value:1});
  expect(stats.singleMiss).toMatchObject({player:'Ada', value:1});
  expect(stats.wizardSingle).toMatchObject({player:'Zoe', value:1});
});

test('a historical reopen leaves the other active game in place', async ({page})=>{
  const live={
    id:111,
    gameId:111,
    name:'Five Crowns',
    originalRoster:['Matt','Cat'],
    currentRound:2,
    maxRounds:11,
    completed:false,
    winners:[],
    rounds:[{round:1, scores:{Matt:4, Cat:8}}],
    totals:{Matt:4, Cat:8},
    auditLog:[],
    hailMaryUsed:[],
    retired:[]
  };
  await installMatch(page, live, null);
  const outcome=await page.evaluate(()=>{
    const heat={
      id:66,
      gameId:66,
      game:'Beat the Heat',
      date:'10/23/2026',
      originalRoster:['Alice','Bob'],
      currentRound:2,
      maxRounds:999,
      endScore:66,
      completed:true,
      winners:['Alice'],
      rounds:[{round:1, scores:{Alice:10, Bob:70}}],
      totals:{Alice:10, Bob:70},
      auditLog:[],
      hailMaryUsed:[],
      retired:[]
    };
    history=[heat];
    markHistoryChanged();
    const liveBefore=JSON.stringify(currentGame);
    const result=BPGScorebook.commitRoundCorrection(heat,{roundIndex:0, scores:{Bob:20}});
    finalizeHistoryCorrection(heat, result);
    return {
      reopened:!!result.standing?.reopened,
      blocked:BPGScorebook.historyReopenWouldReplaceActive(JSON.parse(liveBefore), heat),
      liveId:currentGame.id,
      liveName:currentGame.name,
      liveSame:JSON.stringify(currentGame)===liveBefore,
      heatCompleted:heat.completed,
      heatGameOver:heat.gameOver,
      heatTotal:heat.totals.Bob,
      historyId:history[0].id,
      storedLive:JSON.parse(localStorage.getItem('gn_current')).id,
      storedHeat:JSON.parse(localStorage.getItem('gn_history'))[0]
    };
  });
  expect(outcome.reopened).toBe(true);
  expect(outcome.blocked).toBe(true);
  expect(outcome.liveId).toBe(111);
  expect(outcome.liveName).toBe('Five Crowns');
  expect(outcome.liveSame).toBe(true);
  expect(outcome.heatCompleted).toBe(false);
  expect(outcome.heatGameOver).toBe(false);
  expect(outcome.heatTotal).toBe(20);
  expect(outcome.historyId).toBe(66);
  expect(outcome.storedLive).toBe(111);
  expect(outcome.storedHeat.completed).toBe(false);
  expect(outcome.storedHeat.gameOver).toBe(false);
  expect(outcome.storedHeat.winners).toEqual([]);
  expect(outcome.storedHeat.totals.Bob).toBe(20);
  await page.locator('#scorecard-capture').screenshot({path:`${ARTIFACTS}/slice1-active-game-preserved.png`});
});

test('a zero-point spin stays assisted until undo, then reload clears it', async ({page})=>{
  const dialogs=armDialogs(page);
  const game={
    id:303,
    gameId:303,
    name:'Five Crowns',
    originalRoster:['Matt'],
    currentRound:2,
    maxRounds:11,
    completed:false,
    winners:[],
    rounds:[{round:1, scores:{Matt:12}}],
    totals:{Matt:12},
    auditLog:[],
    hailMaryUsed:[],
    retired:[]
  };
  await installMatch(page, game, null);
  const spun=await page.evaluate(()=>{
    const before=currentGame.totals.Matt;
    BPGScorebook.recordLifePreserverSpin(currentGame, 'Matt', 0);
    saveData({fullPersist:true, syncCold:true});
    return {
      assisted:BPGScorebook.isAssistedMatch(currentGame),
      flag:currentGame.assistedMatch===true,
      used:[...currentGame.hailMaryUsed],
      total:currentGame.totals.Matt,
      before
    };
  });
  expect(spun.assisted).toBe(true);
  expect(spun.flag).toBe(true);
  expect(spun.used).toEqual(['Matt']);
  expect(spun.total).toBe(spun.before);
  await page.evaluate(()=>undoLastRound());
  expect(dialogs.some(dialog=>dialog.message.includes('Undo Round'))).toBe(true);
  const cleared=await page.evaluate(()=>({
    assisted:BPGScorebook.isAssistedMatch(currentGame),
    flag:currentGame.assistedMatch===true,
    used:[...(currentGame.hailMaryUsed||[])],
    bonus:currentGame.rounds.some(round=>round.hailMaryBonus)
  }));
  expect(cleared).toEqual({assisted:false, flag:false, used:[], bonus:false});
  await page.goto('/');
  await page.waitForFunction(()=>currentGame&&currentGame.id===303);
  const reloaded=await page.evaluate(()=>({
    assisted:BPGScorebook.isAssistedMatch(currentGame),
    flag:currentGame.assistedMatch===true,
    bonus:currentGame.rounds.some(round=>round.hailMaryBonus),
    cloud:canPorchCloud(),
    identity:BPGScorebook.matchIdentity(currentGame)
  }));
  expect(reloaded.assisted).toBe(false);
  expect(reloaded.flag).toBe(false);
  expect(reloaded.bonus).toBe(false);
  expect(reloaded.cloud).toBe(false);
  expect(reloaded.identity.gameId).toBe(303);
  expect(reloaded.identity.round).toBe(1);
});

test('a blank score submits as 0 and matches a typed 0', async ({page})=>{
  const dialogs=armDialogs(page);
  await installMatch(page,{
    id:4101,
    gameId:4101,
    name:'Five Crowns',
    originalRoster:['Alice','Bob','Cara','Dan'],
    currentRound:1,
    maxRounds:11,
    rounds:[],
    totals:{Alice:0, Bob:0, Cara:0, Dan:0},
    winners:[],
    auditLog:[],
    hailMaryUsed:[],
    retired:[],
    currentScoreDrafts:{},
    completed:false
  }, null);
  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  const alice=page.locator('#score-entry-status-Alice');
  await expect(alice).toHaveText('Blank');
  await expect(page.locator('#score-entry-unconfirmed')).toHaveText('Blank scores count as 0');
  await expect(page.locator('#score-entry-status-Bob')).not.toContainText('Suggested');
  await page.locator('#score-entry-modal').getByRole('button',{name:'Next', exact:true}).click();
  const blank=await page.evaluate(()=>({
    value:scoreEntryModalState.values.Alice,
    acknowledged:scoreEntryModalState.acknowledged.Alice
  }));
  expect(blank).toEqual({value:'', acknowledged:false});
  await expect(page.locator('#score-entry-value-Alice')).toHaveText('');
  await expect(page.locator('#score-entry-row-Alice')).toHaveClass(/is-empty/);
  await expect(page.locator('#score-entry-primary-btn')).toBeEnabled();
  await page.locator('#score-entry-row-Bob .score-entry-name').click();
  await (await entryKey(page,'0')).click();
  await expect(page.locator('#score-entry-value-Bob')).toHaveText('0');
  await expect(page.locator('#score-entry-status-Bob')).toContainText('Confirmed: 0');
  await page.locator('#score-entry-row-Cara .score-entry-name').click();
  await (await entryKey(page,'4')).click();
  await expect(page.locator('#score-entry-value-Dan')).toHaveText('');
  await shot(page,'slice1-blank-submits-zero');
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  expect(dialogs).toEqual([]);
  const stored=await page.evaluate(()=>currentGame.rounds[0].scores);
  expect(stored).toEqual({Alice:0, Bob:0, Cara:4, Dan:0});
  expect(stored.Alice).toBe(stored.Bob);
  expect(stored.Alice).toBe(stored.Dan);
  await expect(page.locator('#score-past-0-Alice')).toHaveValue('0');
  await expect(page.locator('#score-past-0-Bob')).toHaveValue('0');
  await expect(page.locator('#score-past-0-Dan')).toHaveValue('0');
  await page.locator('#score-past-0-Cara').click();
  await (await padKey(page,'backspace')).click();
  await expect(page.locator('#score-past-0-Cara')).toHaveValue('');
  await page.getByRole('button',{name:'Close Keypad', exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>currentGame.rounds[0].scores.Cara)).toBe(0);
  const afterEdit=await page.evaluate(()=>({
    scores:currentGame.rounds[0].scores,
    audit:currentGame.auditLog.map(entry=>entry.detail)
  }));
  expect(afterEdit.scores).toEqual({Alice:0, Bob:0, Cara:0, Dan:0});
  expect(afterEdit.scores.Cara).toBe(afterEdit.scores.Alice);
  expect(afterEdit.audit.some(detail=>String(detail).includes('Cara: 4 -> 0'))).toBe(true);
  await page.goto('/');
  await page.waitForFunction(()=>currentGame&&currentGame.id===4101&&currentGame.rounds[0]);
  const reloaded=await page.evaluate(()=>currentGame.rounds[0].scores);
  expect(reloaded).toEqual({Alice:0, Bob:0, Cara:0, Dan:0});
  await page.setViewportSize({width:390, height:844});
  await page.locator('#submit-action-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await page.waitForFunction(()=>{
    const modal=document.getElementById('score-entry-modal');
    if(!modal||modal.classList.contains('hidden')) return false;
    return Number(getComputedStyle(modal).opacity)>0.95 && modal.classList.contains('score-entry-managed-fit');
  });
  await expect(page.locator('#score-entry-unconfirmed')).toHaveText('Blank scores count as 0');
  await expect(page.locator('#score-entry-status-Alice')).toHaveText('Blank');
  await expect(page.locator('#score-entry-primary-btn')).toBeEnabled();
  await shot(page,'slice1-blank-submits-zero-phone');
  const book=await page.evaluate(()=>{
    currentGame=null;
    _matchHallOfFameSnap=null;
    _matchAllTimeRecordsSnap=null;
    history=[{
      id:77,
      gameId:77,
      game:'Five Crowns',
      completed:true,
      gameOver:true,
      winners:['Bea'],
      originalRoster:['Ada','Bea'],
      totals:{Ada:0, Bea:0},
      rounds:[{round:1, scores:{Ada:null, Bea:0}}],
      date:'10/23/2026'
    }];
    const fame=calculateHallOfFame();
    const records=calculateAllTimeRecords();
    return {
      mostZeros:fame['Five Crowns'].mostZeros,
      mostZerosPlayer:fame['Five Crowns'].mostZerosPlayer,
      bestRound:records.games['Five Crowns'].bestRound.value,
      bestRoundPlayer:records.games['Five Crowns'].bestRound.player
    };
  });
  expect(book.mostZeros).toBe(1);
  expect(book.mostZerosPlayer).toBe('Bea');
  expect(book.bestRound).toBe(0);
  expect(book.bestRoundPlayer).toBe('Bea');
});

test('retired 818 seats keep Cara in the correction and leave Dan out', async ({page})=>{
  await openScenario(page,{scenario:'home-party', surface:'home'});
  await page.evaluate(()=>{
    currentGame=null;
    history=[{
      id:8183,
      gameId:8183,
      game:'818',
      date:'10/23/2026',
      dealerOffset:0,
      originalRoster:['Alice','Bob','Cara','Dan'],
      retired:['Cara'],
      currentRound:4,
      maxRounds:15,
      completed:true,
      gameOver:true,
      winners:['Alice'],
      totals:{Alice:2, Bob:2, Cara:2},
      rounds:[{
        round:3,
        bids:{Alice:1, Bob:1, Cara:4},
        actuals:{Alice:2, Bob:2, Cara:2},
        scores:{Alice:2, Bob:2, Cara:2}
      }],
      hailMaryUsed:[],
      auditLog:[]
    }];
    markHistoryChanged();
    saveData({fullPersist:true, syncCold:true});
    showHistory();
  });
  await page.getByRole('button',{name:'Scorecard', exact:true}).click();
  await page.locator('.round-correct-btn').click();
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  await expect(page.locator('.round-correction-row')).toHaveCount(3);
  await expect(page.locator('.round-correction-row[data-player="Cara"]')).toBeVisible();
  await expect(page.locator('.round-correction-row[data-player="Dan"]')).toHaveCount(0);
  const beforeDealer=await page.evaluate(()=>JSON.stringify(history[0]));
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-error')).toHaveText('Dealer Cara cannot bid 4 on round 3.');
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(history[0]))).toBe(beforeDealer);
  await shot(page,'slice1-818-dealer-cara');

  await page.evaluate(()=>{
    cancelRoundCorrection();
    closeModal('scorecard-modal');
    currentGame=null;
    history=[{
      id:8184,
      gameId:8184,
      game:'818',
      date:'10/23/2026',
      dealerOffset:0,
      originalRoster:['Alice','Bob','Cara','Dan'],
      retired:['Cara'],
      currentRound:4,
      maxRounds:15,
      completed:true,
      gameOver:true,
      winners:['Alice'],
      totals:{Alice:2, Bob:2, Cara:2, Dan:1},
      rounds:[{
        round:3,
        bids:{Alice:1, Bob:1, Cara:1, Dan:0},
        actuals:{Alice:2, Bob:2, Cara:2, Dan:1},
        scores:{Alice:2, Bob:2, Cara:2, Dan:1},
        joinBonus:{Dan:true}
      }],
      hailMaryUsed:[],
      auditLog:[]
    }];
    markHistoryChanged();
    saveData({fullPersist:true, syncCold:true});
    showHistory();
  });
  await page.getByRole('button',{name:'Scorecard', exact:true}).click();
  await page.locator('.round-correct-btn').click();
  await expect(page.locator('.round-correction-row')).toHaveCount(3);
  await expect(page.locator('.round-correction-row[data-player="Dan"]')).toHaveCount(0);
  await correctionKey(page,'4').click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-error')).toHaveText('818 round 3 must total 6 tricks. This table totals 8.');
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  expect(await page.evaluate(()=>history[0].rounds[0].actuals.Dan)).toBe(1);
  await correctionKey(page,'backspace').click();
  await correctionKey(page,'3').click();
  await page.locator('.round-correction-row[data-player="Bob"]').click();
  await correctionKey(page,'1').click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  const saved=await page.evaluate(()=>{
    const row=history.find(match=>match.id===8184);
    return {
      actuals:{...row.rounds[0].actuals},
      scores:{...row.rounds[0].scores},
      action:row.auditLog.at(-1).action,
      retired:[...row.retired],
      live:currentGame
    };
  });
  expect(saved.actuals).toEqual({Alice:3, Bob:1, Cara:2, Dan:1});
  expect(saved.scores.Dan).toBe(1);
  expect(saved.scores.Alice).toBe(3);
  expect(saved.scores.Bob).toBe(11);
  expect(saved.scores.Cara).toBe(2);
  expect(saved.action).toBe('R3 Tricks Edited');
  expect(saved.retired).toEqual(['Cara']);
  expect(saved.live).toBeNull();
});

test('boot backfills a legacy match that has no id and no gameId', async ({page})=>{
  // Saved matches live in gn_history. The live table is gn_current. There is no gn_state key.
  // Seed before the document script reads storage. A later write is flushed away on pagehide.
  const legacy={
    game:'Five Crowns',
    date:'10/23/2026',
    originalRoster:['Ada'],
    totals:{Ada:4},
    winners:['Ada'],
    rounds:[{round:1, scores:{Ada:4}}],
    completed:true,
    currentRound:2,
    maxRounds:11
  };
  await page.addInitScript(match=>{
    if(localStorage.getItem('gn_history')) return;
    localStorage.setItem('gn_history', JSON.stringify([match]));
    localStorage.removeItem('gn_current');
  }, legacy);
  await page.goto('/');
  await page.waitForFunction(()=>{
    const rows=JSON.parse(localStorage.getItem('gn_history')||'[]');
    return !!(rows[0]&&rows[0].gameId);
  });
  const first=await page.evaluate(()=>{
    const stored=JSON.parse(localStorage.getItem('gn_history'))[0];
    return {
      storedId:stored.id,
      storedGameId:stored.gameId,
      memoryId:history[0].id,
      memoryGameId:history[0].gameId,
      cloud:canPorchCloud(),
      porch:localStorage.getItem('gn_porch_key')
    };
  });
  expect(String(first.storedGameId).length).toBeGreaterThan(0);
  expect(first.storedId).toBe(first.storedGameId);
  expect(first.memoryGameId).toBe(first.storedGameId);
  expect(first.memoryId).toBe(first.storedGameId);
  expect(first.cloud).toBe(false);
  expect(first.porch).toBeNull();
  await page.evaluate(()=>showHistory());
  await expect(page.locator('#history-list-view button',{hasText:'Resume'}).first()).toBeVisible();
  const onclick=await page.locator('#history-list-view button',{hasText:'Resume'}).first().getAttribute('onclick');
  expect(onclick).toBe(`resumeMatch(${JSON.stringify(first.storedGameId)})`);
  await page.reload();
  await page.waitForFunction(gameId=>{
    const rows=JSON.parse(localStorage.getItem('gn_history')||'[]');
    return rows[0]&&rows[0].gameId===gameId;
  }, first.storedGameId);
  const second=await page.evaluate(()=>({
    memory:history[0].gameId,
    stored:JSON.parse(localStorage.getItem('gn_history'))[0].gameId,
    cloud:canPorchCloud()
  }));
  expect(second.memory).toBe(first.storedGameId);
  expect(second.stored).toBe(first.storedGameId);
  expect(second.cloud).toBe(false);
});

test('an incomplete history match stays out of the book until Resume Match is confirmed', async ({page})=>{
  const live={
    id:111,
    gameId:111,
    name:'Five Crowns',
    originalRoster:['Matt','Cat'],
    currentRound:2,
    maxRounds:11,
    completed:false,
    gameOver:false,
    winners:[],
    rounds:[{round:1, scores:{Matt:4, Cat:8}}],
    totals:{Matt:4, Cat:8},
    auditLog:[],
    hailMaryUsed:[],
    retired:[]
  };
  await installMatch(page, live, null);
  const messages=[];
  page.on('dialog', async dialog=>{
    messages.push(dialog.message());
    if(messages.length===1) await dialog.dismiss();
    else await dialog.accept();
  });
  const stats=await page.evaluate(()=>{
    history=[
      {
        id:501,
        gameId:501,
        game:'Wizard',
        date:'10/23/2026',
        originalRoster:['Alice','Bob'],
        currentRound:2,
        maxRounds:30,
        completed:true,
        gameOver:true,
        winners:['Alice'],
        totals:{Alice:30, Bob:-10},
        rounds:[{round:1, bids:{Alice:1, Bob:1}, actuals:{Alice:1, Bob:0}, scores:{Alice:30, Bob:-10}}],
        hailMaryUsed:[],
        retired:[],
        auditLog:[]
      },
      {
        id:66,
        gameId:66,
        game:'Beat the Heat',
        date:'10/23/2026',
        originalRoster:['Alice','Bob'],
        currentRound:2,
        maxRounds:999,
        endScore:66,
        completed:false,
        gameOver:false,
        winners:[],
        totals:{Alice:10, Bob:20},
        rounds:[{round:1, scores:{Alice:10, Bob:20}}],
        hailMaryUsed:[],
        retired:[],
        auditLog:[]
      }
    ];
    markHistoryChanged();
    saveData({fullPersist:true, syncCold:true});
    _matchHallOfFameSnap=null;
    _matchAllTimeRecordsSnap=null;
    const fame=calculateHallOfFame();
    const records=calculateAllTimeRecords();
    const alice=getProfileSummary('Alice');
    const bob=getProfileSummary('Bob');
    const aliceGames=records.allTime.mostGames.find(row=>row.player==='Alice');
    showHistory();
    return {
      heatBest:fame['Beat the Heat'].bestPlayer,
      heatBestGame:records.games['Beat the Heat'].bestGame,
      mostGames:fame.Overall.mostGames,
      wizardBest:fame.Wizard.bestPlayer,
      aliceGames:alice.games,
      aliceWins:alice.wins,
      bobGames:bob.games,
      bobWins:bob.wins,
      aliceRecordGames:aliceGames?aliceGames.value:0,
      liveId:currentGame.id
    };
  });
  expect(stats.heatBest).toBe('-');
  expect(stats.heatBestGame).toBeNull();
  expect(stats.mostGames).toBe(1);
  expect(stats.wizardBest).toBe('Alice');
  expect(stats.aliceGames).toBe(1);
  expect(stats.aliceWins).toBe(1);
  expect(stats.bobGames).toBe(1);
  expect(stats.bobWins).toBe(0);
  expect(stats.aliceRecordGames).toBe(1);
  expect(stats.liveId).toBe(111);
  const heat=page.locator('#history-list-view .surface',{hasText:'Beat the Heat'});
  const wizard=page.locator('#history-list-view .surface',{hasText:'Wizard'});
  await expect(heat.locator('[data-match-status="incomplete"]')).toHaveText('Incomplete');
  await expect(heat.getByRole('button',{name:'Resume Match', exact:true})).toBeVisible();
  await expect(wizard.locator('[data-match-status="incomplete"]')).toHaveCount(0);
  await expect(wizard.getByRole('button',{name:'Resume', exact:true})).toBeVisible();
  await heat.screenshot({path:`${ARTIFACTS}/slice1-incomplete-resume.png`});
  await heat.getByRole('button',{name:'Resume Match', exact:true}).click();
  expect(messages).toEqual(['Save the game on the table and resume this match?']);
  expect(await page.evaluate(()=>currentGame.id)).toBe(111);
  await heat.getByRole('button',{name:'Resume Match', exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>currentGame&&currentGame.id)).toBe(66);
  const parked=await page.evaluate(()=>{
    const prior=history.find(row=>row.id===111);
    return {
      liveId:currentGame.id,
      liveName:currentGame.name,
      heatInHistory:history.some(row=>row.id===66),
      priorCompleted:prior&&prior.completed,
      priorGameOver:prior&&prior.gameOver,
      priorMatt:prior&&prior.totals.Matt,
      priorWinners:prior?prior.winners:null
    };
  });
  expect(parked).toEqual({
    liveId:66,
    liveName:'Beat the Heat',
    heatInHistory:false,
    priorCompleted:false,
    priorGameOver:false,
    priorMatt:4,
    priorWinners:[]
  });
  expect(messages).toEqual([
    'Save the game on the table and resume this match?',
    'Save the game on the table and resume this match?'
  ]);
});
