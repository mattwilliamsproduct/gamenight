import {attachDemoRecordNights, demoBookHasFullRecordNights} from './try-demo-records.mjs';

export {attachDemoRecordNights, demoBookHasFullRecordNights};

export const QA_PORCH_CAST = Object.freeze([
  'Megan', 'Matt', 'Cat', 'Mike', 'Vikki', 'Duke',
  'Brick', 'Linda', 'Michelle', 'Alexis', 'Ethan', 'Diana'
]);

export const DEMO_CAST = Object.freeze([
  'Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix',
  'June', 'Marco', 'Iris', 'Quinn', 'Vera', 'Hugo'
]);

function castMap() {
  const map = Object.create(null);
  QA_PORCH_CAST.forEach((from, index) => {
    map[from] = DEMO_CAST[index] || from;
  });
  return map;
}

export function renameDemoText(text, map = castMap()) {
  if (typeof text !== 'string' || !text) return text;
  let next = text;
  Object.keys(map)
    .sort((a, b) => b.length - a.length)
    .forEach((from) => {
      if (next.includes(from)) next = next.split(from).join(map[from]);
    });
  return next;
}

export function isPlaceholderAvatar(value) {
  return /neutral-\d+\.svg(?:\?|#|$)/i.test(String(value || ''))
    || /silhouette-[a-z0-9-]+\.png(?:\?|#|$)/i.test(String(value || ''));
}

export function isCharacterAvatarRef(value) {
  if (typeof value !== 'string' || !value) return false;
  if (isPlaceholderAvatar(value)) return false;
  return /(?:^|\/)avatars\//i.test(value) || /\.png(?:\?|#|$)/i.test(value);
}


const NEUTRAL_DEMO_AVATARS = Object.freeze([
  'neutral-01.svg',
  'neutral-02.svg',
  'neutral-03.svg',
  'neutral-04.svg',
  'neutral-05.svg',
  'neutral-06.svg',
  'neutral-07.svg',
  'neutral-08.svg',
  'neutral-09.svg',
  'neutral-10.svg',
  'neutral-11.svg',
  'neutral-12.svg'
]);

export function applyNeutralDemoAvatars(book) {
  if (!book || typeof book !== 'object') return book;
  const names = [...new Set([
    ...(book.allPlayers || []),
    ...(book.players || []),
    ...Object.keys(book.playerProfiles || {})
  ])].filter(Boolean);
  const profiles = { ...(book.playerProfiles || {}) };
  names.forEach((name, index) => {
    const prev = profiles[name] || {};
    const avatar = isCharacterAvatarRef(prev.avatar) || isPlaceholderAvatar(prev.avatar) ? '' : (prev.avatar || '');
    profiles[name] = {
      ...prev,
      avatar,
      color: prev.color || ((index % 8) + 1)
    };
  });
  book.playerProfiles = profiles;
  return book;
}

export function remapDemoBook(data) {
  const map = castMap();
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out = {};
      Object.keys(node).forEach((key) => {
        if (key === 'avatar') return;
        const nextKey = renameDemoText(key, map);
        const value = walk(node[key]);
        if (isCharacterAvatarRef(value)) return;
        out[nextKey] = value;
      });
      return out;
    }
    if (typeof node === 'string') {
      if (isCharacterAvatarRef(node)) return '';
      return renameDemoText(node, map);
    }
    return node;
  };
  return walk(data);
}

export function isCanastaNight(row) {
  return !!(row && /Hand and Foot|Canasta/i.test(String(row.game || '')));
}

export function attachDemoCanastaNight(seed, qaScenarios) {
  const book = seed && typeof seed === 'object' ? seed : {};
  const history = Array.isArray(book.history) ? book.history.slice() : [];
  if (history.some(isCanastaNight)) {
    book.history = history;
    return book;
  }
  const source = qaScenarios && qaScenarios['records-book'] && qaScenarios['records-book'].data;
  const canasta = (source && Array.isArray(source.history) ? source.history : []).find(isCanastaNight);
  if (canasta) history.push(JSON.parse(JSON.stringify(canasta)));
  book.history = history;
  return book;
}

export function buildDemoBook(qaScenarios) {
  const seed = qaScenarios && qaScenarios['demo-seed'] && qaScenarios['demo-seed'].data;
  if (!seed) throw new Error('try-demo seed missing');
  const cloned = attachDemoCanastaNight(JSON.parse(JSON.stringify(seed)), qaScenarios);
  const remapped = applyNeutralDemoAvatars(remapDemoBook(cloned));
  return attachDemoRecordNights(remapped);
}

export function demoBookHasPorchCast(blob) {
  const text = typeof blob === 'string' ? blob : JSON.stringify(blob || '');
  if (!text) return false;
  const visible = text.replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi, '');
  return QA_PORCH_CAST.some((name) => visible.includes(name));
}
