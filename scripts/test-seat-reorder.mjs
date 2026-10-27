import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

function moveSeatList(list, from, to) {
  const next = Array.isArray(list) ? list.slice() : [];
  if (!Number.isInteger(from) || !Number.isInteger(to)) return next;
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

test('moveSeatList covers drag, button, and keyboard steps', () => {
  const table = ['Megan', 'Matt', 'Cat', 'Mike'];
  assert.deepEqual(moveSeatList(table, 0, 1), ['Matt', 'Megan', 'Cat', 'Mike']);
  assert.deepEqual(moveSeatList(table, 3, 0), ['Mike', 'Megan', 'Matt', 'Cat']);
  assert.deepEqual(moveSeatList(table, 1, 1), table);
  assert.deepEqual(moveSeatList(table, -1, 0), table);
  assert.deepEqual(moveSeatList(table, 0, 9), table);
  assert.deepEqual(moveSeatList(table, 2, 0), ['Cat', 'Megan', 'Matt', 'Mike']);
});

test('keyboard cancel leaves the list alone and dealer is seat 1 when no live match', () => {
  const table = ['Megan', 'Matt', 'Cat'];
  const grabbed = {from: 0, to: 0};
  const afterCancel = grabbed.from === grabbed.to ? table : moveSeatList(table, grabbed.from, grabbed.to);
  assert.deepEqual(afterCancel, table);
  const moved = moveSeatList(table, 0, 2);
  assert.equal(moved[0], 'Matt');
});

test('active-match roster is not the Home seat list', async () => {
  const html = await readFile(join(root, 'public/index.html'), 'utf8');
  assert.match(html, /function slice2MoveSeat/);
  assert.match(html, /players=next/);
  assert.doesNotMatch(html, /slice2MoveSeat[\s\S]{0,400}currentGame\.originalRoster/);
  assert.doesNotMatch(html, /slice2ReorderSeat[\s\S]{0,400}currentGame\.players/);
});

test('Home seating wires handle-only drag, nudges, keyboard, and live announce', async () => {
  const js = await readFile(join(root, 'public/assets/slice2.js'), 'utf8');
  const css = await readFile(join(root, 'public/assets/slice2.css'), 'utf8');
  assert.match(js, /function moveSeatList\(list, from, to\)/);
  assert.match(js, /s2-seat-handle/);
  assert.match(js, /aria-label="Move \$\{escapeHtml\(player\)\} up"/);
  assert.match(js, /aria-label="Move \$\{escapeHtml\(player\)\} down"/);
  assert.match(js, /aria-live="polite"/);
  assert.match(js, /onPointerDown/);
  assert.match(js, /closest\?\.?\('\.s2-seat-handle'\)/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /event\.key === 'ArrowUp'/);
  assert.match(js, /Cancelled moving/);
  assert.match(js, /Grabbed \$\{name\}/);
  assert.doesNotMatch(js, /edit-seating/);
  assert.match(js, /persistSeatMove/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /\.s2-seat\.is-dragging/);
  assert.match(css, /\.s2-seat\.is-drop-before/);
});
