import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Games = require('../public/assets/game-registry.js');
const Scorebook = require('../public/assets/scorebook.js');

test('each shelf game has a card-back thumbnail helper', () => {
  ['Five Crowns', '818', 'Wizard', 'Flip 7 Vengeance', 'Beat the Heat', 'Hand and Foot', 'Rook'].forEach((id) => {
    const src = Games.thumbnailSrc(id);
    assert.match(src, /assets\/cards\/.+\.webp$/, `${id} missing card-back`);
  });
  assert.equal(Games.thumbnailSrc('Unknown Game'), '');
});

test('Rook is on the picker with Canasta', () => {
  const visible = Games.visibleGames('');
  const ids = visible.map((game) => game.id);
  assert.ok(ids.includes('Hand and Foot'));
  assert.equal(Games.displayName('Hand and Foot'), 'Canasta');
  assert.equal(Games.winLow('Hand and Foot'), false);
  assert.ok(ids.includes('Rook'));
  assert.equal(Games.gameById('Rook').hidden, false);
  assert.equal(Games.displayName('Rook'), 'Rook');
});

test('a demo query does not hide Rook', () => {
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?demo'), true);
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?games=rook'), true);
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?demo&games=rook'), true);
  const ids = Games.visibleGames('?demo&games=rook').map((game) => game.id);
  assert.ok(ids.includes('Rook'));
  assert.ok(ids.includes('Hand and Foot'));
});

test('Start follows each game player range and leaves Wizard uncapped', () => {
  assert.deepEqual(Games.seatLimit('Five Crowns', 14), {
    ok: false,
    message: 'Five Crowns plays up to 7. Unseat 7 players.'
  });
  assert.deepEqual(Games.seatLimit('Five Crowns', 7), { ok: true, message: '' });
  assert.deepEqual(Games.seatLimit('Hand and Foot', 1), {
    ok: false,
    message: 'Canasta needs at least 2 players. Seat 1 more.'
  });
  assert.deepEqual(Games.seatLimit('Hand and Foot', 0, 'seat'), {ok: true, message: ''});
  assert.deepEqual(Games.seatLimit('Hand and Foot', 1, 'seat'), {ok: true, message: ''});
  assert.equal(Games.seatLimit('Hand and Foot', 7, 'seat').ok, false);
  assert.equal(Games.seatLimit('Hand and Foot', 7).ok, false);
  assert.equal(Games.seatLimit('Rook', 3).ok, false);
  assert.equal(Games.seatLimit('Rook', 7).ok, true);
  assert.equal(Games.seatLimit('Rook', 4).ok, true);
  const index = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(index, /Call-your-partner Rook is usually played with 4-6 players\. Start anyway\?/);
  const slice = readFileSync(new URL('../public/assets/slice2.js', import.meta.url), 'utf8');
  assert.match(slice, /seatLimit\(selected, seated \+ addPicks\.size, 'seat'\)/);
  assert.match(slice, /seatLimit\(selected, seated\)/);
  ['Wizard', '818', 'Flip 7 Vengeance', 'Beat the Heat'].forEach((id) => {
    assert.equal(Games.seatLimit(id, 8).ok, true, `${id} stays startable at 8`);
    assert.equal(Games.seatLimit(id, 14).ok, true, `${id} has no layout cap`);
  });
});

test('old Rook history still has a registry row and high-score win direction', () => {
  assert.equal(Games.displayName('Rook'), 'Rook');
  assert.equal(Games.winLow('Rook'), false);
  const match = {
    id: 'rook-history-1',
    game: 'Rook',
    completed: true,
    originalRoster: ['Megan', 'Matt', 'Cat', 'Mike'],
    totals: { Megan: 320, Matt: 320, Cat: 180, Mike: 180 },
    winners: ['Megan', 'Matt'],
    rounds: [{
      round: 1,
      scores: { Megan: 110, Matt: 110, Cat: 90, Mike: 90 },
      rookBid: 90,
      rookBidder: 'Megan',
      rookPartner: 'Matt',
      rookMadeIt: true
    }]
  };
  assert.equal(Scorebook.isCompletedHistoryMatch(match), true);
  const names = [...Scorebook.participantNames(match)];
  assert.ok(names.includes('Megan'));
  assert.ok(names.includes('Matt'));
  assert.equal(Games.displayName(match.game), 'Rook');
});

test('every Unseat count is seated minus the game max', () => {
  assert.equal(Games.seatExtra('Five Crowns', 8), 1);
  assert.equal(Games.seatExtra('Five Crowns', 7), 0);
  assert.equal(Games.seatExtra('Hand and Foot', 8), 2);
  assert.equal(Games.seatExtra('Wizard', 12), 0);
  assert.equal(Games.seatRoomMessage('Five Crowns', 8), Games.seatLimit('Five Crowns', 8).message);
  assert.equal(Games.seatRoomMessage('Five Crowns', 8), 'Five Crowns plays up to 7. Unseat 1 player.');
  assert.equal(Games.seatRoomMessage('Hand and Foot', 8), 'Canasta plays up to 6. Unseat 2 players.');
  assert.equal(Games.seatRoomMessage('Five Crowns', 7), 'Five Crowns plays up to 7. The table is full.');
  assert.equal(Games.seatRoomMessage('Five Crowns', 6), '');
});
