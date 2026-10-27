import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('laptop Home keeps Recent nights full width under both columns', async () => {
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const css = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');

  const gridOpen = js.indexOf('<div class="s2-home-grid">');
  const nights = js.indexOf('class="s2-nights"');
  const start = js.indexOf('class="s2-panel s2-home-start"');
  assert.ok(gridOpen > 0, 'home grid missing');
  assert.ok(start > gridOpen && start < nights, 'Start a New Match stays in the two-column grid');
  assert.match(js, /<\/section>\s*<\/div>\s*\$\{nights/, 'Recent nights stays full width after the home grid');
  assert.match(js, /s2-home-table/);
  assert.match(js, /s2-night-podium/);
  assert.doesNotMatch(js, /edit-seating/);
  assert.doesNotMatch(js, /Edit Seating/);

  assert.match(css, /\.s2-home-grid\s*\{[\s\S]*align-items:\s*stretch;/);
  assert.match(css, /\.s2-seat-grid\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /\.s2-seat-handle\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(css, /@media \(max-width:\s*860px\)/);
  assert.doesNotMatch(css, /\.s2-home-grid:has\(\.s2-nights\)/);
  assert.doesNotMatch(css, /\.s2-nights\s*\{\s*grid-column:\s*1;/);
});
