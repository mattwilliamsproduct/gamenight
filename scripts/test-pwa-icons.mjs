import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const FAVICON_SHA256 = 'f90e361890482dee4f8e627a4d967ca3aa5fba10e95053f28769162d270d59fb';

test('favicon 32 stays frozen at the v4 bytes', async () => {
  const bytes = await readFile(join(root, 'public/bp-favicon-32.png'));
  const twin = await readFile(join(root, 'public/favicon-32.png'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), FAVICON_SHA256);
  assert.equal(createHash('sha256').update(twin).digest('hex'), FAVICON_SHA256);
  const index = await readFile(join(root, 'public/index.html'), 'utf8');
  assert.match(index, /bp-favicon-32\.png\?v=4/);
  assert.match(index, /apple-touch-icon\.png\?v=6/);
});

test('PWA and apple-touch corners are not white', () => {
  const py = `
from pathlib import Path
from PIL import Image
root = Path(${JSON.stringify(root)})
files = [
    ('public/apple-touch-icon.png', 180),
    ('public/bp-apple-touch-icon.png', 180),
    ('public/bp-icon-192.png', 192),
    ('public/bp-icon-512.png', 512),
    ('public/bp-icon-192-maskable.png', 192),
    ('public/bp-icon-512-maskable.png', 512),
]
failed = []
for rel, size in files:
    im = Image.open(root / rel).convert('RGBA')
    if im.size != (size, size):
        failed.append(f'{rel} size {im.size} != {size}')
        continue
    w, h = im.size
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        r, g, b, a = im.getpixel((x, y))
        if r >= 248 and g >= 248 and b >= 248 and a > 200:
            failed.append(f'{rel} white corner at {x},{y} rgb=({r},{g},{b})')
    if 'maskable' in rel:
        r, g, b, a = im.getpixel((2, 2))
        if r >= 248 and g >= 248 and b >= 248:
            failed.append(f'{rel} maskable pad is white')
        if r < 40 or g < 80 or b < 80:
            failed.append(f'{rel} maskable pad {r},{g},{b} is not the art teal')
if failed:
    raise SystemExit('\\n'.join(failed))
print('ok')
`;
  const run = spawnSync('python3', ['-c', py], {encoding: 'utf8'});
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
