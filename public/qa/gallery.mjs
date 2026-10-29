import {QA_SCENARIOS,QA_SURFACES,QA_LINKS,cloneScenario} from './fixtures.mjs?v=j145-scorebook-20260928';

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

function paintQaIndex(){
  let panel=document.getElementById('gn-qa-index');
  if(!panel){
    panel=document.createElement('section');
    panel.id='gn-qa-index';
    panel.setAttribute('aria-label','QA deep links');
    document.body.appendChild(panel);
  }
  const style=document.getElementById('gn-qa-index-style')||document.createElement('style');
  style.id='gn-qa-index-style';
  style.textContent=`
    #gn-qa-index{position:fixed;inset:0;z-index:80;overflow:auto;padding:28px 22px 48px;background:#fffdf8;color:#14312e;font-family:"Nunito Sans",sans-serif}
    #gn-qa-index h1{font-family:"Fraunces",Georgia,serif;font-size:2rem;margin:0 0 8px}
    #gn-qa-index .gn-qa-index-lead{color:#5e584f;margin:0 0 22px;max-width:42rem}
    #gn-qa-index a{display:block;padding:12px 14px;margin:0 0 8px;border:1px solid #e4ddd2;border-radius:12px;background:#fff;color:#0a5c54;text-decoration:none;font-weight:800}
    #gn-qa-index a small{display:block;margin-top:4px;color:#5e584f;font-weight:600}
  `;
  document.head.appendChild(style);
  const origin=location.origin;
  panel.innerHTML=`<h1>QA deep links</h1><p class="gn-qa-index-lead">Fictional porch cast. Each link hydrates this tab only and does not save. Gallery chrome stays hidden.</p>${QA_LINKS.map((link)=>{
    const extra=link.query?`&${link.query}`:'';
    const href=`${origin}/?gnqa=1&scenario=${encodeURIComponent(link.id)}&surface=${encodeURIComponent(link.surface)}&gallery=0${extra}`;
    return `<a href="${href}"><span>${link.label}</span><small>${link.blurb}</small></a>`;
  }).join('')}`;
}

function appSurfaceFor(surface){
  if(surface==='index') return 'home';
  if(surface==='records-overview'||surface==='records-explore'||surface==='records-nights'||surface==='fame'||surface==='shame') return 'records';
  if(surface==='lifepreserver'||surface==='lifepreserver-result') return 'scorecard';
  if(surface==='add-player'||surface==='dealer'||surface==='dealer-roll'||surface==='lineup'||surface==='review'||surface==='standings'||surface==='edit-round'||surface==='retire'||surface==='rules'||surface==='hf-setup'||surface==='past-night') return 'scorecard';
  return surface;
}

function openQaLifePreserver(wantResult){
  const names=typeof eligibleLifePreserverNames==='function'?eligibleLifePreserverNames():[];
  const player=names[0]||null;
  if(player&&typeof authorizeHailMary==='function') authorizeHailMary(player);
  if(!wantResult||!player||typeof showLifePreserverResult!=='function') return;
  const slices=typeof getWheelSlices==='function'?getWheelSlices():[];
  const help=(slices||[]).find((slice)=>Number(slice.adjustment));
  const adj=Number(help?.adjustment);
  const used=Number.isFinite(adj)?adj:-5;
  const meta=document.getElementById('wheel-player-meta')?.textContent||'';
  const scoreMatch=meta.match(/Current total (-?\d+)/);
  const before=scoreMatch?Number(scoreMatch[1]):0;
  showLifePreserverResult({
    player,
    adj:used,
    total:before+used,
    beforeTotal:before,
    winLow:true
  });
}

