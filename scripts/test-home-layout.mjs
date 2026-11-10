import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('laptop Home keeps a content-sized default and a landscape fill', async () => {
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const css = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');
  const cards = await readFile(join(root, 'public/assets/card-picker.css'), 'utf8');

  assert.match(js, /s2-home-grid">\$\{left\}\$\{startBlock\}<\/div>/);
  assert.doesNotMatch(js, /Recent nights/);
  assert.doesNotMatch(js, /homeLayout/);
  assert.match(js, /s2-night-podium/);
  assert.match(js, /s2-podium-person[\s\S]*s2-podium-rank/);
  assert.match(js, /homePlaceLabel/);
  assert.match(js, /Resume unfinished/);
  assert.match(js, /View all/);
  assert.doesNotMatch(js, /s2-podium-faces/);
  assert.doesNotMatch(js, /s2-podium-badge/);
  assert.doesNotMatch(js, /edit-seating/);
  assert.doesNotMatch(js, /Edit Seating/);

  const defaultGrid = css.match(/html\.slice2-tv \.s2-home-grid\s*\{[^}]+\}/);
  assert.ok(defaultGrid, 'default home grid missing');
  assert.match(defaultGrid[0], /align-items:\s*start/);
  assert.match(css, /\.s2-home-table,\s*html\.slice2-tv \.s2-home-start\s*\{[\s\S]*height:\s*auto/);
  assert.match(css, /\.s2-seat-grid\s*\{[\s\S]*flex:\s*0 1 auto;/);
  assert.match(css, /\.s2-seat-grid\s*\{[\s\S]*grid-auto-rows:\s*minmax\(44px, auto\)/);
  assert.match(css, /\.s2-seat \.avatar-img\s*\{[\s\S]*width:\s*44px/);
  assert.match(css, /\.s2-seat-name\s*\{[\s\S]*font-size:\s*1\.08rem/);
  assert.match(css, /\.s2-seat-handle\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*grid-auto-rows:\s*minmax\(44px, auto\)/);
  assert.match(cards, /orientation:\s*landscape[\s\S]*overflow-y:\s*auto/);
  assert.match(cards, /orientation:\s*landscape[\s\S]*min-height:\s*64px/);
  assert.doesNotMatch(cards, /max-height:\s*52px/);
  assert.match(cards, /aspect-ratio:\s*5\s*\/\s*7/);
  assert.doesNotMatch(css, /overflow:\s*hidden;\s*\/\* lock the page/);
  assert.doesNotMatch(cards, /100svh/);
});
