import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Records = require('../public/assets/records-logic.js');
const Scorebook = require('../public/assets/scorebook.js');

const helpers = {
  configs: Object.fromEntries(Records.GAMES.map((game) => [game.id, {winLow: game.winLow}])),
  getDisplayPlayers(match) {
    const seen = new Set();
    const named = [];
    const add = (player) => {
      if (!player || seen.has(player)) return;
      seen.add(player);
      named.push(player);
    };
    (match.originalRoster || Object.keys(match.totals || {})).forEach(add);
    (match.retired || []).forEach((player) => {
      if (match.totals?.[player] !== undefined || (match.originalRoster || []).includes(player)) add(player);
    });
    return named;
  },
  sortPlayersByTotal(players, totals, cfg) {
    return [...players].sort((a, b) => {
      const diff = cfg.winLow ? (totals[a] || 0) - (totals[b] || 0) : (totals[b] || 0) - (totals[a] || 0);
      return diff || String(a).localeCompare(String(b));
    });
  },
  competitionPlaces: Scorebook.competitionPlaces,
  scorebook: Scorebook
};

function placesOf(podium) {
  return podium.places.map((slot) => ({
    place: slot.place,
    names: slot.people.map((person) => person.name)
  }));
}

test('lowest-wins Five Crowns podium uses Records ranking helpers', () => {
  const match = {
    game: 'Five Crowns',
    completed: true,
    winners: ['Megan'],
    originalRoster: ['Matt', 'Megan', 'Cat', 'Mike'],
    totals: {Matt: 40, Megan: 12, Cat: 28, Mike: 33}
  };
  const podium = Records.nightPodium(match, helpers);
  assert.equal(podium.incomplete, false);
  assert.deepEqual(placesOf(podium), [
    {place: 1, names: ['Megan']},
    {place: 2, names: ['Cat']},
    {place: 3, names: ['Mike']}
  ]);
});

test('highest-wins 818 podium uses the same helper', () => {
  const match = {
    game: '818',
    completed: true,
    winners: ['Duke'],
    originalRoster: ['Megan', 'Matt', 'Duke', 'Cat'],
    totals: {Megan: 40, Matt: 55, Duke: 71, Cat: 22}
  };
  assert.deepEqual(placesOf(Records.nightPodium(match, helpers)), [
    {place: 1, names: ['Duke']},
    {place: 2, names: ['Matt']},
    {place: 3, names: ['Megan']}
  ]);
});

test('tie for first shares 1st and skips 2nd', () => {
  const match = {
    game: 'Flip 7 Vengeance',
    completed: true,
    winners: ['Megan', 'Matt'],
    originalRoster: ['Megan', 'Matt', 'Cat', 'Mike'],
    totals: {Megan: 35, Matt: 35, Cat: 20, Mike: 20}
  };
  const podium = Records.nightPodium(match, helpers);
  assert.deepEqual(placesOf(podium), [
    {place: 1, names: ['Matt', 'Megan']},
    {place: 3, names: ['Cat', 'Mike']}
  ]);
});

test('tie for third still shows both 3rd avatars', () => {
  const match = {
    game: 'Wizard',
    completed: true,
    winners: ['Megan'],
    originalRoster: ['Megan', 'Matt', 'Cat', 'Mike'],
    totals: {Megan: 80, Matt: 60, Cat: 40, Mike: 40}
  };
  assert.deepEqual(placesOf(Records.nightPodium(match, helpers)), [
    {place: 1, names: ['Megan']},
    {place: 2, names: ['Matt']},
    {place: 3, names: ['Cat', 'Mike']}
  ]);
});

test('two-player match shows only the places that exist', () => {
  const match = {
    game: 'Beat the Heat',
    completed: true,
    winners: ['Cat'],
    originalRoster: ['Cat', 'Mike'],
    totals: {Cat: 18, Mike: 41}
  };
  assert.deepEqual(placesOf(Records.nightPodium(match, helpers)), [
    {place: 1, names: ['Cat']},
    {place: 2, names: ['Mike']}
  ]);
});

test('retired players stay on the podium from the saved record', () => {
  const match = {
    game: 'Five Crowns',
    completed: true,
    winners: ['Megan'],
    retired: ['Mike'],
    originalRoster: ['Megan', 'Matt', 'Mike'],
    totals: {Megan: 10, Matt: 22, Mike: 18}
  };
  const podium = Records.nightPodium(match, helpers);
  assert.deepEqual(placesOf(podium), [
    {place: 1, names: ['Megan']},
    {place: 2, names: ['Mike']},
    {place: 3, names: ['Matt']}
  ]);
  assert.equal(podium.places[1].people[0].retired, true);
});

test('incomplete nights have no podium', () => {
  const match = {
    game: 'Five Crowns',
    completed: false,
    winners: [],
    originalRoster: ['Megan', 'Matt', 'Cat'],
    totals: {Megan: 8, Matt: 4, Cat: 12},
    currentRound: 3
  };
  const podium = Records.nightPodium(match, helpers);
  assert.equal(podium.incomplete, true);
  assert.deepEqual(podium.places, []);
});

test('Rook podium uses player totals so the winning partners share 1st', () => {
  const match = {
    game: 'Rook',
    completed: true,
    winners: ['Megan', 'Matt'],
    retired: ['Mike'],
    originalRoster: ['Megan', 'Matt', 'Cat', 'Mike'],
    totals: {Megan: 220, Matt: 220, Cat: 180, Mike: 180}
  };
  const podium = Records.nightPodium(match, helpers);
  assert.deepEqual(placesOf(podium), [
    {place: 1, names: ['Matt', 'Megan']},
    {place: 3, names: ['Cat', 'Mike']}
  ]);
});
