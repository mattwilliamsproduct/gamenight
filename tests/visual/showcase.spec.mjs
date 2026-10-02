import {expect,test} from '@playwright/test';

// The first-click path a stranger takes from a resume link. See docs/porch-resume-showcase-bar.md.
const SIZES={
  'phone portrait':{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},
  'phone landscape':{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true},
  'iPad landscape':{viewport:{width:1194,height:834},deviceScaleFactor:1,isMobile:true,hasTouch:true},
  laptop:{viewport:{width:1440,height:900},deviceScaleFactor:1}
};

function watch(page){
  const problems=[];
  page.on('pageerror',error=>problems.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')problems.push(`console: ${message.text()}`);});
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))problems.push(`request: ${request.url()}`);});
  return problems;
}

const storedKeys=page=>page.evaluate(()=>Object.keys(localStorage).sort());
const horizontalOverflow=page=>page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth+1);

async function inViewport(locator){
  const box=await locator.boundingBox();
  const viewport=locator.page().viewportSize();
  expect(box,'element is laid out').not.toBeNull();
  expect(box.y,'top is on screen').toBeGreaterThanOrEqual(0);
  expect(box.y+box.height,'bottom is above the fold').toBeLessThanOrEqual(viewport.height);
  expect(box.x+box.width,'right edge is on screen').toBeLessThanOrEqual(viewport.width);
}

test.describe('first click',()=>{
  test.beforeEach(({},testInfo)=>{
    test.skip(testInfo.project.name!=='ipad-landscape-webkit','Runs once, with its own phone, iPad, and laptop contexts');
  });

  for(const [label,size] of Object.entries(SIZES)){
    test(`${label}: welcome, sample night, and exit leave storage untouched`,async({browser})=>{
      const context=await browser.newContext(size);
      const page=await context.newPage();
      const problems=watch(page);

      await page.goto('/',{waitUntil:'networkidle'});
      const welcome=page.locator('#first-visit-welcome');
      await expect(welcome).toBeVisible();
      const tryIt=welcome.getByRole('button',{name:'Try a sample night'});
      await inViewport(tryIt);
      await inViewport(welcome.getByRole('button',{name:'Start your own table'}));
      expect(await horizontalOverflow(page)).toBe(false);

      await tryIt.click();
      await expect(page.locator('body')).toHaveClass(/sample-night/);
      await expect(page.locator('#game-screen')).toBeVisible();
      await expect(page.locator('#scorecard-capture tbody tr')).toHaveCount(6);
      await expect(page.locator('.bp-sample-chip')).toBeVisible();
      await inViewport(page.locator('#scorecard-capture thead th.scorecard-col-total'));
      await expect(page.locator('#scorecard-capture tbody tr').first()).toContainText('130');
      expect(await horizontalOverflow(page)).toBe(false);

      await page.locator('.bp-sample-exit').click();
      await expect(welcome).toBeVisible();
      await expect(page.locator('body')).not.toHaveClass(/sample-night/);
      expect(new URL(page.url()).search).toBe('');
      expect(await storedKeys(page)).toEqual([]);
      expect(problems).toEqual([]);
      await context.close();
    });
  }

  test('nothing the sample does reaches storage, prefs, or the porch cloud',async({page})=>{
    const problems=watch(page);
    await page.goto('/?sample=1',{waitUntil:'networkidle'});
    await expect(page.locator('body')).toHaveClass(/sample-night/);
    const result=await page.evaluate(()=>{
      saveData({fullPersist:true,syncCold:true});
      flushPendingSave();
      savePref('gn_pref_lineupintro',false);
      adjustUI(1);
      return {cloud:canPorchCloud(),keys:Object.keys(localStorage)};
    });
    expect(result).toEqual({cloud:false,keys:[]});
    expect(problems).toEqual([]);
  });

  test('a device with games never opens the sample, even from the deep link',async({page})=>{
    const book=[{id:1,game:'Wizard',date:'9/1/2026',totals:{Matt:120,Megan:90},winners:['Matt'],rounds:[{scores:{Matt:120,Megan:90}}],originalRoster:['Matt','Megan']}];
    await page.addInitScript(value=>{
      if(!sessionStorage.getItem('seeded')){
        localStorage.setItem('gn_history',value);
        sessionStorage.setItem('seeded','1');
      }
    },JSON.stringify(book));
    await page.goto('/?sample=1',{waitUntil:'networkidle'});
    await expect(page.locator('#toast-container')).toContainText('already has games');
    await expect(page.locator('body')).not.toHaveClass(/sample-night/);
    await expect(page.locator('#first-visit-welcome')).toBeHidden();
    expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('gn_history')))).toEqual(book);
  });

  test('Start your own table goes straight to the add-player box',async({page})=>{
    await page.goto('/',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Start your own table'}).click();
    await expect(page.locator('#first-visit-welcome')).toBeHidden();
    await expect(page.locator('#quick-add-player')).toBeFocused();
    await expect(page.locator('#roster-count')).toContainText('0 playing');
  });
});