function applyQaDeepLink(surface){
  document.getElementById('gn-qa-index')?.remove();
  if(surface==='index'){
    paintQaIndex();
    return;
  }
  const params=new URLSearchParams(location.search);
  if((params.get('games')||'').toLowerCase().includes('rook')&&window.BPGGames&&typeof BPGGames.revealHiddenGames==='function'){
    BPGGames.revealHiddenGames('rook');
    if(window.BPGSlice2&&typeof BPGSlice2.refresh==='function') BPGSlice2.refresh('home');
  }
  if(window.BPGSlice2&&typeof BPGSlice2.setRecordsPane==='function'){
    if(surface==='records-explore') BPGSlice2.setRecordsPane('explore');
    else if(surface==='records-nights') BPGSlice2.setRecordsPane('nights');
    else if(surface==='records'||surface==='records-overview'||surface==='fame'||surface==='shame'){
      BPGSlice2.setRecordsPane('overview');
    }
  }
  if(surface==='shame'){
    requestAnimationFrame(()=>{
      document.querySelector('#hall-of-fame-view .s2-shame-panel, .s2-shame-panel')?.scrollIntoView({block:'start',behavior:'instant'});
    });
  }
  if(surface==='lifepreserver'||surface==='lifepreserver-result'){
    openQaLifePreserver(surface==='lifepreserver-result');
  }
  if(surface==='add-player'&&typeof addPlayerMidGame==='function') addPlayerMidGame();
  if(surface==='dealer'&&typeof openDealerModal==='function') openDealerModal();
  if(surface==='dealer-roll'){
    if(typeof goHome==='function') goHome();
    if(typeof showDealerRoll==='function') showDealerRoll();
    document.getElementById('dealer-roll-modal')?.classList.remove('hidden','opacity-0');
  }
  if(surface==='lineup'){
    if(typeof goHome==='function') goHome();
    if(typeof showLineupIntro==='function') showLineupIntro('Five Crowns', 0);
  }
  if(surface==='review'){
    if(typeof openScoreEntryModal==='function') openScoreEntryModal();
    if(typeof doneScoreEntryModal==='function') doneScoreEntryModal();
  }
  if(surface==='standings'){
    document.documentElement.classList.add('s2-standings-only');
    if(typeof goActiveMatch==='function') goActiveMatch();
  }
  if(surface==='edit-round'){
    if(typeof goActiveMatch==='function') goActiveMatch();
    requestAnimationFrame(()=>{
      document.querySelector('#scorecard-body .score-cell-input, #scorecard-body input[id^="score-past-"]')?.click();
    });
  }
  if(surface==='retire'&&typeof openRetirePlayerModal==='function') openRetirePlayerModal();
  if(surface==='rules'&&typeof openRules==='function') openRules();
  if(surface==='hf-setup'){
    if(typeof goHome==='function') goHome();
    if(typeof openHandFootSetupModal==='function') openHandFootSetupModal();
  }
  if(surface==='past-night'){
    if(typeof goHome==='function') goHome();
    document.querySelector('[data-s2-action="night-open"], [data-s2-action="night-scorecard"]')?.click();
  }
  if((surface==='entry-scores'||surface==='blank-helper')&&window.BPGScorebook&&typeof BPGScorebook.scoreEntryBlankHelper==='function'){
    const note=document.getElementById('score-entry-unconfirmed');
    const game=document.getElementById('score-entry-game')?.textContent||'';
    if(note&&!/Wizard|818/i.test(game)) note.textContent=BPGScorebook.scoreEntryBlankHelper();
  }
}

export async function bootQaGallery(api){
  if(!api)throw new Error('QA API is unavailable.');
  injectGalleryStyles();
  const params=new URLSearchParams(location.search);
  let scenarioId=QA_SCENARIOS[params.get('scenario')]?params.get('scenario'):'home-party';
  let scenario=cloneScenario(scenarioId);
  let surface=params.get('surface')||scenario.defaultSurface;
  const hideGallery=params.get('gallery')==='0'||scenarioId.startsWith('qa-');
  if(scenarioId.startsWith('qa-')) window.__GN_DEMO_SKIP_PERSIST=true;
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
    if(scenarioId.startsWith('qa-')) window.__GN_DEMO_SKIP_PERSIST=true;
    api.hydrate(scenario.data);
    api.showSurface(appSurfaceFor(surface),scenario);
    applyQaDeepLink(surface);
    if(surface==='whammy'||surface==='nolie')await new Promise(resolve=>setTimeout(resolve,550));
    if(surface==='race')await new Promise(resolve=>setTimeout(resolve,800));
    if(surface==='lifepreserver'||surface==='lifepreserver-result')await new Promise(resolve=>setTimeout(resolve,400));
    if(surface==='lineup'||surface==='dealer-roll'||surface==='hf-setup'||surface==='add-player'||surface==='dealer'||surface==='retire'||surface==='rules'||surface==='settings'||surface==='past-night'||surface==='edit-round'){
      await new Promise(resolve=>setTimeout(resolve,350));
    }
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
