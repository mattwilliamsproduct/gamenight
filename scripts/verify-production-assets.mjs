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
  'public/assets/vendor/canvas-confetti.js',
  'public/assets/vendor/chart.js',
  'public/assets/vendor/html2canvas.js',
  'public/sw.js'
];

await Promise.all(requiredAssets.map(asset => access(join(rootDir, asset))));

if(!index.includes("navigator.serviceWorker.register('./sw.js'")){
  throw new Error('PWA registration is missing from the app shell.');
}

console.log('Production assets verified.');
