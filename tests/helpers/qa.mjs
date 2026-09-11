export async function openScenario(page, {scenario, surface='scorecard'}={}){
  await page.goto(`/?gnqa=1&gallery=0&scenario=${encodeURIComponent(scenario)}&surface=${encodeURIComponent(surface)}`, {waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.gnQaReady==='true');
}

export async function nextPaint(page, frames=3){
  await page.evaluate(count=>new Promise(resolve=>{
    const tick=remaining=>remaining<=0?resolve():requestAnimationFrame(()=>tick(remaining-1));
    tick(count);
  }), frames);
}
