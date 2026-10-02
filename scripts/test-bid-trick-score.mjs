import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  const brace = html.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed ${name}`);
}

const source = [
  'calculate818Score',
  'calculateWizardScore',
  'actualsMatchingBidTrickScore',
  'pickBidTrickActual',
  'applyBidTrickScoreEdit'
].map(extractFunction).join('\n');

const sandbox = {};
vm.runInNewContext(`${source}\nthis.api={calculate818Score,calculateWizardScore,actualsMatchingBidTrickScore,pickBidTrickActual,applyBidTrickScoreEdit};`, sandbox);
const api = sandbox.api;

test('Wizard score matches the house formula', () => {
  assert.equal(api.calculateWizardScore(3, 3), 50);
  assert.equal(api.calculateWizardScore(0, 0), 20);
  assert.equal(api.calculateWizardScore(3, 5), -20);
  assert.equal(api.calculateWizardScore(4, 1), -30);
  assert.equal(api.calculate818Score(3, 3), 13);
  assert.equal(api.calculate818Score(3, 4), 4);
});

test('editing a Wizard score keeps the bid and a matching actual', () => {
  const round = { round: 5, bids: { Ann: 3 }, actuals: { Ann: 5 }, scores: { Ann: -20 } };
  const over = api.applyBidTrickScoreEdit('Wizard', round, 'Ann', -10, 5);
  assert.equal(over.status, 'matched');
  assert.equal(round.scores.Ann, -10);
  assert.equal(round.bids.Ann, 3);
  assert.equal(round.actuals.Ann, 4);

  const exact = { round: 4, bids: { Ann: 2 }, actuals: { Ann: 2 }, scores: { Ann: 40 } };
  const stay = api.applyBidTrickScoreEdit('Wizard', exact, 'Ann', 40, 4);
  assert.equal(stay.status, 'matched');
  assert.equal(exact.actuals.Ann, 2);
  assert.equal(api.calculateWizardScore(exact.bids.Ann, exact.actuals.Ann), exact.scores.Ann);
});

test('a Wizard score the locked bid cannot make is put back', () => {
  const round = { round: 3, bids: { Ann: 3 }, actuals: { Ann: 3 }, scores: { Ann: 50 } };
  const rejected = api.applyBidTrickScoreEdit('Wizard', round, 'Ann', 40, 3);
  assert.equal(rejected.status, 'rejected');
  assert.equal(round.scores.Ann, 50);
  assert.equal(round.actuals.Ann, 3);
  assert.equal(api.calculateWizardScore(3, 3), round.scores.Ann);
});

test('818 score edits follow the same bid and actual rule', () => {
  const made = { round: 8, bids: { Bea: 3 }, actuals: { Bea: 3 }, scores: { Bea: 13 } };
  const miss = api.applyBidTrickScoreEdit('818', made, 'Bea', 4, 8);
  assert.equal(miss.status, 'matched');
  assert.equal(made.actuals.Bea, 4);
  assert.equal(api.calculate818Score(3, 4), made.scores.Bea);

  const illegal = { round: 8, bids: { Bea: 3 }, actuals: { Bea: 3 }, scores: { Bea: 13 } };
  const rejected = api.applyBidTrickScoreEdit('818', illegal, 'Bea', 99, 8);
  assert.equal(rejected.status, 'rejected');
  assert.equal(illegal.scores.Bea, 13);
  assert.equal(illegal.actuals.Bea, 3);
});
