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

test('Rook is hidden by default and Canasta is on the picker', () => {
  const visible = Games.visibleGames('');
  const ids = visible.map((game) => game.id);
  assert.ok(ids.includes('Hand and Foot'));
  assert.equal(Games.displayName('Hand and Foot'), 'Canasta');
  assert.equal(Games.winLow('Hand and Foot'), false);
  assert.equal(ids.includes('Rook'), false);
  assert.equal(Games.gameById('Rook').hidden, true);
});

test('Rook stays hidden when the URL has ?demo&games=rook', () => {
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?demo'), false);
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?games=rook'), false);
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?demo&games=rook'), false);
  const ids = Games.visibleGames('?demo&games=rook').map((game) => game.id);
  assert.equal(ids.includes('Rook'), false);
  assert.ok(ids.includes('Hand and Foot'));
  Games.revealHiddenGames('rook');
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook')), true);
  Games.revealHiddenGames('');
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook')), false);
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
  assert.equal(Games.seatLimit('Hand and Foot', 7).ok, false);
  assert.equal(Games.seatLimit('Rook', 3).ok, false);
  assert.equal(Games.seatLimit('Rook', 7).ok, false);
  assert.equal(Games.seatLimit('Rook', 4).ok, true);
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
