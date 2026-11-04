// Pure decision-matching logic (no Forge deps) so it is unit-testable.
const STOP = new Set(('a an the and or but if then else of to in on for with by from at as is are was were be been ' +
  'it this that these those we our you your they them i me my should would could can will do does did not no ' +
  'use using used how what why when which who about into over under than so just also more most').split(' '));

function tokens(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .map(t => t.replace(/^-+|-+$/g, ''))
    .filter(t => t.length > 2 && !STOP.has(t))
    .map(t => t.replace(/(ing|ed|es|s)$/, ''));
}

// Extract decisions from free text: lines beginning "DECISION:" (Jira comment / Confluence page).
function extractDecisions(text) {
  const out = [];
  for (const line of (text || '').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:[*-]\s*)?(?:decision|decided)\s*[:\-]\s*(.+)$/i);
    if (!m) continue;
    const body = m[1].trim();
    const [what, why] = body.split(/\s+because\s+|\s+why:\s*/i);
    out.push({ what: what.trim(), why: (why || '').trim() });
  }
  return out;
}

function score(queryText, decision) {
  const q = new Set(tokens(queryText));
  const d = tokens(`${decision.what} ${decision.why} ${(decision.tags || []).join(' ')}`);
  if (!q.size || !d.length) return 0;
  const dset = new Set(d);
  let hit = 0;
  for (const t of dset) if (q.has(t)) hit++;
  return hit / Math.sqrt(q.size * dset.size);
}

function findRelated(queryText, decisions, { limit = 5, threshold = 0.18 } = {}) {
  return decisions.map(d => ({ ...d, score: +score(queryText, d).toFixed(3) }))
    .filter(d => d.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { tokens, extractDecisions, score, findRelated };
