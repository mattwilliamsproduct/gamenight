/* Preview-only Home chrome. Default tiles and logo stay on unless ?demo is allowed. */

export const DEMO_ART_VALUES = ['dusk'];
export const DEMO_LOGO_VALUES = ['dusk'];

export const DEFAULT_TILE_IMAGES = {
  five: '../theme/game-card-five-crowns-thumb.jpg',
  818: '../theme/game-card-818-thumb.jpg',
  wizard: '../theme/game-card-wizard-thumb.jpg',
  flip7: '../theme/game-card-flip7-thumb.jpg',
  heat: '../theme/game-card-beat-heat-thumb.jpg',
  rook: '../theme/game-card-rook-thumb.jpg'
};

export const DEFAULT_LOGO_IMAGE = './theme/back-porch-mark.jpg';

export const DUSK_TILE_SLUGS = {
  five: 'five-crowns',
  818: '818',
  wizard: 'wizard',
  flip7: 'flip-7',
  heat: 'beat-the-heat',
  rook: 'rook'
};

function previewHostPattern(){
  return /^.+-mattwilliamsproducts-projects\.vercel\.app$/;
}

export function demoChromeHostAllowed(hostname){
  const host = String(hostname || '');
  if (host === 'cardknight.vercel.app') return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  return previewHostPattern().test(host);
}

function token(value, allowed){
  const raw = String(value || '').trim().toLowerCase();
  return allowed.includes(raw) ? raw : '';
}

export function parseDemoChrome(search, hostname){
  const params = new URLSearchParams(search || '');
  const allowed = demoChromeHostAllowed(hostname) && params.has('demo');
  if (!allowed) return {art: '', logo: ''};
  return {
    art: token(params.get('art'), DEMO_ART_VALUES),
    logo: token(params.get('logo'), DEMO_LOGO_VALUES)
  };
}

export function applyDemoChrome(root, search, hostname){
  const doc = root && (root.documentElement || root);
  if (!doc || !doc.dataset) return {art: '', logo: ''};
  const chrome = parseDemoChrome(search, hostname);
  if (chrome.art) doc.dataset.bpArt = chrome.art;
  else delete doc.dataset.bpArt;
  if (chrome.logo) doc.dataset.bpLogo = chrome.logo;
  else delete doc.dataset.bpLogo;
  return chrome;
}

export function keepDemoSearchForChrome(search){
  const params = new URLSearchParams(search || '');
  return params.has('art') || params.has('logo');
}
