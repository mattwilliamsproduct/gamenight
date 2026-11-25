import {expect, test} from '@playwright/test';
import {
  editFirstRoundCardsLeft,
  freshTable,
  openHandFootSetup,
  seatPlayers,
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
  await expect(page.locator('#game-over-section')).toContainText('Match complete');

  await endMatch(page);
  await expect(page.locator('#victory-names')).toContainText('Ann Wins!');
  const history=await readHistory(page);
  const match=history.find(item=>item.game==='Hand and Foot' && item.originalRoster?.includes('Ann'));
  expect(match).toBeTruthy();
  expect(match.outcome).toBe('finished');
  expect(match.rounds).toHaveLength(4);
  expect(match.totals.Ann).toBeGreaterThan(match.totals.Bo);
});

for(const count of [3, 5]){
  test(`Canasta starts straight into singles with ${count} players`, async ({page})=>{
    await freshTable(page);
    const names=['Ann','Bo','Cy','Dee','Eve'].slice(0,count);
    const setup=await startHandFoot(page, {names, format:'singles'});
    expect(setup.sides).toBe(count);
    const game=await readGame(page);
    expect(game.handFoot.format).toBe('singles');
    expect(game.handFoot.sides.map(side=>side.members)).toEqual(names.map(name=>[name]));
  });
}

test('two-player Canasta shows only completed singles history for the same pair', async ({page})=>{
  await freshTable(page);
  await startHandFoot(page, {names:['Ann','Bo'], format:'singles'});
  await expect(page.locator('#canasta-together')).toBeHidden();
  const row=page.locator('#scorecard-body tr').first();
  expect((await row.boundingBox()).height).toBeGreaterThan(150);

  await page.evaluate(()=>{
    const rounds=Array.from({length:4},(_,i)=>({round:i+1,scores:{Ann:1280,Bo:1120}}));
    const match={id:'pair',game:'Hand and Foot',date:'11/20/2026',completed:true,outcome:'finished',
      originalRoster:['bo','ann'],totals:{ann:5120,bo:4480},rounds,handFoot:{format:'singles'}};
    history=[
      {...match,id:'team',handFoot:{format:'teams'}},
      {...match,id:'paused',completed:false,outcome:'paused'},
      {...match,id:'different',originalRoster:['Ann','Cy']},
      match
    ];
    renderGame();
  });
  const panel=page.locator('#canasta-together');
  await expect(panel).toContainText('1 completed match');
  await expect(panel).toContainText('Ann 5,120 · Bo 4,480');
  await page.setViewportSize({width:390,height:844});
  await expect(panel).toBeHidden();
  await expect(page.locator('#slice2-enter-btn')).toBeInViewport();
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
  await expect(page.locator('#victory-names')).toContainText('Ann Wins!');

  await freshTable(page);
  setup=await startHandFoot(page, {names:['Ann','Bo','Cy','Dee','Eve','Fay'], format:'teams', teamCount:3});
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
  await expect(page.locator('#victory-names')).toContainText('Ann Wins!');
  history=await readHistory(page);
  expect(history.filter(item=>item.game==='Hand and Foot' && item.handFoot?.format==='singles' && item.originalRoster?.length===6)).toHaveLength(1);
});

test('tapping the other team swaps the pair and leaves dealer order', async ({page})=>{
  await freshTable(page);
  await seatPlayers(page, ['Ann','Bo','Cy','Dee']);
  await openHandFootSetup(page);
  await expect(page.locator('#hand-foot-setup-title')).toHaveText('Choose your teams');
  await expect(page.locator('#hand-foot-setup-modal select')).toHaveCount(0);
  await expect(page.locator('#hand-foot-setup-modal')).not.toContainText('Pick who sits together');
  await expect(page.locator('#hand-foot-setup-order')).toHaveText('Tap a player, then someone on the other team to swap.');
  await expect(page.locator('#hand-foot-setup-score')).toHaveText('Enter one score per team each round.');
  await page.locator('.hf-team-person[data-name="Bo"]').click();
  await page.locator('.hf-team-person[data-name="Cy"]').click();
  await expect(page.locator('.hf-team-person').nth(0)).toHaveAttribute('data-name', 'Ann');
  await expect(page.locator('.hf-team-person').nth(1)).toHaveAttribute('data-name', 'Cy');
  await expect(page.locator('.hf-team-person').nth(2)).toHaveAttribute('data-name', 'Bo');
  await expect(page.locator('.hf-team-person').nth(3)).toHaveAttribute('data-name', 'Dee');
  await page.getByRole('button', {name:/Start match/}).click();
  await expect(page.locator('#game-screen')).toBeVisible();
  const order=await page.evaluate(()=>({
    roster: currentGame.originalRoster.slice(),
    seats: players.slice(),
    dealer: currentGame.dealerOffset||0,
    sides: currentGame.handFoot.sides.map(side=>side.key)
  }));
  expect(order).toEqual({
    roster:['Ann','Bo','Cy','Dee'],
    seats:['Ann','Bo','Cy','Dee'],
    dealer:0,
    sides:['Ann & Cy','Bo & Dee']
  });
});

