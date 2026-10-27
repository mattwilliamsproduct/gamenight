import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';
import {
  DEFAULT_LOGO_IMAGE,
  DEFAULT_TILE_IMAGES,
  applyDemoChrome,
  parseDemoChrome
} from '../public/assets/demo-art.mjs';

const root = process.cwd();

function fakeDocument(start = {}){
  return {
    documentElement: {
      dataset: {...start}
    }
  };
}

test('no demo param keeps the current Home tiles and logo', async () => {
  assert.deepEqual(parseDemoChrome('', 'localhost'), {art: '', logo: ''});
  assert.deepEqual(parseDemoChrome('?art=dusk&logo=dusk', 'localhost'), {art: '', logo: ''});
  assert.deepEqual(parseDemoChrome('?demo&art=dusk&logo=dusk', 'cardknight.vercel.app'), {art: '', logo: ''});

  const idle = fakeDocument();
  assert.deepEqual(applyDemoChrome(idle, '', 'localhost'), {art: '', logo: ''});
  assert.equal(idle.documentElement.dataset.bpArt, undefined);
  assert.equal(idle.documentElement.dataset.bpLogo, undefined);

  const slice2 = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');
  const index = await readFile(join(root, 'public/index.html'), 'utf8');
  const duskCss = await readFile(join(root, 'public/assets/demo-art.css'), 'utf8');

  assert.match(index, /url\('\.\/theme\/back-porch-mark\.jpg'\)/);
  assert.equal(DEFAULT_LOGO_IMAGE, './theme/back-porch-mark.jpg');
  Object.values(DEFAULT_TILE_IMAGES).forEach((url) => {
    assert.ok(slice2.includes(url), `default tile missing ${url}`);
    assert.ok(!duskCss.includes(url), `dusk css should not reuse ${url}`);
  });

  const duskRules = duskCss.split('}').filter((block) => block.includes('background-image'));
  assert.ok(duskRules.length >= 6, 'dusk tile rules missing');
  duskRules.forEach((block) => {
    assert.match(block, /\[data-bp-art="dusk"\]/, 'dusk tile image leaked outside the demo attr');
  });
  assert.match(duskCss, /html\[data-bp-logo="dusk"\]/);
});

test('allowed preview ?demo&art=dusk and ?demo&logo=dusk apply together', () => {
  const preview = 'gamenight-git-cursor-art-logo-dusk-640a-mattwilliamsproducts-projects.vercel.app';
  assert.deepEqual(parseDemoChrome('?demo&art=dusk', 'localhost'), {art: 'dusk', logo: ''});
  assert.deepEqual(parseDemoChrome('?demo&logo=dusk', '127.0.0.1'), {art: '', logo: 'dusk'});
  assert.deepEqual(parseDemoChrome('?demo&art=dusk&logo=dusk', preview), {art: 'dusk', logo: 'dusk'});
  assert.deepEqual(parseDemoChrome('?demo&art=A&logo=1', 'localhost'), {art: '', logo: ''});

  const doc = fakeDocument({bpArt: 'stale', bpLogo: 'stale'});
  applyDemoChrome(doc, '?demo&art=dusk&logo=dusk', 'localhost');
  assert.equal(doc.documentElement.dataset.bpArt, 'dusk');
  assert.equal(doc.documentElement.dataset.bpLogo, 'dusk');
  applyDemoChrome(doc, '', 'localhost');
  assert.equal(doc.documentElement.dataset.bpArt, undefined);
  assert.equal(doc.documentElement.dataset.bpLogo, undefined);
});
