import {expect, test} from '@playwright/test';
import {silencePorchPrompts} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers:'block'});

test.beforeEach(async ({page})=>{
  await silencePorchPrompts(page);
});

test('picker shows Canasta and hides Rook unless ?demo&games=rook', async ({page})=>{
  await page.goto('/?wipe=1', {waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"]')).toBeVisible();
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"]')).toContainText('Canasta');
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Rook"]')).toHaveCount(0);

  await page.goto('/?demo&games=rook', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.gnDemoReady==='seeded'||document.body.dataset.gnDemoReady==='skipped', null, {timeout:20000});
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Rook"]')).toBeVisible();
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"]')).toBeVisible();
});

test('saved Rook history still opens on Records after Rook is hidden', async ({page})=>{
  const match={
    id:1785600000099,
    gameId:1785600000099,
    game:'Rook',
    date:'10/27/2026',
    completed:true,
    originalRoster:['Megan','Matt','Cat','Mike'],
    currentRound:2,
    totals:{Megan:110,Matt:110,Cat:90,Mike:90},
    winners:['Megan','Matt'],
    rounds:[{
      round:1,
      scores:{Megan:110,Matt:110,Cat:90,Mike:90},
      rookBid:90,
      rookBidder:'Megan',
      rookPartner:'Matt',
      rookMadeIt:true
    }]
  };
  await page.addInitScript((night)=>{
    localStorage.setItem('gn_history', JSON.stringify([night]));
    localStorage.setItem('gn_players_v2', JSON.stringify(['Megan','Matt','Cat','Mike']));
    localStorage.setItem('gn_all_players', JSON.stringify(['Megan','Matt','Cat','Mike']));
    sessionStorage.setItem('hf-cleared','1');
  }, match);
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Rook"]')).toHaveCount(0);
  await page.getByRole('button', {name:/Records/}).click();
  await expect(page.locator('.s2-ledger .s2-night').first()).toContainText('Rook');
  await page.locator('.s2-ledger [data-s2-action="night-scorecard"]').first().click();
  await expect(page.locator('#modal-game-name')).toContainText('Rook');
  await expect(page.locator('#modal-scorecard-body')).toContainText('Megan');
});
