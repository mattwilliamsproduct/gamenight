import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('default Home keeps Recent nights full width and does not stretch columns', async () => {
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const css = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');

  assert.match(js, /function homeLayout\(/);
  assert.match(js, /homeLayout\(\) === 'b'/);
  assert.match(js, /s2-home-grid">\$\{tableBlock\}\$\{startBlock\}<\/div>\$\{nightsBlock\}/);
  assert.match(js, /s2-home-grid">\$\{tableBlock\}\$\{startBlock\}\$\{nightsBlock\}<\/div>/);
  assert.match(js, /s2-night-podium/);
  assert.doesNotMatch(js, /edit-seating/);
  assert.doesNotMatch(js, /Edit Seating/);

  const defaultGrid = css.match(/html\.slice2-tv \.s2-home-grid\s*\{[^}]+\}/);
  assert.ok(defaultGrid, 'default home grid missing');
  assert.match(defaultGrid[0], /align-items:\s*start/);
  assert.doesNotMatch(defaultGrid[0], /align-items:\s*stretch/);
  assert.match(css, /\[data-bp-home="a"\] \.s2-home-grid[\s\S]*align-items:\s*stretch/);
  assert.match(css, /\[data-bp-home="a"\] \.s2-add\s*\{[\s\S]*margin-top:\s*auto/);
  assert.match(css, /\[data-bp-home="b"\] \.s2-nights\s*\{[\s\S]*grid-column:\s*1;/);
  assert.match(css, /\[data-bp-home="b"\] \.s2-home-start\s*\{[\s\S]*grid-column:\s*2;/);
  assert.match(css, /\.s2-seat-grid\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /\.s2-seat-handle\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(css, /@media \(max-width:\s*860px\)/);
});
