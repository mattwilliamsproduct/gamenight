import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Games = require('../public/assets/game-registry.js');
const root = process.cwd();

const FACES = [
  'five-crowns.webp',
  '818.webp',
  'wizard.webp',
  'flip7.webp',
  'beat-the-heat.webp',
  'canasta.webp',
  'rook.webp'
];

test('the shelf shows all seven games including Rook', () => {
  const visible = Games.visibleGames('');
  const ids = visible.map((game) => game.id);
  assert.deepEqual(ids, [
    'Five Crowns',
    '818',
    'Wizard',
    'Flip 7 Vengeance',
    'Beat the Heat',
    'Hand and Foot',
    'Rook'
  ]);
  assert.equal(Games.gameById('Rook').hidden, false);
  assert.equal(Games.displayName('Hand and Foot'), 'Canasta');
  assert.equal(Games.displayName('Flip 7 Vengeance'), 'Flip 7');
});

test('Home card faces are 5:7; Rook and Beat the Heat contain on white', async () => {
  const css = await readFile(join(root, 'public/assets/card-picker.css'), 'utf8');
  const index = await readFile(join(root, 'public/index.html'), 'utf8');
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');

  assert.match(index, /href="\.\/assets\/card-picker\.css"/);
  assert.match(css, /aspect-ratio:\s*5\s*\/\s*7/);
  assert.match(css, /--bp-card-radius:\s*10px/);
  assert.match(css, /\.s2-art-rook,\s*html\.slice2-tv \.s2-home-start \.s2-art-heat[\s\S]*background-size:\s*contain/);
  assert.match(css, /\.s2-art-rook,\s*html\.slice2-tv \.s2-home-start \.s2-art-heat[\s\S]*background-color:\s*#fff/);
  assert.match(css, /url\("\.\/cards\/canasta\.webp"\)/);
  assert.match(css, /url\("\.\/cards\/beat-the-heat\.webp"\)/);
  assert.match(css, /url\("\.\/cards\/rook\.webp"\)/);
  assert.doesNotMatch(css, /placeholder/);
  assert.match(js, /function tapStartEnabled/);
  assert.match(js, /start-game-now/);
  assert.match(js, /pick-game/);
  assert.match(js, /params\.get\('tapstart'\) === '1'/);

  for (const face of FACES) {
    await access(join(root, 'public/assets/cards', face));
  }
});
