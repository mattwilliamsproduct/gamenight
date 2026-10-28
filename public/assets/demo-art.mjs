/* Preview-only Home chrome. Default tiles and logo stay on unless ?demo is allowed. */

export const DEMO_ART_VALUES = ['dusk'];
export const DEMO_LOGO_VALUES = ['dusk', '1', '2', '3', 'sheet'];
export const DEMO_PICKER_VALUES = ['a', 'b', 'c', 'd'];
export const DEMO_FACE_VALUES = ['faithful', 'homage'];
export const DEMO_TAP_VALUES = ['start', 'confirm'];
export const DEMO_SHEET_VALUES = ['sheet'];

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
  flip7: 'flip7',
  heat: 'beat-heat',
  canasta: 'canasta'
};

export const DUSK_SHEET_SLUGS = [
  'five-crowns',
  '818',
  'wizard',
  'flip7',
  'beat-heat',
  'canasta'
];

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

function emptyChrome(){
  return {art: '', logo: '', picker: '', wiz: '', eight18: '', five: '', tap: '', faces: ''};
}

export function parseDemoChrome(search, hostname){
  const params = new URLSearchParams(search || '');
  const allowed = demoChromeHostAllowed(hostname) && params.has('demo');
  if (!allowed) return emptyChrome();
  const picker = token(params.get('picker'), DEMO_PICKER_VALUES);
  const isD = picker === 'd';
  return {
    art: token(params.get('art'), DEMO_ART_VALUES),
    logo: token(params.get('logo'), DEMO_LOGO_VALUES),
    picker: picker ? picker.toUpperCase() : '',
    wiz: token(params.get('wiz'), DEMO_FACE_VALUES) || (isD ? 'homage' : ''),
    eight18: token(params.get('818'), DEMO_FACE_VALUES) || (isD ? 'homage' : ''),
    five: token(params.get('five'), DEMO_FACE_VALUES) || (isD ? 'faithful' : ''),
    tap: token(params.get('tap'), DEMO_TAP_VALUES) || (isD ? 'start' : ''),
    faces: token(params.get('faces'), DEMO_SHEET_VALUES)
  };
}

export function applyDemoChrome(root, search, hostname){
  const doc = root && (root.documentElement || root);
  if (!doc || !doc.dataset) return emptyChrome();
  const chrome = parseDemoChrome(search, hostname);
  if (chrome.art) doc.dataset.bpArt = chrome.art;
  else delete doc.dataset.bpArt;
  if (chrome.logo) doc.dataset.bpLogo = chrome.logo;
  else delete doc.dataset.bpLogo;
  if (chrome.picker) doc.dataset.bpPicker = chrome.picker;
  else delete doc.dataset.bpPicker;
  if (chrome.wiz) doc.dataset.bpWiz = chrome.wiz;
  else delete doc.dataset.bpWiz;
  if (chrome.eight18) doc.dataset.bp818 = chrome.eight18;
  else delete doc.dataset.bp818;
  if (chrome.five) doc.dataset.bpFive = chrome.five;
  else delete doc.dataset.bpFive;
  if (chrome.tap) doc.dataset.bpTap = chrome.tap;
  else delete doc.dataset.bpTap;
  if (chrome.faces) doc.dataset.bpFaces = chrome.faces;
  else delete doc.dataset.bpFaces;
  delete doc.dataset.bpHome;
  return chrome;
}

export function keepDemoSearchForChrome(search){
  const params = new URLSearchParams(search || '');
  return params.has('art') || params.has('logo') || params.has('picker') ||
    params.has('wiz') || params.has('818') || params.has('five') ||
    params.has('tap') || params.has('faces');
}
