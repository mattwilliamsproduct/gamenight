import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('laptop Home keeps Recent nights under Tonight\'s Table', async () => {
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const css = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');

  const gridOpen = js.indexOf('<div class="s2-home-grid">');
  const nights = js.indexOf('class="s2-nights"');
  const start = js.indexOf('class="s2-panel s2-home-start"');
  const gridClose = js.indexOf('</div>`', gridOpen);
  assert.ok(gridOpen > 0, 'home grid missing');
  assert.ok(nights > gridOpen && nights < gridClose, 'Recent nights must render inside the home grid');
  assert.ok(start > nights && start < gridClose, 'Start a New Match must follow nights in the grid markup');
  assert.match(js, /s2-home-table/);
  assert.match(js, /s2-night-date/);
  assert.match(js, /s2-night-who/);

  assert.match(css, /\.s2-home-table\s*\{\s*grid-column:\s*1;/);
  assert.match(css, /\.s2-nights\s*\{\s*grid-column:\s*1;\s*grid-row:\s*2;/);
  assert.match(css, /\.s2-home-start\s*\{\s*grid-column:\s*2;\s*grid-row:\s*1\s*\/\s*-1;/);
  assert.match(css, /@media \(max-width:\s*860px\)/);
  assert.match(css, /\.s2-home-table \{ order: 1; \}/);
  assert.match(css, /\.s2-home-start \{ order: 2; \}/);
  assert.match(css, /\.s2-nights \{ order: 3; \}/);
  assert.match(css, /\.s2-nights \.s2-night-list/);
});
