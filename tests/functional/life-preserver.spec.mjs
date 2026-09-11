import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test('porch 818 Life Preserver offers Cat +20, not a ticket to 1st', async ({page})=>{
  await openScenario(page,{scenario:'eight18-porch-lp'});

  await page.getByRole('button',{name:/Life Preserver available for Cat/}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-why-line')).toContainText('behind 1st');
  await expect(page.locator('#wheel-why-line')).toContainText('+20');

  const snapshot=await page.evaluate(()=>({
    player:lifePreserverOfferSnapshot?.player,
    maxSafe:lifePreserverOfferSnapshot?.maxSafeAdjustment,
    leaderGap:lifePreserverOfferSnapshot?.leaderGap,
    adjustments:(lifePreserverOfferSnapshot?.slices||[]).map(slice=>slice.adjustment)
  }));
  expect(snapshot.player).toBe('Cat');
  expect(snapshot.leaderGap).toBe(39);
  expect(snapshot.maxSafe).toBe(20);
  expect(snapshot.adjustments).toContain(20);
  expect(Math.max(...snapshot.adjustments)).toBe(20);

  const table=await page.evaluate(()=>{
    const players=getActivePlayers(currentGame);
    return Object.fromEntries(players.map(player=>{
      const offer=getLifePreserverOfferForPlayer(player,players);
      return [player,{
        eligible:!!offer.eligible,
        maxSafe:offer.maxSafeAdjustment||0,
        reason:offer.reason||null
      }];
    }));
  });
  expect(table.Duke.eligible).toBe(false);
  expect(table.Vikki.eligible).toBe(true);
  expect(table.Vikki.maxSafe).toBe(20);
  expect(table.Brick.maxSafe).toBe(20);
});
