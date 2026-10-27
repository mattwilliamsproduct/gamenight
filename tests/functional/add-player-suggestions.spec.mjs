import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

const PROFILES={
  Megan:{},Matt:{},Cat:{},Mike:{},Vikki:{},Duke:{},Brick:{},Linda:{},Michelle:{}
};

async function seedKnownNames(page, {seated=['Megan','Matt','Mike'], midgame=false}={}){
  await page.evaluate(({seated,profiles,midgame})=>{
    allPlayers=[...seated];
    players=[...seated];
    playerProfiles={...profiles};
    if(midgame && currentGame) currentGame.originalRoster=[...seated];
  },{seated,profiles:PROFILES,midgame});
}

test('mid-game Add Player typing m suggests only Michelle', async ({page})=>{
  await openScenario(page,{scenario:'wizard-6-mid'});
  await seedKnownNames(page,{midgame:true});
  await page.getByRole('button',{name:/Actions/}).click();
  await page.getByRole('button',{name:'Add Player Mid-Game',exact:true}).click();
  await expect(page.locator('#add-player-modal')).not.toHaveClass(/hidden/);
  await page.locator('#midgame-add-player-input').fill('m');
  const labels=page.locator('#midgame-player-suggestions .player-name-label');
  await expect(labels).toHaveCount(1);
  await expect(labels).toHaveText(['Michelle']);
  await expect(page.locator('#midgame-player-suggestions')).not.toContainText(',');
});

test('Home quick-add typing m suggests only Michelle', async ({page})=>{
  await openScenario(page,{scenario:'home-party',surface:'home'});
  await seedKnownNames(page);
  await page.locator('#quick-add-player').fill('m');
  const labels=page.locator('#home-player-suggestions .player-name-label');
  await expect(labels).toHaveCount(1);
  await expect(labels).toHaveText(['Michelle']);
  await expect(page.locator('#home-player-suggestions')).not.toContainText(',');
});

test('Home quick-add rejects a comma name without saving', async ({page})=>{
  await openScenario(page,{scenario:'home-party',surface:'home'});
  const before=await page.evaluate(()=>({allPlayers:[...allPlayers],players:[...players]}));
  await page.locator('#quick-add-player').fill('Megan,Matt');
  await page.locator('#home-screen').getByRole('button',{name:'Add',exact:true}).click();
  await expect(page.locator('#home-player-name-error')).toBeVisible();
  await expect(page.locator('#home-player-name-error')).toContainText('commas');
  const after=await page.evaluate(()=>({allPlayers:[...allPlayers],players:[...players]}));
  expect(after).toEqual(before);
  expect(after.allPlayers.some(name=>String(name).includes(','))).toBe(false);
});
