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
});

test('Home cards are 5:7 faces with no under-card copy and select-then-Start only', async () => {
  const css = await readFile(join(root, 'public/assets/card-picker.css'), 'utf8');
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const index = await readFile(join(root, 'public/index.html'), 'utf8');

  assert.match(index, /href="\.\/assets\/card-picker\.css"/);
  assert.match(css, /aspect-ratio:\s*5\s*\/\s*7/);
  assert.match(css, /--bp-card-max:\s*220px/);
  assert.match(css, /minmax\(348px,\s*360px\)/);
  assert.match(css, /\.s2-card-frame/);
  assert.match(css, /object-fit:\s*cover/);
  assert.doesNotMatch(css, /background-size:\s*contain/);
  assert.match(css, /\.s2-game-copy\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css, /repeat\(4,\s*var\(--bp-card-max\)\)/);
  assert.match(css, /background-image:\s*none\s*!important/);
  assert.match(js, /s2-card-frame/);
  assert.match(js, /s2-card-photo/);
  assert.match(js, /assets\/cards\/canasta\.webp/);
  assert.doesNotMatch(js, /s2-art-\$\{game\.art\}/);
  assert.doesNotMatch(js, /tapStartEnabled|start-game-now|tapstart/);
  assert.match(js, /cardAriaLabel/);
  assert.match(js, /data-s2-action="pick-game"/);
  assert.match(index, /id="save-indicator">✓ Saved</);

  for (const face of FACES) {
    await access(join(root, 'public/assets/cards', face));
  }
});
