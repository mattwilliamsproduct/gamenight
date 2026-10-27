import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(rootDir, 'public', 'index.html'), 'utf8');
const require = createRequire(import.meta.url);
const Backup = require(join(rootDir, 'public', 'assets', 'backup.js'));

const SEATED = ['Megan', 'Matt', 'Mike'];
const PROFILES = {
  Megan: {},
  Matt: {},
  Cat: {},
  Mike: {},
  Vikki: {},
  Duke: {},
  Brick: {},
  Linda: {},
  Michelle: {}
};

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed ${name}`);
}

function makeRosterSandbox({ query = 'm', seated = SEATED, profiles = PROFILES } = {}) {
  const errors = {};
  const hidden = {};
  const context = {
    allPlayers: [...seated],
    playerProfiles: { ...profiles },
    currentGame: { originalRoster: [...seated] },
    players: [...seated],
    document: {
      getElementById(id) {
        if (id === 'midgame-add-player-input' || id === 'quick-add-player') {
          return { value: query };
        }
        if (id.endsWith('-player-name-error')) {
          if (!errors[id]) {
            const el = {
              textContent: '',
              classList: {
                add(name) { if (name === 'hidden') hidden[id] = true; },
                remove(name) { if (name === 'hidden') hidden[id] = false; }
              }
            };
            errors[id] = el;
          }
          return errors[id];
        }
        return null;
      }
    }
  };
  const names = [
    'playerNameWriteError',
    'showPlayerNameWriteError',
    'rejectUnsavablePlayerName',
    'collectIncomingPlayerNames',
    'incomingPlayerNameWriteError',
    'getKnownPlayerNames',
    'getPlayerSuggestEls',
    'getPlayerSuggestionMatches'
  ];
  const constMatch = html.match(/const PLAYER_NAME_COMMA_MSG='[^']+';/);
  if (!constMatch) throw new Error('missing PLAYER_NAME_COMMA_MSG');
  vm.runInNewContext([constMatch[0], ...names.map(name => extractFunction(html, name))].join('\n'), context);
  return { context, errors, hidden };
}

test('source spreads profile names instead of nesting the key array', () => {
  assert.match(html, /\[\.\.\.allPlayers,\s*\.\.\.Object\.keys\(playerProfiles\|\|\{\}\)\s*\]/);
  assert.doesNotMatch(html, /\[\.\.\.allPlayers,Object\.keys\(playerProfiles\|\|\{\}\)\]/);
});

test('mid-game typing m suggests only Michelle and no comma names', () => {
  const { context } = makeRosterSandbox({ query: 'm' });
  const matches = [...context.getPlayerSuggestionMatches('midgame')];
  assert.deepEqual(matches, ['Michelle']);
  assert.equal(matches.some(name => String(name).includes(',')), false);
});

test('Home quick-add typing m suggests only Michelle and no comma names', () => {
  const { context } = makeRosterSandbox({ query: 'm' });
  const matches = [...context.getPlayerSuggestionMatches('home')];
  assert.deepEqual(matches, ['Michelle']);
  assert.equal(matches.some(name => String(name).includes(',')), false);
});

test('a comma name is rejected at the write boundary', () => {
  const { context, errors, hidden } = makeRosterSandbox();
  assert.equal(context.playerNameWriteError('Michelle'), '');
  assert.equal(context.playerNameWriteError('Megan,Matt'), 'Use one name — commas aren’t allowed.');
  assert.equal(context.playerNameWriteError(['Megan', 'Matt']), 'Use one name — commas aren’t allowed.');
  assert.equal(context.rejectUnsavablePlayerName('Megan,Matt', 'home-player-name-error'), true);
  assert.equal(errors['home-player-name-error'].textContent, 'Use one name — commas aren’t allowed.');
  assert.equal(hidden['home-player-name-error'], false);
  assert.equal(context.rejectUnsavablePlayerName('Michelle', 'home-player-name-error'), false);
  const incoming = Backup.parseBackup(JSON.stringify({
    allPlayers: ['Megan', 'Matt,Cat'],
    players: ['Megan'],
    playerProfiles: { Megan: {} }
  }));
  assert.equal(context.incomingPlayerNameWriteError(incoming), 'Use one name — commas aren’t allowed.');
  assert.equal(context.incomingPlayerNameWriteError({
    allPlayers: ['Megan'],
    players: ['Megan'],
    playerProfiles: { Megan: {} }
  }), '');
});

test('Home, mid-game, rename, and import write paths call the comma guard', () => {
  const add = extractFunction(html, 'addPlayerToAll');
  const mid = extractFunction(html, 'submitAddPlayerMidGame');
  const rename = extractFunction(html, 'doRenamePlayer');
  const importFn = extractFunction(html, 'importBackupText');
  assert.match(add, /rejectUnsavablePlayerName\(name,'home-player-name-error'\)/);
  assert.match(mid, /rejectUnsavablePlayerName\(name,'midgame-player-name-error'\)/);
  assert.match(rename, /rejectUnsavablePlayerName\(newName,'rename-player-name-error'\)/);
  assert.match(importFn, /incomingPlayerNameWriteError\(incoming\)/);
});
