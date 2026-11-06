import assert from 'node:assert/strict';
import test from 'node:test';
import {QA_SCENARIOS} from '../public/qa/fixtures.mjs';
import {validateScenario} from '../public/qa/fixture-rules.mjs';

test('every gallery scenario is rule-valid', () => {
  const failures = [];
  for (const [id, scenario] of Object.entries(QA_SCENARIOS)) {
    validateScenario(id, scenario).forEach((issue) => failures.push(issue));
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});
