import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
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

// Score Sign is the heavy Nunito Sans 800 face, limited to dash code points,
// so minus signs in score cells do not fall back to a thinner font.
const fontFaces = [
  { family: "'Bree Serif'", file: 'bree-serif-400.woff2', weight: 400 },
  { family: "'Londrina Solid'", file: 'londrina-solid-400.woff2', weight: 400 },
  { family: "'Score Sign'", file: 'nunito-sans-800.woff2', weight: 400, unicodeRange: 'U+002D,U+2012,U+2013,U+2212' },
  { family: "'Nunito Sans'", file: 'nunito-sans-500.woff2', weight: 500 },
  { family: "'Nunito Sans'", file: 'nunito-sans-600.woff2', weight: 600 },
  { family: "'Nunito Sans'", file: 'nunito-sans-700.woff2', weight: 700 },
  { family: "'Nunito Sans'", file: 'nunito-sans-800.woff2', weight: 800 },
  { family: "'Nunito Sans'", file: 'nunito-sans-900.woff2', weight: 900 },
  { family: 'Pacifico', file: 'pacifico-400.woff2', weight: 400 },
  { family: "'Plus Jakarta Sans'", file: 'plus-jakarta-sans-400.woff2', weight: 400 },
  { family: "'Plus Jakarta Sans'", file: 'plus-jakarta-sans-500.woff2', weight: 500 },
  { family: "'Plus Jakarta Sans'", file: 'plus-jakarta-sans-600.woff2', weight: 600 },
  { family: "'Plus Jakarta Sans'", file: 'plus-jakarta-sans-700.woff2', weight: 700 },
  { family: "'Plus Jakarta Sans'", file: 'plus-jakarta-sans-800.woff2', weight: 800 }
];

const fontsCss = fontFaces.map(face => {
  const unicode = face.unicodeRange ? `;unicode-range:${face.unicodeRange}` : '';
  return `@font-face{font-family:${face.family};font-style:normal;font-weight:${face.weight};font-display:swap;src:url('./fonts/${face.file}') format('woff2')${unicode}}`;
}).join('\n') + '\n';

if(!fontsCss.includes("font-family:'Score Sign'")){
  throw new Error('fonts.css is missing the Score Sign face.');
}

const scoreSignFile = fontFaces.find(face => face.family === "'Score Sign'")?.file;
if(!scoreSignFile || !fonts.some(([, destination]) => destination === scoreSignFile)){
  throw new Error('Score Sign must reuse a font file copied by the vendor font list.');
}
await access(join(fontsDir, scoreSignFile));

await writeFile(join(assetsDir, 'fonts.css'), fontsCss);

await writeFile(join(vendorDir, 'vendor-manifest.json'), JSON.stringify({
  canvasConfetti: '1.9.3',
  chartJs: '4.4.7',
  html2canvas: '1.4.1'
}, null, 2) + '\n');

const releaseId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || `local-${Date.now()}`;
const workerTemplate = await readFile(join(rootDir, 'src', 'service-worker.js'), 'utf8');
await writeFile(join(publicDir, 'sw.js'), workerTemplate.replace('__BACK_PORCH_RELEASE__', releaseId));
