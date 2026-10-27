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
  await page.waitForFunction(()=>!!document.body.dataset.gnDemoReady || !!document.querySelector('#slice2-home'), null, {timeout:20000}).catch(()=>{});
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Rook"]')).toBeVisible();
  await expect(page.locator('[data-s2-action="pick-game"][data-s2-game="Hand and Foot"]')).toBeVisible();
});

test('saved Rook history still opens on Records after Rook is hidden', async ({page})=>{
  await page.goto('/?wipe=1', {waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    const match={
      id:'rook-old-1',
      gameId:'rook-old-1',
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
    localStorage.setItem('gn_history', JSON.stringify([match]));
    localStorage.setItem('gn_players_v2', JSON.stringify(['Megan','Matt','Cat','Mike']));
    localStorage.setItem('gn_all_players', JSON.stringify(['Megan','Matt','Cat','Mike']));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.evaluate(()=>typeof showHistory==='function'&&showHistory());
  await expect(page.locator('.s2-night, #history-list')).toContainText('Rook');
  await page.locator('[data-s2-action="night-scorecard"], button:has-text("Scorecard")').first().click();
  await expect(page.locator('#scorecard-modal, #modal-scorecard-block')).toContainText('Rook');
  await expect(page.locator('#modal-scorecard-body, #scorecard-modal')).toContainText('Megan');
});
