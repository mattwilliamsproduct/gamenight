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

test('mid-game Add player typing m suggests only Michelle', async ({page})=>{
  await openScenario(page,{scenario:'wizard-6-mid'});
  await seedKnownNames(page,{midgame:true});
  await page.getByRole('button',{name:/Actions/}).click();
  await page.getByRole('button',{name:'Add player mid-game',exact:true}).click();
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
  await page.locator('#home-screen form.s2-add').getByRole('button',{name:'Add player',exact:true}).click();
  await expect(page.locator('#home-player-name-error')).toBeVisible();
  await expect(page.locator('#home-player-name-error')).toContainText(/commas/i);
  const after=await page.evaluate(()=>({allPlayers:[...allPlayers],players:[...players]}));
  expect(after).toEqual(before);
  expect(after.allPlayers.some(name=>String(name).includes(','))).toBe(false);
});

test('mid-game picker lists the bench before typing and confirms the chosen late join', async ({page})=>{
  await openScenario(page,{scenario:'wizard-6-mid'});
  const bench=['Iris','Nora','Owen','Ruby'];
  const start=await page.evaluate(bench=>{
    players=[...currentGame.originalRoster];
    allPlayers=[...players,...bench];
    playerProfiles={};
    renderRoster();
    const scores=players.map(name=>currentGame.totals[name]);
    return Math.ceil(scores.reduce((sum,score)=>sum+score,0)/scores.length);
  },bench);
  await expect(page.locator('#bench-list .player-name-label')).toHaveText(bench);
  await page.getByRole('button',{name:/Actions/}).click();
  await page.getByRole('button',{name:'Add player mid-game',exact:true}).click();
  const picker=page.locator('#midgame-player-suggestions');
  await expect(picker.locator('.player-name-label')).toHaveText(bench);
  await picker.getByRole('button',{name:'Nora',exact:true}).click();
  await expect(page.locator('#midgame-add-confirm-copy')).toContainText(`Nora starts at ${start}`);
  await page.locator('#midgame-add-confirm').getByRole('button',{name:'Add player'}).click();
  await expect(page.locator('#add-player-modal')).toHaveClass(/hidden/);
  expect(await page.evaluate(()=>({
    total:currentGame.totals.Nora,
    missed:BPGScorebook.missedRoundText(currentGame,'Nora',1)
  }))).toEqual({total:start,missed:'Did not play'});
});
