import {expect, test} from '@playwright/test';
import {endMatch, freshTable, playFourRounds, playRound, readGame, readHistory, silencePorchPrompts, startHandFoot} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers:'block'});

test('porch night can score a full Hand and Foot table without calling the cloud', async ({page})=>{
  test.setTimeout(120000);
  const cloudHits=[];
  page.on('request', request=>{
    const url=request.url();
    if(/cardknight\.vercel\.app|upstash|\/api\/sync/i.test(url)) cloudHits.push(url);
  });
  await silencePorchPrompts(page);
  await freshTable(page);

  let setup=await startHandFoot(page, {names:['Ann','Bo']});
  expect(setup.sides).toBe(2);
  await playRound(page, [
    {basic:'1600', count:'450', got22:true, cardsLeft:'95'},
    {basic:'0', count:'-40', cardsLeft:'10'}
  ]);
  await page.reload({waitUntil:'domcontentloaded'});
  let game=await readGame(page);
  expect(game.rounds[0].scores.Ann).toBe(2055);
  expect(game.rounds[0].handFootParts.Ann.cardsLeft).toBe(95);
  await playRound(page, [{basic:'0', count:'0', cardsLeft:'0'}, {basic:'0', count:'0', cardsLeft:'0'}]);
  await playRound(page, [{basic:'100', count:'0', cardsLeft:'0'}, {basic:'0', count:'0', wentOut:true}]);
  await playRound(page, [{basic:'0', count:'10', cardsLeft:'0'}, {basic:'300', count:'0', cardsLeft:'0'}]);
  await expect(page.locator('#game-over-section')).toContainText('Match complete');
  await endMatch(page);
  await expect(page.locator('#victory-names')).toContainText('Ann Wins!');

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee']});
  expect(setup.sides).toBe(2);
  expect(setup.seats).toEqual(['Ann','Bo','Cy','Dee']);
  await playFourRounds(page, 'pairs4');
  game=await readGame(page);
  expect(game.handFoot.sides).toHaveLength(2);
  expect(game.rounds[0].scores.Ann).toBe(game.rounds[0].scores.Bo);
  await endMatch(page);

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee','Eve','Fay']});
  expect(setup.sides).toBe(2);
  expect(setup.note).toMatch(/Two teams of three/);
  await playFourRounds(page, 'trios6');
  game=await readGame(page);
  expect(game.rounds).toHaveLength(4);
  expect(game.handFoot.sides.every(side=>side.members.length===3)).toBe(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#game-over-section')).toBeVisible();
  await endMatch(page);
  const history=await readHistory(page);
  const handFoot=history.filter(item=>item.game==='Hand and Foot');
  expect(handFoot).toHaveLength(1);
  expect(handFoot[0].rounds).toHaveLength(4);
  expect(handFoot[0].handFoot.format).toBe('teams');
  expect(handFoot[0].winners.slice().sort()).toEqual(['Ann','Bo','Cy']);
  expect(handFoot[0].originalRoster).toEqual(['Ann','Bo','Cy','Dee','Eve','Fay']);
  expect(cloudHits).toEqual([]);
});
