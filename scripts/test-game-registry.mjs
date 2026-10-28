import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Games = require('../public/assets/game-registry.js');
const Scorebook = require('../public/assets/scorebook.js');

test('Rook and Canasta are both on the picker', () => {
  const visible = Games.visibleGames('');
  const ids = visible.map((game) => game.id);
  assert.ok(ids.includes('Hand and Foot'));
  assert.equal(Games.displayName('Hand and Foot'), 'Canasta');
  assert.equal(Games.winLow('Hand and Foot'), false);
  assert.ok(ids.includes('Rook'));
  assert.equal(Games.gameById('Rook').hidden, false);
});

test('the hidden-game flag still honors ?demo&games= for a hidden row', () => {
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), ''), true);
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?demo'), true);
  assert.equal(Games.isHiddenGameVisible(Games.gameById('Rook'), '?demo&games=rook'), true);
  const ids = Games.visibleGames('?demo&games=rook').map((game) => game.id);
  assert.ok(ids.includes('Rook'));
  assert.ok(ids.includes('Hand and Foot'));
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
