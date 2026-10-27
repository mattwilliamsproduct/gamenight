/**
 * Single source of truth for the preview-only /review gallery.
 * View ids are the RC TEMP ?demo&view=<id> list so tiles, Open live,
 * and Playwright captures cannot drift.
 */

import {DEMO_VIEW_IDS} from '../public/assets/demo-seed.mjs';

export const REVIEW_SIZES = [
  {id: 'phone', label: 'Phone', width: 390, height: 844},
  {id: 'tablet', label: 'Tablet', width: 768, height: 1024},
  {id: 'laptop', label: 'Laptop', width: 1440, height: 900}
];

const gnqa = (scenario, surface, slice2view) => ({scenario, surface, slice2view});

const SCREEN_META = {
  home: {label: 'Home with Resume', group: 'home', fallback: gnqa('five-crowns-comeback', 'home')},
  'active-match': {label: 'Active match', group: 'scorecard', fallback: gnqa('five-crowns-comeback', 'scorecard')},
  'scorecard-fivecrowns': {label: 'Five Crowns scorecard', group: 'scorecard', fallback: gnqa('five-crowns-comeback', 'scorecard')},
  'scorecard-wizard': {label: 'Wizard scorecard', group: 'scorecard', fallback: gnqa('wizard-scoring-8', 'scorecard')},
  'scorecard-818': {label: '818 scorecard', group: 'scorecard', fallback: gnqa('eight18-porch-lp', 'scorecard')},
  'scorecard-flip7': {label: 'Flip 7 Vengeance scorecard', group: 'scorecard', fallback: gnqa('flip7-turbo-ladder', 'scorecard')},
  'scorecard-beattheheat': {label: 'Beat the Heat scorecard', group: 'scorecard', fallback: gnqa('beat-the-heat-close', 'scorecard')},
  'scorecard-rook': {label: 'Rook scorecard', group: 'scorecard', fallback: gnqa('rook-midgame', 'scorecard')},
  'entry-fivecrowns': {label: 'Five Crowns score entry', group: 'entry', fallback: gnqa('five-crowns-4', 'entry-scores')},
  'entry-wizard': {label: 'Wizard score entry', group: 'entry', fallback: gnqa('wizard-scoring-8', 'entry-scores')},
  'entry-818': {label: '818 score entry', group: 'entry', fallback: gnqa('eight18-porch-lp', 'entry-scores')},
  'entry-flip7': {label: 'Flip 7 Vengeance score entry', group: 'entry', fallback: gnqa('flip7-turbo-ladder', 'entry-scores')},
  'entry-beattheheat': {label: 'Beat the Heat score entry', group: 'entry', fallback: gnqa('beat-the-heat-close', 'entry-scores')},
  'entry-rook': {label: 'Rook score entry', group: 'entry', fallback: gnqa('rook-midgame', 'scorecard', 'rook-results')},
  'keypad-8p': {label: '8-player keypad', group: 'entry', fallback: gnqa('five-crowns-comeback', 'entry-scores')},
  lifepreserver: {label: 'Life Preserver (Hail Mary) before', group: 'lifepreserver', fallback: gnqa('eight18-porch-lp', 'scorecard', 'wheel')},
  'lifepreserver-after': {label: 'Life Preserver (Hail Mary) after', group: 'lifepreserver', fallback: gnqa('eight18-porch-lp-after', 'scorecard', 'wheel-after')},
  'lifepreserver-low': {label: 'Life Preserver low-score offer', group: 'lifepreserver', fallback: gnqa('eight18-porch-lp', 'scorecard', 'wheel')},
  records: {label: 'Records', group: 'records', fallback: gnqa('home-party', 'home', 'records')},
  'records-overview': {label: 'Records Overview', group: 'records', fallback: gnqa('home-party', 'home', 'records')},
  'records-explore': {label: 'Records Explore', group: 'records', fallback: gnqa('home-party', 'home', 'records-shame')},
  'records-nights': {label: 'Records Past nights', group: 'records', fallback: gnqa('home-party', 'home', 'records')},
  'records-shame': {label: 'Records Shame', group: 'records', fallback: gnqa('home-party', 'home', 'records-shame')},
  'rook-contract': {label: 'Rook contract editor', group: 'rook', fallback: gnqa('rook-bid-setup', 'scorecard', 'rook-contract')},
  'rook-call': {label: 'Rook trump / partner', group: 'rook', fallback: gnqa('rook-calling', 'scorecard', 'rook-call')},
  settings: {label: 'Settings', group: 'settings', fallback: gnqa('wizard-10', 'settings')},
  'settings-backup': {label: 'Settings backup / restore', group: 'settings', fallback: gnqa('home-party', 'settings', 'settings-backup')},
  history: {label: 'History', group: 'records', fallback: gnqa('home-party', 'home', 'records')},
  profiles: {label: 'Profiles', group: 'records', fallback: gnqa('profile-yearbook', 'profiles')},
  'empty-home': {label: 'Empty home', group: 'empty', fallback: gnqa('empty-table', 'home')},
  'empty-records': {label: 'Empty records', group: 'empty', fallback: gnqa('empty-table', 'home', 'records')},
  'error-entry': {label: 'Score entry error', group: 'empty', fallback: gnqa('wizard-scoring-8', 'entry-scores', 'error-entry')}
};

