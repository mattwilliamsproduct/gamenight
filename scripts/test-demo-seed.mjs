import assert from 'node:assert/strict';
import test from 'node:test';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {validateScenario} from '../public/qa/fixture-rules.mjs';
import {
  DEMO_FLAG,
  DEMO_VERSION,
  DEMO_VIEW_IDS,
  applyNeutralDemoProfiles,
  buildDemoPayload,
  decideDemoAction,
  demoHostAllowed,
  deviceHasSavedData,
  stripDemoSearch,
  writeDemoPayload
} from '../public/assets/demo-seed.mjs';

function memoryStorage(start = {}) {
  const data = {...start};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    raw: data
  };
}

test('demo-seed gallery fixture is rule-valid and covers all six games', () => {
  assert.ok(QA_SCENARIOS['demo-seed'], 'demo-seed scenario missing');
  const issues = validateScenario('demo-seed', QA_SCENARIOS['demo-seed']);
  assert.deepEqual(issues, [], issues.join('\n'));
  const history = QA_SCENARIOS['demo-seed'].data.history;
  const games = new Set(history.map((match) => match.game));
  ['Five Crowns', 'Wizard', '818', 'Flip 7 Vengeance', 'Beat the Heat', 'Rook'].forEach((game) => {
    assert.ok(games.has(game), `demo-seed history missing ${game}`);
  });
  assert.ok(history.some((match) => match.game === '818' && match.assistedMatch === true), 'assisted 818 missing');
  assert.ok(history.some((match) => (match.retired || []).includes('Mike')), 'retired Mike missing');
  assert.ok(history.some((match) => match.game === 'Rook' && match.rounds?.[0]?.rookBid === 90), 'Rook contracts missing');
  assert.ok(history.some((match) => match.completed === false), 'incomplete night missing');
  assert.ok(history.some((match) => (match.winners || []).length > 1), 'joint win missing');
  assert.equal(QA_SCENARIOS['demo-seed'].data.currentGame?.name, 'Five Crowns');
  const remapped = applyNeutralDemoProfiles(JSON.parse(JSON.stringify(QA_SCENARIOS['demo-seed'].data)));
  Object.values(remapped.playerProfiles).forEach((profile) => {
    assert.match(profile.avatar, /^neutral-\d{2}\.svg$/);
  });
  assert.equal(buildDemoPayload().playerProfiles.Linda.avatar, 'neutral-08.svg');
  const live = QA_SCENARIOS['demo-seed'].data.currentGame;
  const r8 = live.rounds.find((round) => round.round === 8);
  const r8Zeros = live.originalRoster.filter((player) => Number(r8.scores[player]) === 0);
  assert.equal(r8Zeros.length, 1, `live R8 should have one go-out, got ${r8Zeros.join(',')}`);
  assert.ok(r8Zeros[0] === 'Matt', 'Matt goes out on live R8');
  const rook = history.find((match) => match.game === 'Rook');
  assert.equal(rook.rounds[0].scores.Megan, rook.rounds[0].scores.Matt);
  assert.equal(rook.rounds[0].scores.Cat, rook.rounds[0].scores.Mike);
});

test('production host ignores ?demo and never writes', () => {
  assert.equal(demoHostAllowed('cardknight.vercel.app'), false);
  assert.equal(demoHostAllowed('gamenight.vercel.app'), false);
  assert.equal(demoHostAllowed('localhost'), true);
  assert.equal(
    demoHostAllowed('gamenight-git-cursor-relea-23a825-mattwilliamsproducts-projects.vercel.app'),
    true
  );
  const storage = memoryStorage();
  const action = decideDemoAction({
    hostname: 'cardknight.vercel.app',
    search: '?demo&view=home',
    storage
  });
  assert.equal(action.status, 'ignored');
  assert.equal(action.persist, false);
  assert.equal(storage.getItem('gn_history'), null);
  assert.equal(storage.getItem(DEMO_FLAG), null);
});

test('empty preview device can seed; real history is left alone', () => {
  const empty = memoryStorage();
  const seed = decideDemoAction({
    hostname: '127.0.0.1',
    search: '?demo',
    storage: empty
  });
  assert.equal(seed.status, 'seeded');
  assert.equal(seed.persist, true);
  writeDemoPayload(empty, seed.seed);
  assert.equal(empty.getItem(DEMO_FLAG), DEMO_VERSION);
  assert.ok(deviceHasSavedData(empty));

  const real = memoryStorage({
    gn_history: JSON.stringify([{id: 1, game: 'Wizard', date: '1/1/2026', totals: {Matt: 10}, winners: ['Matt'], rounds: [], originalRoster: ['Matt']}]),
    gn_current: null
  });
  const blocked = decideDemoAction({
    hostname: '127.0.0.1',
    search: '?demo&view=home',
    storage: real
  });
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.persist, false);
  assert.equal(real.getItem(DEMO_FLAG), null);
  assert.ok(!String(real.getItem('gn_history') || '').includes('Flip 7'));
});

test('already-seeded demo opens a view without rewriting the flag payload', () => {
  const storage = memoryStorage();
  writeDemoPayload(storage, buildDemoPayload());
  const before = storage.getItem('gn_history');
  const again = decideDemoAction({
    hostname: 'localhost',
    search: '?demo&view=records-shame',
    storage
  });
  assert.equal(again.status, 'seeded');
  assert.equal(again.persist, false);
  assert.equal(again.view, 'records-shame');
  assert.equal(storage.getItem('gn_history'), before);
});

test('demo view ids stay listed and ?demo is stripped from the URL', () => {
  assert.ok(DEMO_VIEW_IDS.includes('home'));
  assert.ok(DEMO_VIEW_IDS.includes('lifepreserver-after'));
  assert.ok(DEMO_VIEW_IDS.includes('lifepreserver-low'));
  assert.ok(DEMO_VIEW_IDS.includes('empty-records'));
  assert.ok(DEMO_VIEW_IDS.includes('records-overview'));
  assert.ok(DEMO_VIEW_IDS.includes('records-explore'));
  assert.ok(DEMO_VIEW_IDS.includes('records-nights'));
  assert.equal(stripDemoSearch('https://example.test/?demo&view=home'), '/');
  assert.equal(stripDemoSearch('https://example.test/?demo&view=records&standings=1'), '/?standings=1');
  assert.equal(stripDemoSearch('https://example.test/?demo&art=dusk&logo=dusk'), '/?demo&art=dusk&logo=dusk');
  assert.equal(stripDemoSearch('https://example.test/?demo&home=a'), '/?demo&home=a');
  assert.equal(stripDemoSearch('https://example.test/?demo&view=home&home=b'), '/?demo&home=b');
});
