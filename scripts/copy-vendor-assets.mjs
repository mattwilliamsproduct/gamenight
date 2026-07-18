import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const rootDir = process.cwd();
const publicDir = join(rootDir, 'public');
const assetsDir = join(publicDir, 'assets');
const vendorDir = join(assetsDir, 'vendor');
const fontsDir = join(assetsDir, 'fonts');
await Promise.all([
  mkdir(vendorDir, { recursive: true }),
  mkdir(fontsDir, { recursive: true })
]);

const assets = [
  ['canvas-confetti/dist/confetti.browser.js', 'canvas-confetti.js'],
  ['chart.js/dist/chart.umd.js', 'chart.js'],
  ['html2canvas/dist/html2canvas.min.js', 'html2canvas.js']
];

await Promise.all(assets.map(async ([source, destination]) => {
  const destinationPath = join(vendorDir, destination);
  await copyFile(join(rootDir, 'node_modules', source), destinationPath);
  const contents = await readFile(destinationPath, 'utf8');
  await writeFile(destinationPath, contents.replace(/[ \t]+$/gm, ''));
}));

const fonts = [
  ['@fontsource/bree-serif/files/bree-serif-latin-400-normal.woff2', 'bree-serif-400.woff2'],
  ['@fontsource/nunito-sans/files/nunito-sans-latin-500-normal.woff2', 'nunito-sans-500.woff2'],
  ['@fontsource/nunito-sans/files/nunito-sans-latin-600-normal.woff2', 'nunito-sans-600.woff2'],
  ['@fontsource/nunito-sans/files/nunito-sans-latin-700-normal.woff2', 'nunito-sans-700.woff2'],
  ['@fontsource/nunito-sans/files/nunito-sans-latin-800-normal.woff2', 'nunito-sans-800.woff2'],
  ['@fontsource/nunito-sans/files/nunito-sans-latin-900-normal.woff2', 'nunito-sans-900.woff2'],
  ['@fontsource/pacifico/files/pacifico-latin-400-normal.woff2', 'pacifico-400.woff2'],
  ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2', 'plus-jakarta-sans-400.woff2'],
  ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2', 'plus-jakarta-sans-500.woff2'],
  ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2', 'plus-jakarta-sans-600.woff2'],
  ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2', 'plus-jakarta-sans-700.woff2'],
  ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2', 'plus-jakarta-sans-800.woff2']
];

await Promise.all(fonts.map(async ([source, destination]) => {
  await copyFile(join(rootDir, 'node_modules', source), join(fontsDir, destination));
}));

await writeFile(join(assetsDir, 'fonts.css'), `@font-face{font-family:'Bree Serif';font-style:normal;font-weight:400;font-display:swap;src:url('./fonts/bree-serif-400.woff2') format('woff2')}\n@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:500;font-display:swap;src:url('./fonts/nunito-sans-500.woff2') format('woff2')}\n@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:600;font-display:swap;src:url('./fonts/nunito-sans-600.woff2') format('woff2')}\n@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:700;font-display:swap;src:url('./fonts/nunito-sans-700.woff2') format('woff2')}\n@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:800;font-display:swap;src:url('./fonts/nunito-sans-800.woff2') format('woff2')}\n@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:900;font-display:swap;src:url('./fonts/nunito-sans-900.woff2') format('woff2')}\n@font-face{font-family:Pacifico;font-style:normal;font-weight:400;font-display:swap;src:url('./fonts/pacifico-400.woff2') format('woff2')}\n@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:400;font-display:swap;src:url('./fonts/plus-jakarta-sans-400.woff2') format('woff2')}\n@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:500;font-display:swap;src:url('./fonts/plus-jakarta-sans-500.woff2') format('woff2')}\n@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:600;font-display:swap;src:url('./fonts/plus-jakarta-sans-600.woff2') format('woff2')}\n@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:700;font-display:swap;src:url('./fonts/plus-jakarta-sans-700.woff2') format('woff2')}\n@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:800;font-display:swap;src:url('./fonts/plus-jakarta-sans-800.woff2') format('woff2')}\n`);

await writeFile(join(vendorDir, 'vendor-manifest.json'), JSON.stringify({
  canvasConfetti: '1.9.3',
  chartJs: '4.4.7',
  html2canvas: '1.4.1'
}, null, 2) + '\n');

const releaseId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || `local-${Date.now()}`;
const workerTemplate = await readFile(join(rootDir, 'src', 'service-worker.js'), 'utf8');
await writeFile(join(publicDir, 'sw.js'), workerTemplate.replace('__BACK_PORCH_RELEASE__', releaseId));
