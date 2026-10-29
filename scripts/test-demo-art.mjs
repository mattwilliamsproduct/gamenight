import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

async function missing(rel) {
  try {
    await access(join(root, rel));
    assert.fail(`${rel} must not ship`);
  } catch (error) {
    assert.equal(error.code, 'ENOENT', `${rel} must not ship`);
  }
}

test('demo-art files and ?art chrome are not shipped', async () => {
  await missing('public/assets/demo-art.mjs');
  await missing('public/assets/demo-art.css');
  const index = await readFile(join(root, 'public/index.html'), 'utf8');
  assert.doesNotMatch(index, /demo-art\.css/);
  assert.doesNotMatch(index, /demo-art\.mjs/);
  assert.doesNotMatch(index, /data-bp-art|bpArt|bpLogo/);
  assert.match(index, /url\('\.\/theme\/back-porch-mark\.jpg'\)/);
});

test('card faces stay on the shelf without demo-art', async () => {
  const css = await readFile(join(root, 'public/assets/card-picker.css'), 'utf8');
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const slice2 = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');
  assert.match(css, /\.s2-card-frame/);
  assert.match(js, /assets\/cards\/five-crowns\.webp/);
  assert.match(js, /assets\/cards\/canasta\.webp/);
  assert.match(js, /assets\/cards\/rook\.webp/);
  assert.doesNotMatch(js, /demo-art|applyDemoChrome|data-bp-art/);
  assert.match(slice2, /\.s2-art-canasta[\s\S]*?url\("\.\/art\/dusk\/canasta\.webp"\)/);
  for (const face of ['five-crowns.webp', '818.webp', 'wizard.webp', 'flip7.webp', 'beat-the-heat.webp', 'canasta.webp', 'rook.webp']) {
    await access(join(root, 'public/assets/cards', face));
  }
  await access(join(root, 'public/theme/back-porch-mark.jpg'));
  await access(join(root, 'public/assets/art/dusk/canasta.webp'));
});
