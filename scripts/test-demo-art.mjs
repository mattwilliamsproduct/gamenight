import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';
import {
  DEFAULT_LOGO_IMAGE,
  DEFAULT_TILE_IMAGES,
  DUSK_SHEET_SLUGS,
  DUSK_TILE_SLUGS,
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

const emptyChrome = {art: '', logo: '', picker: '', wiz: '', eight18: '', five: '', tap: '', faces: ''};

test('no demo param keeps the current Home tiles and logo', async () => {
  assert.deepEqual(parseDemoChrome('', 'localhost'), emptyChrome);
  assert.deepEqual(parseDemoChrome('?art=dusk&logo=dusk', 'localhost'), emptyChrome);
  assert.deepEqual(parseDemoChrome('?demo&art=dusk&logo=dusk', 'cardknight.vercel.app'), emptyChrome);

  const idle = fakeDocument();
  assert.deepEqual(applyDemoChrome(idle, '', 'localhost'), emptyChrome);
  assert.equal(idle.documentElement.dataset.bpArt, undefined);
  assert.equal(idle.documentElement.dataset.bpLogo, undefined);
  assert.equal(idle.documentElement.dataset.bpHome, undefined);

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
  assert.ok(duskRules.length >= 5, 'dusk tile rules missing');
  duskRules.forEach((block) => {
    assert.match(block, /\[data-bp-art="dusk"\]/, 'dusk tile image leaked outside the demo attr');
  });
  assert.match(duskCss, /\[data-bp-logo="dusk"\]/);
  assert.match(duskCss, /background-size:\s*cover/);
  assert.match(duskCss, /background-position:\s*50%\s*55%/);
  assert.match(duskCss, /\.s2-art-wizard\s*\{[^}]*background-position:\s*50%\s*46%/);
  assert.doesNotMatch(duskCss, /background-size:\s*contain/);
  assert.doesNotMatch(duskCss, /background-size:\s*100%\s*100%/);

  const themeSlugs = Object.values(DEFAULT_TILE_IMAGES).map((url) => {
    const match = url.match(/game-card-([a-z0-9-]+)-thumb\.jpg$/);
    assert.ok(match, `theme slug missing from ${url}`);
    return match[1];
  });
  assert.ok(themeSlugs.includes('rook'), 'Rook stays on the default shelf');
  assert.equal(DUSK_TILE_SLUGS.rook, undefined, 'Rook is not in the dusk mapping');
  assert.doesNotMatch(duskCss, /art\/dusk\/rook\.webp/);
  assert.deepEqual(
    Object.values(DUSK_TILE_SLUGS).filter((slug) => slug !== 'canasta').sort(),
    themeSlugs.filter((slug) => slug !== 'rook').sort()
  );
  for (const slug of Object.values(DUSK_TILE_SLUGS)) {
    const file = `public/assets/art/dusk/${slug}.webp`;
    await access(join(root, file));
    assert.match(duskCss, new RegExp(`url\\("\\./art/dusk/${slug}\\.webp"\\)`));
  }
  assert.deepEqual(DUSK_SHEET_SLUGS, ['five-crowns', '818', 'wizard', 'flip7', 'beat-heat', 'canasta']);
  assert.equal(DUSK_TILE_SLUGS.canasta, 'canasta');
  assert.match(duskCss, /art\/dusk\/canasta\.webp/);
  assert.match(slice2, /\.s2-art-canasta[\s\S]*?url\("\.\/art\/dusk\/canasta\.webp"\)/);
  await access(join(root, 'public/assets/art/dusk/canasta.webp'));
  assert.doesNotMatch(index, /startGame\('Canasta'/);
  assert.match(index, /Hand and Foot/);
  for (const slug of DUSK_SHEET_SLUGS) {
    await access(join(root, `public/assets/art/dusk/${slug}.webp`));
  }
  try {
    await access(join(root, 'public/assets/art/dusk/rook.webp'));
    assert.fail('dusk rook.webp should be gone');
  } catch (error) {
    assert.equal(error.code, 'ENOENT');
  }
  await access(join(root, 'public/assets/logo/dusk-mark.svg'));
  await access(join(root, 'public/assets/logo/dusk-mark-light.svg'));
  assert.match(duskCss, /url\("\.\/logo\/dusk-mark\.svg"\)/);
});

test('allowed preview ?demo&art=dusk and ?demo&logo=dusk apply together', async () => {
  const preview = 'gamenight-git-cursor-art-logo-dusk-640a-mattwilliamsproducts-projects.vercel.app';
  assert.deepEqual(parseDemoChrome('?demo&art=dusk', 'localhost'), {...emptyChrome, art: 'dusk'});
  assert.deepEqual(parseDemoChrome('?demo&logo=dusk', '127.0.0.1'), {...emptyChrome, logo: 'dusk'});
  assert.deepEqual(parseDemoChrome('?demo&art=dusk&logo=dusk', preview), {...emptyChrome, art: 'dusk', logo: 'dusk'});
  assert.deepEqual(parseDemoChrome('?demo&art=A&logo=1', 'localhost'), {...emptyChrome, logo: '1'});
  assert.deepEqual(parseDemoChrome('?demo&picker=B&logo=sheet', 'localhost'), {...emptyChrome, logo: 'sheet', picker: 'B'});
  const flip7Badge = await readFile(join(root, 'public/assets/picker/badge-flip7.svg'), 'utf8');
  const pickerCss = await readFile(join(root, 'public/assets/demo-picker.css'), 'utf8');
  assert.doesNotMatch(flip7Badge, /VENGEANCE|GREATEST|WITH A/i);
  assert.doesNotMatch(flip7Badge, /<text[\s>]/);
  assert.match(flip7Badge, /rotate\(-40 32 38\)/);
  assert.match(pickerCss, /\[data-bp-picker="B"\][\s\S]*badge-flip7\.svg/);
  assert.match(pickerCss, /\[data-bp-picker="C"\][\s\S]*\.s2-art-flip7[\s\S]*badge-flip7\.svg/);
  assert.equal(parseDemoChrome('?demo&picker=D', 'localhost').picker, 'D');
  assert.equal(parseDemoChrome('?demo&picker=D', 'localhost').five, 'faithful');
  assert.equal(parseDemoChrome('?demo&picker=D', 'localhost').wiz, 'homage');
  assert.equal(parseDemoChrome('?demo&picker=D', 'localhost').eight18, 'homage');
  assert.equal(parseDemoChrome('?demo&picker=D', 'localhost').tap, 'start');
  assert.equal(parseDemoChrome('?demo&picker=D&five=homage&wiz=faithful&818=faithful&tap=confirm', 'localhost').five, 'homage');
  assert.equal(parseDemoChrome('?demo&picker=D&faces=sheet', 'localhost').faces, 'sheet');
  await access(join(root, 'public/assets/picker/faces/five-crowns.png'));
  await access(join(root, 'public/assets/picker/faces/five-crowns-tribute.svg'));

  const doc = fakeDocument({bpArt: 'stale', bpLogo: 'stale'});
  applyDemoChrome(doc, '?demo&art=dusk&logo=dusk', 'localhost');
  assert.equal(doc.documentElement.dataset.bpArt, 'dusk');
  assert.equal(doc.documentElement.dataset.bpLogo, 'dusk');
  applyDemoChrome(doc, '', 'localhost');
  assert.equal(doc.documentElement.dataset.bpArt, undefined);
  assert.equal(doc.documentElement.dataset.bpLogo, undefined);
});

test('preview home flags are gone', () => {
  assert.equal(Object.hasOwn(parseDemoChrome('?demo&home=a', 'localhost'), 'home'), false);
  const doc = fakeDocument({bpHome: 'stale'});
  applyDemoChrome(doc, '?demo&home=a', 'localhost');
  assert.equal(doc.documentElement.dataset.bpHome, undefined);
});
