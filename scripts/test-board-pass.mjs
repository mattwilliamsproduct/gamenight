import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('scoreboard header, tiles, and Life Preserver cells stay on the porch type', async () => {
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const css = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');
  const html = await readFile(join(root, 'public/index.html'), 'utf8');

  assert.match(js, /return 'Enter Scores'/);
  assert.doesNotMatch(js, /Enter Round \$\{round\} Scores/);
  assert.match(js, /s2-board-mark/);
  assert.match(js, /updateNavButton\(\)/);
  assert.match(html, /function goHome\(\)\{[^}]*updateNavButton\(\)/);
  assert.match(html, /id="actions-save-end"/);
  assert.match(html, /Leave game/);
  assert.match(html, /id="leave-save-later"/);
  assert.match(html, /id="leave-end-now"/);
  assert.match(html, /id="leave-keep-playing"/);
  assert.doesNotMatch(html, /class="btn-ghost match-end-btn/);
  assert.match(html, /entered\?' is-entered':''/);
  assert.match(css, /background: #e8e3da !important/);
  assert.match(css, /background: #d5ebe3 !important/);
  assert.match(css, /color: #0c2824 !important/);
  assert.match(css, /grid-template-areas: "logo rule copy home enter actions end"/);
  assert.match(css, /grid-template-areas:\s*"copy copy copy copy"\s*"home enter actions end"/);
  assert.match(css, /border-radius: 28px !important/);
  assert.match(css, /background: #fffaf1 !important/);
  assert.match(css, /top: calc\(var\(--bp-accent-line\) \+ var\(--bp-nav-gap\)\) !important/);
  assert.match(css, /score-cell-stack:is\(\.has-comeback, \.has-life-preserver\):has\(\.is-entered\) \{[\s\S]*width: 100% !important/);
  assert.doesNotMatch(css, /\.s2-now-bid \{[^}]*border-radius:\s*999px/);
  assert.doesNotMatch(html, /font-size: var\(--scorecard-col-input-font, max\(15px, calc\(var\(--scorecard-input-font\) \* 0\.72\)\)\)/);
  assert.match(html, /score-cell-stack:is\(\.has-comeback, \.has-life-preserver\) \{\s*width: auto;/);
});