test('six-player Canasta defaults to 2 teams of 3, swaps seat 3, scores, and credits all 3 teammates', async ({page})=>{
  test.setTimeout(120000);
  await freshTable(page);
  await seatPlayers(page, ['Ann','Bo','Cy','Dee','Eve','Fay']);
  await openHandFootSetup(page);

  await expect(page.locator('#hand-foot-split-toggle')).toBeVisible();
  await expect(page.locator('#hf-split-2')).toHaveClass(/rook-opt-active/);
  await expect(page.locator('#hf-split-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hf-split-3')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#hand-foot-setup-note')).toHaveText('Two teams of three. All teammates keep the team score.');
  await expect(page.locator('#hand-foot-setup-sides .hf-setup-side')).toHaveCount(2);
  await expect(page.locator('#hand-foot-setup-sides .hf-team-person')).toHaveCount(6);

  // Toggling to 3 pairs and back preserves all 6 players cleanly.
  await page.locator('#hf-split-3').click();
  await expect(page.locator('#hf-split-3')).toHaveClass(/rook-opt-active/);
  await expect(page.locator('#hand-foot-setup-note')).toHaveText('Three pairs. Both partners keep the team score.');
  await expect(page.locator('#hand-foot-setup-sides .hf-setup-side')).toHaveCount(3);
  await page.locator('#hf-split-2').click();
  await expect(page.locator('#hf-split-2')).toHaveClass(/rook-opt-active/);
  await expect(page.locator('#hand-foot-setup-sides .hf-setup-side')).toHaveCount(2);

  // Swap seat 3 (Cy) on Team 1 with seat 3 (Fay) on Team 2.
  await page.locator('.hf-team-person[data-name="Cy"]').click();
  await page.locator('.hf-team-person[data-name="Fay"]').click();
  const seatsAfterSwap=await page.locator('.hf-team-person').evaluateAll(els=>els.map(el=>el.dataset.name));
  expect(seatsAfterSwap).toEqual(['Ann','Bo','Fay','Dee','Eve','Cy']);

  await page.getByRole('button', {name:/Start match/}).click();
  await expect(page.locator('#game-screen')).toBeVisible();
  await expect(page.locator('#scorecard-body tr')).toHaveCount(2);
  await expect(page.locator('#scorecard-body')).toContainText('Ann, Bo & Fay');
  await expect(page.locator('#scorecard-body')).toContainText('Dee, Eve & Cy');

  await playFourRounds(page, 'trios6');
  const game=await readGame(page);
  expect(game.handFoot.sides.map(side=>side.members)).toEqual([['Ann','Bo','Fay'],['Dee','Eve','Cy']]);
  expect(game.rounds).toHaveLength(4);
  expect(game.rounds[0].scores.Ann).toBe(2150);
  expect(game.rounds[0].scores.Bo).toBe(2150);
  expect(game.rounds[0].scores.Fay).toBe(2150);
  expect(game.rounds[0].scores.Dee).toBe(280);
  expect(game.rounds[0].scores.Eve).toBe(280);
  expect(game.rounds[0].scores.Cy).toBe(280);
  await expect(page.locator('#game-over-section')).toBeVisible();

  await endMatch(page);
  await expect(page.locator('#victory-names')).toContainText('Ann');
  await expect(page.locator('#victory-names')).toContainText('Bo');
  await expect(page.locator('#victory-names')).toContainText('Fay');

  const history=await readHistory(page);
  const saved=history.find(item=>item.game==='Hand and Foot' && item.originalRoster?.length===6);
  expect(saved?.handFoot?.sides?.map(side=>side.members)).toEqual([['Ann','Bo','Fay'],['Dee','Eve','Cy']]);
  expect((saved?.winners||[]).slice().sort()).toEqual(['Ann','Bo','Fay']);

  // Verify Player Passports credit all 3 winning teammates with 1 win / 1 game and opponents with 0 wins / 1 game.
  await page.evaluate(()=>{ if(typeof showProfiles==='function') showProfiles(); });
  await expect(page.locator('#profiles-grid')).toBeVisible();
  const passports=await page.evaluate(()=>{
    const out={};
    document.querySelectorAll('.profile-passport-card').forEach(card=>{
      const name=card.querySelector('.profile-passport-name')?.textContent?.trim();
      const stats=[...card.querySelectorAll('.profile-mini-stat')].map(el=>({
        label:el.querySelector('span')?.textContent?.trim(),
        value:el.querySelector('strong')?.textContent?.trim()
      }));
      const games=stats.find(row=>row.label==='Games');
      const wins=stats.find(row=>row.label==='Wins');
      if(name) out[name]={wins:Number(wins?.value), games:Number(games?.value)};
    });
    return out;
  });
  expect(passports.Ann).toEqual({wins:1, games:1});
  expect(passports.Bo).toEqual({wins:1, games:1});
  expect(passports.Fay).toEqual({wins:1, games:1});
  expect(passports.Dee).toEqual({wins:0, games:1});
  expect(passports.Eve).toEqual({wins:0, games:1});
  expect(passports.Cy).toEqual({wins:0, games:1});
});
