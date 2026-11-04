const test = require('node:test');
const assert = require('node:assert');
const { extractDecisions, findRelated } = require('../src/match');

test('extracts DECISION lines with rationale', () => {
  const d = extractDecisions('hi\nDECISION: Use Postgres for the ledger because we need transactions\n- decided: no GraphQL');
  assert.equal(d.length, 2);
  assert.equal(d[0].what, 'Use Postgres for the ledger');
  assert.equal(d[0].why, 'we need transactions');
  assert.equal(d[1].what, 'no GraphQL');
});

test('matches a reopened question to the prior decision', () => {
  const decisions = [
    { id: 1, what: 'Use Postgres for the ledger', why: 'need transactions' },
    { id: 2, what: 'Ship mobile app after web GA', why: 'team size' },
  ];
  const r = findRelated('Should we switch the ledger from Postgres to MongoDB?', decisions);
  assert.equal(r[0].id, 1);
  assert.equal(r.length, 1);
});

test('unrelated text matches nothing', () => {
  assert.equal(findRelated('Fix typo in footer', [{ what: 'Use Postgres for the ledger', why: '' }]).length, 0);
});
