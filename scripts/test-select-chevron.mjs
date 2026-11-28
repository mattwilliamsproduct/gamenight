import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = [
  'public/index.html',
  'public/assets/slice2.js',
  'public/assets/records-logic.js',
  'public/qa/gallery.mjs'
];

test('every select uses the shared chevron class and no screen draws its own arrow', async () => {
  const html = await readFile('public/index.html', 'utf8');
  assert.match(html, /select\.bp-select \{[\s\S]*background-position: right 14px center !important;[\s\S]*padding-right: 36px !important;/);
  assert.equal((html.match(/background-position: right 14px center/g) || []).length, 1);
  assert.doesNotMatch(html, /bp-rules-picker::after/);
  assert.doesNotMatch(html, /<select\b(?![^>]*\bbp-select\b)[^>]*>/);

  for (const file of files) {
    const source = file === 'public/index.html' ? html : await readFile(file, 'utf8');
    const tags = source.match(/<select\b[^>]*>/g) || [];
    assert.ok(tags.length > 0, `${file} should declare a select`);
    for (const tag of tags) {
      assert.match(tag, /\bbp-select\b/, `${file} select is missing bp-select: ${tag}`);
    }
  }

  const slice = await readFile('public/assets/slice2.css', 'utf8');
  assert.doesNotMatch(slice, /\.s2-rules-select \{[^}]*appearance/);
  assert.doesNotMatch(slice, /\.s2-records-filters select \{[^}]*background-position/);
  assert.doesNotMatch(slice, /\.s2-rival-pick select \{[^}]*background-position/);
});
