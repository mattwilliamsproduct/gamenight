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

  let setup=await startHandFoot(page, {names:['Ann','Bo'], format:'singles'});
  expect(setup.sides).toBe(2);
  await playRound(page, [['2','1','2','1','450','95'], ['0','0','0','0','-40','10']]);
  await page.reload({waitUntil:'domcontentloaded'});
  let game=await readGame(page);
  expect(game.rounds[0].scores.Ann).toBe(1955);
  expect(game.rounds[0].handFootParts.Ann.cardsLeft).toBe(95);
  await playRound(page, [['0','0','0','1','0','0'], ['0','0','0','0','0','0']]);
  await playRound(page, [['1','0','0','0','0','0'], ['0','0','1','0','0','0']]);
  await playRound(page, [['0','0','0','0','10','0'], ['0','1','0','0','0','0']]);
  await expect(page.locator('#game-over-section')).toContainText('Match Complete');
  await endMatch(page);
  await expect(page.locator('#victory-names')).toContainText('Ann');

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee'], format:'teams'});
  expect(setup.sides).toBe(2);
  expect(setup.seats).toEqual(['Ann','Bo','Cy','Dee']);
  await playFourRounds(page, 'pairs4');
  game=await readGame(page);
  expect(game.handFoot.sides).toHaveLength(2);
  expect(game.rounds[0].scores.Ann).toBe(game.rounds[0].scores.Bo);
  await endMatch(page);

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee'], format:'singles'});
  expect(setup.sides).toBe(4);
  await playFourRounds(page, 'singles4');
  await endMatch(page);

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee','Eve','Fay'], format:'teams'});
  expect(setup.sides).toBe(3);
  expect(setup.note).toMatch(/Three pairs/);
  await playFourRounds(page, 'pairs6');
  game=await readGame(page);
  expect(game.rounds).toHaveLength(4);
  expect(game.handFoot.sides.every(side=>side.members.length===2)).toBe(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#game-over-section')).toBeVisible();
  await endMatch(page);

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee','Eve','Fay'], format:'singles'});
  expect(setup.sides).toBe(6);
  await playFourRounds(page, 'singles6');
  game=await readGame(page);
  expect(Object.keys(game.rounds[0].scores)).toHaveLength(6);
  await endMatch(page);
  await expect(page.locator('#victory-names')).toBeVisible();

  const history=await readHistory(page);
  const handFoot=history.filter(item=>item.game==='Hand and Foot');
  expect(handFoot).toHaveLength(1);
  expect(handFoot[0].rounds).toHaveLength(4);
  expect(handFoot[0].handFoot.format).toBe('singles');
  expect(handFoot[0].originalRoster).toEqual(['Ann','Bo','Cy','Dee','Eve','Fay']);
  expect(cloudHits).toEqual([]);
});
