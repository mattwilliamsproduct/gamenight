/**
 * Single source of truth for the preview-only /review gallery.
 * View ids match the RC ?demo&view=<id> deep links so tiles and Open live
 * cannot drift. Until that seed lands, each screen also has a rule-valid
 * ?gnqa=1 fallback.
 */

export const REVIEW_SIZES = [
  {id: 'phone', label: 'Phone', width: 390, height: 844},
  {id: 'tablet', label: 'Tablet', width: 768, height: 1024},
  {id: 'tv', label: 'TV', width: 1440, height: 900}
];

const gnqa = (scenario, surface, slice2view) => ({scenario, surface, slice2view});

export const REVIEW_SCREENS = [
  {id: 'home', label: 'Home with Resume', group: 'home', fallback: gnqa('five-crowns-comeback', 'home')},
  {id: 'scorecard-five-crowns', label: 'Five Crowns scorecard', group: 'scorecard', fallback: gnqa('five-crowns-comeback', 'scorecard')},
  {id: 'entry-five-crowns', label: 'Five Crowns score entry', group: 'entry', fallback: gnqa('five-crowns-4', 'entry-scores')},
  {id: 'scorecard-wizard', label: 'Wizard scorecard', group: 'scorecard', fallback: gnqa('wizard-scoring-8', 'scorecard')},
  {id: 'entry-wizard', label: 'Wizard score entry', group: 'entry', fallback: gnqa('wizard-scoring-8', 'entry-scores')},
  {id: 'scorecard-818', label: '818 scorecard', group: 'scorecard', fallback: gnqa('eight18-porch-lp', 'scorecard')},
  {id: 'entry-818', label: '818 score entry', group: 'entry', fallback: gnqa('eight18-porch-lp', 'entry-scores')},
  {id: 'scorecard-flip-7', label: 'Flip 7 Vengeance scorecard', group: 'scorecard', fallback: gnqa('flip7-turbo-ladder', 'scorecard')},
  {id: 'entry-flip-7', label: 'Flip 7 Vengeance score entry', group: 'entry', fallback: gnqa('flip7-turbo-ladder', 'entry-scores')},
  {id: 'scorecard-beat-the-heat', label: 'Beat the Heat scorecard', group: 'scorecard', fallback: gnqa('beat-the-heat-close', 'scorecard')},
  {id: 'entry-beat-the-heat', label: 'Beat the Heat score entry', group: 'entry', fallback: gnqa('beat-the-heat-close', 'entry-scores')},
  {id: 'scorecard-rook', label: 'Rook scorecard', group: 'scorecard', fallback: gnqa('rook-midgame', 'scorecard')},
  {id: 'entry-rook', label: 'Rook score entry', group: 'entry', fallback: gnqa('rook-midgame', 'scorecard', 'rook-results')},
  {id: 'keypad-8p', label: '8-player keypad', group: 'entry', fallback: gnqa('five-crowns-comeback', 'entry-scores')},
  {id: 'lifepreserver', label: 'Life Preserver (Hail Mary) before', group: 'lifepreserver', fallback: gnqa('eight18-porch-lp', 'scorecard', 'wheel')},
  {id: 'lifepreserver-after', label: 'Life Preserver (Hail Mary) after', group: 'lifepreserver', fallback: gnqa('eight18-porch-lp-after', 'scorecard', 'wheel-after')},
  {id: 'records', label: 'Records Fame', group: 'records', fallback: gnqa('home-party', 'home', 'records')},
  {id: 'records-shame', label: 'Records Shame', group: 'records', fallback: gnqa('home-party', 'home', 'records-shame')},
  {id: 'rook-contract', label: 'Rook contract editor', group: 'rook', fallback: gnqa('rook-bid-setup', 'scorecard', 'rook-contract')},
  {id: 'rook-call', label: 'Rook trump / partner', group: 'rook', fallback: gnqa('rook-calling', 'scorecard', 'rook-call')},
  {id: 'settings', label: 'Settings', group: 'settings', fallback: gnqa('wizard-10', 'settings')},
  {id: 'settings-backup', label: 'Settings backup / restore', group: 'settings', fallback: gnqa('home-party', 'settings', 'settings-backup')},
  {id: 'history', label: 'History', group: 'records', fallback: gnqa('home-party', 'home', 'records')},
  {id: 'profiles', label: 'Profiles', group: 'records', fallback: gnqa('profile-yearbook', 'profiles')},
  {id: 'empty-home', label: 'Empty home', group: 'empty', fallback: gnqa('empty-table', 'home')},
  {id: 'empty-records', label: 'Empty records', group: 'empty', fallback: gnqa('empty-table', 'home', 'records')},
  {id: 'error-entry', label: 'Score entry error', group: 'empty', fallback: gnqa('wizard-scoring-8', 'entry-scores', 'error-entry')}
];

export const REQUIRED_REVIEW_IDS = REVIEW_SCREENS.map((screen) => screen.id);

export function detectDemoDeepLinks(indexHtml) {
  if (typeof indexHtml !== 'string' || !indexHtml) return false;
  const hasDemoFlag = /URLSearchParams[\s\S]{0,400}(?:\.has\(\s*['"]demo['"]\s*\)|get\(\s*['"]demo['"]\s*\))/.test(indexHtml)
    || /searchParams\.has\(\s*['"]demo['"]\s*\)/.test(indexHtml)
    || /params\.has\(\s*['"]demo['"]\s*\)/.test(indexHtml)
    || /\bGN_DEMO\b/.test(indexHtml)
    || /[?&]demo\b/.test(indexHtml) && /get\(\s*['"]view['"]\s*\)/.test(indexHtml);
  const hasViewRouter = /get\(\s*['"]view['"]\s*\)/.test(indexHtml);
  return Boolean(hasDemoFlag && hasViewRouter);
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
