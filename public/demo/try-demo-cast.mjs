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

export function isCharacterAvatarRef(value) {
  if (typeof value !== 'string' || !value) return false;
  return /(?:^|\/)avatars\//i.test(value) || /\.png(?:\?|#|$)/i.test(value);
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
  return remapDemoBook(cloned);
}

export function demoBookHasPorchCast(blob) {
  const text = typeof blob === 'string' ? blob : JSON.stringify(blob || '');
  if (!text) return false;
  if (isCharacterAvatarRef(text)) return true;
  return QA_PORCH_CAST.some((name) => text.includes(name));
}
