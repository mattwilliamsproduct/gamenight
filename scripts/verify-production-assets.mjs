import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

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
  'public/assets/backup.js',
  'public/sw.js',
  'public/apple-touch-icon.png',
  'public/bp-apple-touch-icon.png',
  'public/bp-icon-192.png',
  'public/bp-icon-512.png',
  'public/manifest.webmanifest'
];

await Promise.all(requiredAssets.map(asset => access(join(rootDir, asset))));

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

if(!index.includes('name="apple-mobile-web-app-title" content="Back Porch"')){
  throw new Error('iPad home-screen title should be the short Back Porch name.');
}

const manifest=JSON.parse(await readFile(join(rootDir,'public','manifest.webmanifest'),'utf8'));
if(manifest.name!=='Back Porch Games') throw new Error('Manifest name should stay Back Porch Games.');
if(manifest.short_name!=='Back Porch') throw new Error('Manifest short_name should be Back Porch for the home screen.');

console.log('Production assets verified.');
