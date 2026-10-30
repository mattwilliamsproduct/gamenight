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

test('retired players leave the podium and stay Left early in standings', () => {
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
    {place: 2, names: ['Matt']}
  ]);
  const standings = Records.nightStandings(match, helpers);
  assert.deepEqual(standings.map((row) => ({name: row.name, place: row.place, leftEarly: !!row.leftEarly})), [
    {name: 'Megan', place: 1, leftEarly: false},
    {name: 'Matt', place: 2, leftEarly: false},
    {name: 'Mike', place: null, leftEarly: true}
  ]);
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

test('home nights podium fixture shows a tie and an incomplete night', async () => {
  const {QA_SCENARIOS} = await import('../public/qa/fixtures.mjs');
  const history = (QA_SCENARIOS['home-nights-podium'].data.history || []).slice(0, 4);
  const incomplete = history.filter((match) => match.completed === false);
  const ties = history.filter((match) => (match.winners || []).length > 1);
  assert.ok(incomplete.length >= 1, 'first four nights should include Incomplete');
  assert.ok(ties.length >= 1, 'first four nights should include a joint win');
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
    {place: 3, names: ['Cat']}
  ]);
  const left = Records.nightStandings(match, helpers).filter((row) => row.leftEarly);
  assert.deepEqual(left.map((row) => row.name), ['Mike']);
});

test('home podium markup uses readable 1st/2nd/3rd text chips, including ties', () => {
  const {readFileSync} = require('node:fs');
  const src = readFileSync(new URL('../public/assets/slice2.js', import.meta.url), 'utf8');
  assert.match(src, /function homePlaceLabel/);
  assert.match(src, /s2-podium-rank/);
  assert.match(src, /scoreboard-rank-badge/);
  assert.match(src, /'1st'/);
  assert.match(src, /'2nd'/);
  assert.match(src, /'3rd'/);
  assert.doesNotMatch(src, /s2-podium-badge/);

  const match = {
    game: 'Flip 7 Vengeance',
    completed: true,
    winners: ['Megan', 'Matt'],
    originalRoster: ['Megan', 'Matt', 'Cat', 'Mike'],
    totals: {Megan: 35, Matt: 35, Cat: 20, Mike: 20}
  };
  const podium = Records.nightPodium(match, helpers);
  assert.equal(podium.places[0].place, 1);
  assert.equal(podium.places[0].people.length, 2);
  // Both tied winners share place 1 so each chip reads 1st; home row label is Tied.
  const labels = podium.places.flatMap((slot) => {
    const ordinal = slot.place === 1 ? '1st' : slot.place === 2 ? '2nd' : slot.place === 3 ? '3rd' : `${slot.place}`;
    return slot.people.map((person) => ({name: person.name, label: ordinal, place: slot.place}));
  });
  assert.deepEqual(labels.filter((row) => row.place === 1).map((row) => row.label), ['1st', '1st']);
  assert.ok(labels.every((row) => /\d+(st|nd|rd|th)/.test(row.label)));
});
