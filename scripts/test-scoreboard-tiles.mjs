import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('entered round scores use one tile and a blank cell stays bare', async () => {
  const css = await readFile(new URL('../public/assets/slice2.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const tile = css.slice(css.indexOf('Entered round scores sit on one soft tile'));
  assert.ok(tile.length > 40);
  assert.match(tile, /\.score-cell-input\.is-entered \{[^}]*background: #e8e3da/);
  assert.match(tile, /tr\.leader-row[^}]*\{[^}]*background: #d5ebe3/);
  assert.match(tile, /border-radius: 9px/);
  assert.match(tile, /box-shadow: none/);
  assert.doesNotMatch(tile, /nth-child|border-left|border-right|column-stripe/);
  assert.match(html, /entered\?' is-entered':''/);
  assert.match(html, /s2-now-bid/);
});
