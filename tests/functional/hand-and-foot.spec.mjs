import {expect, test} from '@playwright/test';
import {
  editFirstRoundCardsLeft,
  freshTable,
  endMatch,
  playFourRounds,
  playRound,
  readGame,
  readHistory,
  silencePorchPrompts,
  startHandFoot
} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers:'block'});

test.beforeEach(async ({page})=>{
  await silencePorchPrompts(page);
});

test('a 2-player Hand and Foot match scores four rounds, survives reload, and lands in records', async ({page})=>{
  await freshTable(page);
  const setup=await startHandFoot(page, {names:['Ann','Bo'], format:'singles'});
  expect(setup.sides).toBe(2);
  expect(setup.seats).toEqual([]);
  expect(setup.note).toMatch(/1 versus 1/);

  await playRound(page, [
    {basic:'1600', count:'450', got22:true, cardsLeft:'95'},
    {basic:'0', count:'-40', cardsLeft:'10'}
  ]);
  let game=await readGame(page);
  expect(game.rounds).toHaveLength(1);
  expect(game.rounds[0].scores.Ann).toBe(2055);
  expect(game.rounds[0].scores.Bo).toBe(-50);
  expect(game.rounds[0].handFootParts.Ann.basic).toBe(1600);
  expect(game.rounds[0].handFootParts.Ann.count).toBe(450);
  expect(game.rounds[0].handFootParts.Ann.got22).toBe(true);
  expect(game.rounds[0].handFootParts.Ann.wentOut).toBe(false);
  expect(game.rounds[0].handFootParts.Ann.cardsLeft).toBe(95);
  expect(game.rounds[0].handFootParts.Ann.cleanCanastas).toBeUndefined();
  expect(game.rounds[0].scores['Ann & Bo']).toBeUndefined();

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#scorecard-body')).toContainText('2055');
  game=await readGame(page);
  expect(game.currentRound).toBe(2);
  expect(game.rounds[0].scores.Ann).toBe(2055);

  await editFirstRoundCardsLeft(page, '#score-past-0-Ann');
  game=await readGame(page);
  expect(game.rounds[0].handFootParts.Ann.cardsLeft).toBe(0);
  expect(game.rounds[0].scores.Ann).toBe(2150);

  await playRound(page, [
    {basic:'1600', count:'450', got22:true, cardsLeft:'95'},
    {basic:'0', count:'-40', cardsLeft:'10'}
  ]);
  await playRound(page, [
    {basic:'1600', count:'450', got22:true, cardsLeft:'95'},
    {basic:'0', count:'-40', cardsLeft:'10'}
  ]);
  await playRound(page, [
    {basic:'1600', count:'450', got22:true, cardsLeft:'95'},
    {basic:'0', count:'-40', cardsLeft:'10'}
  ]);
  game=await readGame(page);
  expect(game.rounds).toHaveLength(4);
  expect(game.currentRound).toBe(5);
  await expect(page.locator('#game-over-section')).toBeVisible();
  await expect(page.locator('#game-over-section')).toContainText('Match Complete');

  await endMatch(page);
  await expect(page.locator('#victory-names')).toContainText('Needs review');
  const history=await readHistory(page);
  const match=history.find(item=>item.game==='Hand and Foot' && item.originalRoster?.includes('Ann'));
  expect(match).toBeTruthy();
  expect(match.rounds).toHaveLength(4);
  expect(match.totals.Ann).toBeGreaterThan(match.totals.Bo);
});

