import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {demoBookHasPorchCast} from '../public/demo/try-demo-cast.mjs';

const require = createRequire(import.meta.url);
const Photo = require('../public/assets/avatar-photo.js');

test('a stored photo is a short image data URL or a safe file name', () => {
  const jpeg = `data:image/jpeg;base64,${'a'.repeat(80)}`;
  assert.equal(Photo.isDataPhoto(jpeg), true);
  assert.equal(Photo.isDataPhoto('data:image/jpeg;base64,abc'), false);
  assert.equal(Photo.isDataPhoto('blob:http://expired'), false);
  assert.equal(Photo.isBrokenAvatarRef('blob:http://expired'), true);
  assert.equal(Photo.isBrokenAvatarRef('photo.heic'), true);
  assert.equal(Photo.isBrokenAvatarRef('../secret.png'), true);
  assert.equal(Photo.isSafeAvatarFile('donkey.png'), true);
  assert.equal(Photo.isUploadedPlayerPhoto('donkey.png'), true);
  assert.equal(Photo.isUploadedPlayerPhoto('silhouette-pirate.png'), false);
  assert.equal(Photo.avatarSrc(jpeg, './avatars/silhouette-pirate.png'), jpeg);
  assert.equal(Photo.avatarSrc('donkey.png', './avatars/silhouette-pirate.png'), './avatars/donkey.png');
  assert.equal(Photo.avatarSrc('blob:http://expired', './avatars/silhouette-pirate.png'), './avatars/silhouette-pirate.png');
  assert.equal(Photo.avatarSrc('', './avatars/silhouette-pirate.png'), './avatars/silhouette-pirate.png');
  assert.equal(Photo.MAX_EDGE, 512);
});

test('a player photo does not make the demo look like the porch cast', () => {
  const jpeg = `data:image/jpeg;base64,${'abc'.repeat(40)}`;
  assert.equal(demoBookHasPorchCast(JSON.stringify({
    playerProfiles: {Priya: {avatar: jpeg}},
    players: ['Priya']
  })), false);
  assert.equal(demoBookHasPorchCast(JSON.stringify({
    playerProfiles: {Priya: {avatar: 'donkey.png'}}
  })), false);
  assert.equal(demoBookHasPorchCast('Megan won'), true);
});

test('the page shrinks uploads and the demo no longer blanks a chosen portrait', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const demo = readFileSync(new URL('../public/demo/try-demo.js', import.meta.url), 'utf8');
  const worker = readFileSync(new URL('../src/service-worker.js', import.meta.url), 'utf8');
  assert.match(html, /src="\.\/assets\/avatar-photo\.js"/);
  assert.match(worker, /'\.\/assets\/avatar-photo\.js'/);
  assert.match(html, /prepareAvatarPhoto/);
  assert.match(html, /The current picture stayed/);
  assert.match(html, /repairStoredAvatars/);
  assert.match(html, /id="avatar-photo-input"/);
  assert.doesNotMatch(demo, /opacity:0/);
  assert.doesNotMatch(demo, /removeAttribute\('src'\)/);
  assert.match(demo, /isBrokenAvatarRef/);
});
