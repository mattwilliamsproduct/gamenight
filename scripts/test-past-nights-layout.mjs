import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../public/assets/slice2.css', import.meta.url), 'utf8');

test('Past nights stay one full-width column at every width', () => {
  assert.doesNotMatch(css, /\.s2-night-day\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2/);
  assert.match(css, /\.s2-night-left-label/);
  assert.match(css, /\.s2-night-standings[\s\S]*?width:\s*max-content/);
  assert.doesNotMatch(css, /\.s2-night-standings[\s\S]{0,200}max-width:\s*22rem/);
});
