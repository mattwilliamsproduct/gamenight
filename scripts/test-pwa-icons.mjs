import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {inflateSync} from 'node:zlib';
import test from 'node:test';

const root = process.cwd();
const FAVICON_SHA256 = 'f90e361890482dee4f8e627a4d967ca3aa5fba10e95053f28769162d270d59fb';

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readRgbaPng(buf) {
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('not a PNG');
  }
  const chunks = [];
  for (let off = 8; off < buf.length;) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    chunks.push({type, data: buf.subarray(off + 8, off + 8 + len)});
    off += 12 + len;
  }
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR')?.data;
  if (!ihdr) throw new Error('missing IHDR');
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bit = ihdr[8];
  const color = ihdr[9];
  const interlace = ihdr[12];
  if (bit !== 8 || color !== 6 || interlace !== 0) {
    throw new Error(`expected 8-bit RGBA PNG, got bit=${bit} color=${color} interlace=${interlace}`);
  }
  const raw = inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)));
  const bpp = 4;
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src];
    src += 1;
    const row = raw.subarray(src, src + stride);
    src += stride;
    const dest = y * stride;
    const prev = y ? dest - stride : -1;
    for (let i = 0; i < stride; i += 1) {
      const left = i >= bpp ? pixels[dest + i - bpp] : 0;
      const up = prev >= 0 ? pixels[prev + i] : 0;
      const upLeft = prev >= 0 && i >= bpp ? pixels[prev + i - bpp] : 0;
      let recon = row[i];
      if (filter === 1) recon = (recon + left) & 255;
      else if (filter === 2) recon = (recon + up) & 255;
      else if (filter === 3) recon = (recon + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) recon = (recon + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`bad PNG filter ${filter}`);
      pixels[dest + i] = recon;
    }
  }
  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  };
  return {width, height, at};
}

test('favicon 32 stays frozen at the v4 bytes', async () => {
  const bytes = await readFile(join(root, 'public/bp-favicon-32.png'));
  const twin = await readFile(join(root, 'public/favicon-32.png'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), FAVICON_SHA256);
  assert.equal(createHash('sha256').update(twin).digest('hex'), FAVICON_SHA256);
  const index = await readFile(join(root, 'public/index.html'), 'utf8');
  assert.match(index, /bp-favicon-32\.png\?v=4/);
  assert.match(index, /apple-touch-icon\.png\?v=6/);
});

test('PWA and apple-touch corners are not white', async () => {
  const files = [
    ['public/apple-touch-icon.png', 180],
    ['public/bp-apple-touch-icon.png', 180],
    ['public/bp-icon-192.png', 192],
    ['public/bp-icon-512.png', 512],
    ['public/bp-icon-192-maskable.png', 192],
    ['public/bp-icon-512-maskable.png', 512]
  ];
  for (const [rel, size] of files) {
    const png = readRgbaPng(await readFile(join(root, rel)));
    assert.equal(png.width, size, `${rel} width`);
    assert.equal(png.height, size, `${rel} height`);
    for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) {
      const [r, g, b, a] = png.at(x, y);
      assert.equal(r >= 248 && g >= 248 && b >= 248 && a > 200, false, `${rel} white corner at ${x},${y} rgb=(${r},${g},${b})`);
    }
    if (rel.includes('maskable')) {
      const [r, g, b] = png.at(2, 2);
      assert.equal(r >= 248 && g >= 248 && b >= 248, false, `${rel} maskable pad is white`);
      assert.ok(r >= 40 && g >= 80 && b >= 80, `${rel} maskable pad ${r},${g},${b} is not the art teal`);
    }
  }
});