test('4 players are two pairs and 6 players are three pairs, and singles stay one column each', async ({page})=>{
  test.setTimeout(120000);
  await freshTable(page);
  let setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee'], format:'teams'});
  expect(setup.sides).toBe(2);
  expect(setup.seats).toEqual(['Ann','Bo','Cy','Dee']);
  expect(setup.note).toMatch(/Two pairs/);
  await playRound(page, [
    {basic:'1600', count:'450', got22:true, cardsLeft:'95'},
    {basic:'300', count:'0', cardsLeft:'20'}
  ]);
  let game=await readGame(page);
  expect(game.handFoot.sides.map(side=>side.key)).toEqual(['Ann & Bo','Cy & Dee']);
  expect(game.rounds[0].scores.Ann).toBe(2055);
  expect(game.rounds[0].scores.Bo).toBe(2055);
  expect(game.rounds[0].scores.Cy).toBe(280);
  expect(game.rounds[0].scores.Dee).toBe(280);
  expect(game.rounds[0].scores['Ann & Bo']).toBeUndefined();
  expect(game.rounds[0].handFootParts.Ann).toEqual(game.rounds[0].handFootParts.Bo);

  await page.reload({waitUntil:'domcontentloaded'});
  game=await readGame(page);
  expect(game.rounds[0].handFootParts.Bo.basic).toBe(1600);
  expect(game.currentRound).toBe(2);
  await playRound(page, [{basic:'0', count:'0', cardsLeft:'0'}, {basic:'0', count:'0', cardsLeft:'0'}]);
  await playRound(page, [{basic:'100', count:'0', cardsLeft:'0'}, {basic:'0', count:'10', cardsLeft:'0'}]);
  await playRound(page, [{basic:'0', count:'0', cardsLeft:'0'}, {basic:'0', count:'0', cardsLeft:'0'}]);
  await expect(page.locator('#game-over-section')).toBeVisible();
  await endMatch(page);
  await expect(page.locator('#victory-names')).toBeVisible();
  let history=await readHistory(page);
  expect(history.some(item=>item.game==='Hand and Foot' && item.handFoot?.format==='teams' && item.rounds.length===4)).toBe(true);

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee'], format:'singles'});
  expect(setup.sides).toBe(4);
  expect(setup.seats).toEqual([]);
  expect(setup.note).toMatch(/own column/);
  await playFourRounds(page, 'singles4');
  game=await readGame(page);
  expect(Object.keys(game.rounds[0].scores).sort()).toEqual(['Ann','Bo','Cy','Dee']);
  expect(game.rounds).toHaveLength(4);
  await endMatch(page);
  await expect(page.locator('#victory-names')).toContainText('Needs review');

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee','Eve','Fay'], format:'teams'});
  expect(setup.sides).toBe(3);
  expect(setup.seats).toEqual(['Ann','Bo','Cy','Dee','Eve','Fay']);
  expect(setup.note).toMatch(/Three pairs/);
  await playFourRounds(page, 'pairs6');
  game=await readGame(page);
  expect(game.handFoot.sides).toHaveLength(3);
  expect(game.handFoot.sides.every(side=>side.members.length===2)).toBe(true);
  expect(game.rounds[0].scores.Ann).toBe(2150);
  expect(game.rounds[0].scores.Eve).toBe(500);
  expect(game.rounds[0].scores.Fay).toBe(500);
  expect(game.rounds).toHaveLength(4);
  await page.reload({waitUntil:'domcontentloaded'});
  game=await readGame(page);
  expect(game.currentRound).toBe(5);
  await expect(page.locator('#game-over-section')).toBeVisible();
  await endMatch(page);
  history=await readHistory(page);
  const six=history.find(item=>item.originalRoster?.length===6 && item.game==='Hand and Foot');
  expect(six?.rounds).toHaveLength(4);
  expect(six.handFoot.sides).toHaveLength(3);

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee','Eve','Fay'], format:'singles'});
  expect(setup.sides).toBe(6);
  expect(setup.seats).toEqual([]);
  await playFourRounds(page, 'singles6');
  game=await readGame(page);
  expect(Object.keys(game.rounds[3].scores).sort()).toEqual(['Ann','Bo','Cy','Dee','Eve','Fay']);
  expect(game.rounds).toHaveLength(4);
  await endMatch(page);
  await expect(page.locator('#victory-names')).toContainText('Needs review');
  history=await readHistory(page);
  expect(history.filter(item=>item.game==='Hand and Foot' && item.handFoot?.format==='singles' && item.originalRoster?.length===6)).toHaveLength(1);
});