export const REVIEW_SCREENS = DEMO_VIEW_IDS.map((id) => {
  const meta = SCREEN_META[id];
  if (!meta) throw new Error(`Review catalog is missing metadata for demo view ${id}`);
  return {id, ...meta};
});

export const REQUIRED_REVIEW_IDS = [...DEMO_VIEW_IDS];

export function detectDemoDeepLinks(indexHtml) {
  if (typeof indexHtml !== 'string' || !indexHtml) return false;
  return indexHtml.includes("params.has('demo')") || indexHtml.includes('demo-seed.mjs') || /\bDEMO_VIEW_IDS\b/.test(indexHtml);
}

export function screenLivePath(screen, {demoReady = false, size} = {}) {
  if (!screen?.id) throw new Error('screenLivePath needs a catalog screen');
  if (demoReady) {
    const hint = size ? `&size=${encodeURIComponent(size)}` : '';
    return `/?demo&view=${encodeURIComponent(screen.id)}${hint}`;
  }
  const query = new URLSearchParams({
    gnqa: '1',
    gallery: '0',
    scenario: screen.fallback.scenario,
    surface: screen.fallback.surface
  });
  if (screen.fallback.slice2view) query.set('slice2view', screen.fallback.slice2view);
  return `/?${query.toString()}`;
}

export function shotFileName(screenId, sizeId) {
  return `${screenId}--${sizeId}.png`;
}

export function isProductionReviewEnv({
  vercelEnv = process.env.VERCEL_ENV,
  vercelUrl = process.env.VERCEL_URL || '',
  vercelAlias = process.env.VERCEL_PROJECT_PRODUCTION_URL || ''
} = {}) {
  const host = String(vercelUrl || vercelAlias || '').replace(/^https?:\/\//, '').split('/')[0];
  if (vercelEnv === 'production') return true;
  if (host === 'cardknight.vercel.app') return true;
  if (host.endsWith('.cardknight.vercel.app')) return true;
  return false;
}

export function buildReviewManifest({
  commit,
  generatedAt,
  demoReady,
  screens = REVIEW_SCREENS,
  sizes = REVIEW_SIZES
} = {}) {
  return {
    title: 'Back Porch review gallery',
    generatedAt: generatedAt || new Date().toISOString(),
    commit: commit || 'local',
    demoReady: Boolean(demoReady),
    tileCount: screens.length * sizes.length,
    sizes,
    screens: screens.map((screen) => ({
      id: screen.id,
      label: screen.label,
      group: screen.group,
      livePath: screenLivePath(screen, {demoReady}),
      fallbackPath: screenLivePath(screen, {demoReady: false}),
      fallback: screen.fallback
    }))
  };
}
