import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('laptop Home stretches equal columns and keeps Recent nights full width', async () => {
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const css = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');

  assert.match(js, /s2-home-grid">\$\{tableBlock\}\$\{startBlock\}<\/div>\$\{nightsBlock\}/);
  assert.doesNotMatch(js, /homeLayout/);
  assert.match(js, /s2-night-podium/);
  assert.match(js, /s2-podium-faces[\s\S]*s2-podium-badge/);
  assert.doesNotMatch(js, /edit-seating/);
  assert.doesNotMatch(js, /Edit Seating/);

  const defaultGrid = css.match(/html\.slice2-tv \.s2-home-grid\s*\{[^}]+\}/);
  assert.ok(defaultGrid, 'default home grid missing');
  assert.match(defaultGrid[0], /align-items:\s*stretch/);
  assert.match(css, /\.s2-home-table,\s*html\.slice2-tv \.s2-home-start\s*\{[\s\S]*height:\s*100%/);
  assert.match(css, /\.s2-seat-grid\s*\{[\s\S]*flex:\s*1 1 auto;/);
  assert.match(css, /\.s2-seat-grid\s*\{[\s\S]*grid-auto-rows:\s*auto/);
  assert.match(css, /\.s2-seat \.avatar-img\s*\{[\s\S]*width:\s*44px/);
  assert.match(css, /\.s2-seat-name\s*\{[\s\S]*font-size:\s*1\.08rem/);
  assert.match(css, /\.s2-seat-handle\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*grid-auto-rows:\s*minmax\(44px, auto\)/);
  assert.doesNotMatch(css, /data-bp-home/);
});
