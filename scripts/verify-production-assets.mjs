import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const rootDir = process.cwd();
const index = await readFile(join(rootDir, 'public', 'index.html'), 'utf8');
const prohibitedSources = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com'
];

for(const source of prohibitedSources){
  if(index.includes(source)) throw new Error(`External production dependency found: ${source}`);
}

const requiredAssets = [
  'public/assets/app-utilities.css',
  'public/assets/fonts.css',
  'public/assets/fonts/londrina-solid-400.woff2',
  'public/assets/vendor/canvas-confetti.js',
  'public/assets/vendor/chart.js',
  'public/assets/vendor/html2canvas.js',
  'public/assets/life-preserver-logic.js',
  'public/assets/scorebook.js',
  'public/assets/game-registry.js',
  'public/assets/hand-foot-logic.js',
  'public/assets/backup.js',
  'public/sw.js',
  'public/apple-touch-icon.png',
  'public/bp-apple-touch-icon.png',
  'public/bp-icon-192.png',
  'public/bp-icon-512.png',
  'public/manifest.webmanifest'
];

await Promise.all(requiredAssets.map(asset => access(join(rootDir, asset))));

const committedUtilitiesCss = await readFile(join(rootDir, 'public', 'assets', 'app-utilities.css'));
const generatedDir = await mkdtemp(join(tmpdir(), 'app-utilities-'));
const generatedUtilitiesCssPath = join(generatedDir, 'app-utilities.css');
try{
  await execFileAsync(process.execPath, [
    join(rootDir, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
    '-c', join(rootDir, 'tailwind.config.cjs'),
    '-i', join(rootDir, 'src', 'tailwind.css'),
    '-o', generatedUtilitiesCssPath,
    '--minify'
  ], {cwd: rootDir});
  const generatedUtilitiesCss = await readFile(generatedUtilitiesCssPath);
  if(!committedUtilitiesCss.equals(generatedUtilitiesCss)){
    throw new Error('public/assets/app-utilities.css is stale. Run npm run build:styles and commit the result.');
  }
}finally{
  await rm(generatedDir, {recursive: true, force: true});
}

if(!index.includes("navigator.serviceWorker.register('./sw.js'")){
  throw new Error('PWA registration is missing from the app shell.');
}

if(index.includes("src=\"./assets/comeback-logic.js\"")){
  throw new Error('Comeback / turbo logic should not be loaded in the production app shell.');
}

if(!index.includes("src=\"./assets/life-preserver-logic.js\"")){
  throw new Error('Life Preserver logic is missing from the app shell.');
}

if(!index.includes("src=\"./assets/backup.js\"")){
  throw new Error('Backup helper is missing from the app shell.');
}

if(!index.includes("src=\"./assets/scorebook.js\"")){
  throw new Error('Scorebook helper is missing from the app shell.');
}

if(!index.includes("src=\"./assets/hand-foot-logic.js\"")){
  throw new Error('Hand and Foot scoring helper is missing from the app shell.');
}

if(!index.includes("src=\"./assets/game-registry.js\"")){
  throw new Error('Game registry is missing from the app shell.');
}

function appShellEntries(source, label){
  const match = source.match(/const APP_SHELL = \[([\s\S]*?)\];/);
  if(!match) throw new Error(`${label} is missing APP_SHELL.`);
  return [...match[1].matchAll(/['"](\.\/[^'"]+)['"]/g)].map(entry => entry[1]);
}

const workerTemplate = await readFile(join(rootDir, 'src', 'service-worker.js'), 'utf8');
const builtWorker = await readFile(join(rootDir, 'public', 'sw.js'), 'utf8');
const templateShell = appShellEntries(workerTemplate, 'src/service-worker.js');
const builtShell = appShellEntries(builtWorker, 'public/sw.js');
if(templateShell.includes('./assets/comeback-logic.js') || builtShell.includes('./assets/comeback-logic.js')){
  throw new Error('The service worker still precaches comeback-logic.js.');
}
if(!templateShell.includes('./assets/life-preserver-logic.js')){
  throw new Error('The service worker template omits life-preserver-logic.js.');
}

const loadedScripts = [...index.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(entry => `./${entry[1]}`);
for(const script of loadedScripts){
  if(!templateShell.includes(script)){
    throw new Error(`Worker template does not precache loaded script ${script}.`);
  }
}
if(templateShell.join('\n') !== builtShell.join('\n')){
  throw new Error('public/sw.js APP_SHELL does not match src/service-worker.js.');
}

const SHELL_PREFIX = 'back-porch-shell-';
const RELEASE_PLACEHOLDER = '__BACK_PORCH_RELEASE__';
const templateCacheName = workerTemplate.match(/const CACHE_NAME = ['"]([^'"]+)['"]/)?.[1];
if(!templateCacheName){
  throw new Error('src/service-worker.js is missing CACHE_NAME.');
}
if(!templateCacheName.startsWith(SHELL_PREFIX)){
  throw new Error('src/service-worker.js CACHE_NAME must keep the back-porch-shell- prefix.');
}
if(!templateCacheName.includes(RELEASE_PLACEHOLDER)){
  throw new Error('src/service-worker.js CACHE_NAME must contain __BACK_PORCH_RELEASE__.');
}
if(
  !/self\.addEventListener\(\s*['"]activate['"]/.test(workerTemplate)
  || !workerTemplate.includes(`key.startsWith('${SHELL_PREFIX}')`)
  || !/caches\.delete\(\s*key\s*\)/.test(workerTemplate)
){
  throw new Error('src/service-worker.js activate must delete old caches that start with back-porch-shell-.');
}

if(!index.includes('name="apple-mobile-web-app-title" content="Back Porch"')){
  throw new Error('iPad home-screen title should be the short Back Porch name.');
}

const manifest=JSON.parse(await readFile(join(rootDir,'public','manifest.webmanifest'),'utf8'));
if(manifest.name!=='Back Porch Games') throw new Error('Manifest name should stay Back Porch Games.');
if(manifest.short_name!=='Back Porch') throw new Error('Manifest short_name should be Back Porch for the home screen.');

console.log('Production assets verified.');
