import {QA_SCENARIOS,QA_SURFACES,cloneScenario} from './fixtures.mjs?v=turbo-ladder-20260820';

const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

function injectGalleryStyles(){
  const style=document.createElement('style');
  style.textContent=`
    #gn-qa-gallery{position:fixed;left:14px;bottom:14px;z-index:9999;width:min(340px,calc(100vw - 28px));font-family:"Plus Jakarta Sans",sans-serif;color:#073f3b;background:rgba(255,252,246,.98);border:2px solid #08766c;border-radius:8px;box-shadow:0 18px 45px rgba(4,45,42,.28);padding:14px}
    #gn-qa-gallery[hidden]{display:none}
    .gn-qa-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
    .gn-qa-title{font-weight:900;font-size:15px}.gn-qa-kicker{font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#ef765d}
    .gn-qa-close{width:32px;height:32px;border:1px solid #d9d2c7;background:white;border-radius:6px;font-size:18px;line-height:1}
    .gn-qa-label{display:block;margin:9px 0 5px;font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#6d6962}
    .gn-qa-select{width:100%;height:42px;border:1px solid #c9ded9;border-radius:6px;background:#fff;padding:0 10px;font-weight:800;color:#073f3b}
    .gn-qa-copy{min-height:34px;margin:8px 0 10px;font-size:11px;line-height:1.45;color:#6d6962}
    .gn-qa-surfaces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
    .gn-qa-surface{min-height:40px;border:1px solid #c9ded9;border-radius:6px;background:#effaf7;padding:6px;font-size:10px;font-weight:800;color:#075e57}
    .gn-qa-surface[aria-pressed="true"]{background:#08766c;color:white;border-color:#08766c}
    .gn-qa-badge{display:inline-flex;align-items:center;gap:5px;margin-top:10px;font-size:9px;font-weight:800;color:#6d6962}
    body.gn-qa-gallery-hidden #gn-qa-gallery{display:none!important}
  `;
  document.head.appendChild(style);
}

function makeGallery(initialScenario,initialSurface){
  const panel=document.createElement('aside');
  panel.id='gn-qa-gallery';
  panel.setAttribute('aria-label','Back Porch QA scenarios');
  panel.innerHTML=`
    <div class="gn-qa-head"><div><div class="gn-qa-kicker">Development only</div><div class="gn-qa-title">Test-State Gallery</div></div><button class="gn-qa-close" type="button" title="Hide gallery" aria-label="Hide gallery">×</button></div>
    <label class="gn-qa-label" for="gn-qa-scenario">Scenario</label>
    <select class="gn-qa-select" id="gn-qa-scenario">${Object.entries(QA_SCENARIOS).map(([id,item])=>`<option value="${id}">${item.label}</option>`).join('')}</select>
    <div class="gn-qa-copy"></div>
    <div class="gn-qa-label">Open surface</div>
    <div class="gn-qa-surfaces">${QA_SURFACES.map(surface=>`<button type="button" class="gn-qa-surface" data-surface="${surface.id}">${surface.label}</button>`).join('')}</div>
    <div class="gn-qa-badge"><span>●</span><span>Fixtures stay in this local tab and never save.</span></div>`;
  panel.querySelector('#gn-qa-scenario').value=initialScenario;
  panel.querySelector('.gn-qa-close').addEventListener('click',()=>document.body.classList.add('gn-qa-gallery-hidden'));
  document.body.appendChild(panel);
  return panel;
}

async function waitForStableImages(){
  const pending=[...document.images].filter(image=>!image.complete).map(image=>new Promise(resolve=>{
    image.addEventListener('load',resolve,{once:true});
    image.addEventListener('error',resolve,{once:true});
  }));
  await Promise.all(pending);
  if(document.fonts?.ready)await document.fonts.ready;
  await nextFrame();
}

function assertRecordChasePreview(scenarioId,scenario){
  if(scenarioId!=='record-chase-preview')return;
  const {players=[],playerProfiles={},history=[]}=scenario.data||{};
  const missingAvatars=players.filter(player=>!playerProfiles[player]?.avatar);
  const wizardHistoryPlayers=new Set(history
    .filter(match=>match?.game==='Wizard')
    .flatMap(match=>Object.keys(match?.totals||{})));
  const missingHistory=players.filter(player=>player!=='Brick'&&!wizardHistoryPlayers.has(player));
  const unexpectedBrickHistory=wizardHistoryPlayers.has('Brick');
  if(missingAvatars.length||missingHistory.length||unexpectedBrickHistory){
    throw new Error(`Record Chase fixture mismatch: avatars=${missingAvatars.join(',')||'ok'} history=${missingHistory.join(',')||'ok'} brick=${unexpectedBrickHistory?'unexpected':'fresh'}`);
  }
}

export async function bootQaGallery(api){
  if(!api)throw new Error('QA API is unavailable.');
  injectGalleryStyles();
  const params=new URLSearchParams(location.search);
  let scenarioId=QA_SCENARIOS[params.get('scenario')]?params.get('scenario'):'home-party';
  let scenario=cloneScenario(scenarioId);
  let surface=params.get('surface')||scenario.defaultSurface;
  const hideGallery=params.get('gallery')==='0';
  const panel=makeGallery(scenarioId,surface);
  if(hideGallery)panel.hidden=true;

  const description=panel.querySelector('.gn-qa-copy');
  const select=panel.querySelector('#gn-qa-scenario');
  const surfaceButtons=[...panel.querySelectorAll('.gn-qa-surface')];

  const render=async()=>{
    document.body.dataset.gnQaReady='loading';
    assertRecordChasePreview(scenarioId,scenario);
    description.textContent=scenario.description;
    surfaceButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.surface===surface)));
    api.hydrate(scenario.data);
    api.showSurface(surface,scenario);
    if(surface==='whammy'||surface==='nolie')await new Promise(resolve=>setTimeout(resolve,550));
    if(surface==='race')await new Promise(resolve=>setTimeout(resolve,800));
    await waitForStableImages();
    api.setReady();
  };

  select.addEventListener('change',async()=>{
    scenarioId=select.value;
    scenario=cloneScenario(scenarioId);
    surface=scenario.defaultSurface;
    await render();
  });
  surfaceButtons.forEach(button=>button.addEventListener('click',async()=>{
    surface=button.dataset.surface;
    await render();
  }));

  await render();
}
