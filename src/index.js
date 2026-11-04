const Resolver = require('@forge/resolver').default;
const { kvs } = require('@forge/kvs');
const api = require('@forge/api');
const { route } = api;
const { extractDecisions, findRelated } = require('./match');

const KEY = 'ledger';

async function load() { return (await kvs.get(KEY)) || []; }

async function add(items) {
  const ledger = await load();
  const seen = new Set(ledger.map(d => d.what.toLowerCase()));
  const fresh = items.filter(d => d.what && !seen.has(d.what.toLowerCase()))
    .map(d => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), ...d }));
  if (fresh.length) await kvs.set(KEY, ledger.concat(fresh).slice(-500));
  return fresh;
}

// Atlassian Document Format -> plain text.
function adfText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  const inner = (node.content || []).map(adfText).join(node.type === 'doc' ? '\n' : '');
  return ['paragraph', 'heading', 'listItem'].includes(node.type) ? inner + '\n' : inner;
}

async function getIssue(key) {
  const r = await api.asApp().requestJira(route`/rest/api/3/issue/${key}?fields=summary,description`);
  const j = await r.json();
  return { key, summary: j.fields?.summary || '', description: adfText(j.fields?.description) };
}

const resolver = new Resolver();

resolver.define('related', async ({ context }) => {
  const key = context.extension?.issue?.key;
  const issue = await getIssue(key);
  const ledger = await load();
  return {
    issue: key,
    matches: findRelated(`${issue.summary}\n${issue.description}`, ledger.filter(d => d.source !== key)),
    own: ledger.filter(d => d.source === key),
    total: ledger.length,
  };
});

resolver.define('record', async ({ payload, context }) => {
  const source = payload.source || context.extension?.issue?.key || '';
  return add([{ what: payload.what, why: payload.why || '', owner: context.accountId, source }]);
});

resolver.define('recordPage', async ({ context }) => {
  const id = context.extension?.content?.id;
  const r = await api.asUser().requestConfluence(route`/wiki/api/v2/pages/${id}?body-format=storage`);
  const j = await r.json();
  const text = (j.body?.storage?.value || '').replace(/<\/(p|li|h\d)>/g, '\n').replace(/<[^>]+>/g, '');
  const found = extractDecisions(text).map(d => ({ ...d, owner: context.accountId, source: j._links?.base ? j._links.base + j._links.webui : `page:${id}`, sourceTitle: j.title }));
  return { title: j.title, recorded: await add(found), found: found.length };
});

exports.resolver = resolver.getDefinitions();

// Trigger: comment containing "DECISION:" gets captured; new issue that reopens a decision gets a comment.
exports.onComment = async (event) => {
  const text = adfText(event.comment?.body);
  const found = extractDecisions(text);
  if (found.length) await add(found.map(d => ({ ...d, owner: event.comment?.author?.accountId, source: event.issue.key })));
};

exports.onIssue = async (event) => {
  const issue = await getIssue(event.issue.key);
  const matches = findRelated(`${issue.summary}\n${issue.description}`, await load(), { limit: 3, threshold: 0.3 });
  if (!matches.length) return;
  const lines = matches.map(m => `• ${m.what}${m.why ? ` — because ${m.why}` : ''} (${m.source || 'ledger'})`);
  await api.asApp().requestJira(route`/rest/api/3/issue/${event.issue.key}/comment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [
      { type: 'text', text: 'Already Decided: this looks related to existing decisions:\n' + lines.join('\n') }] }] } }),
  });
};

exports.findAction = async (payload) => {
  const matches = findRelated(payload.query || '', await load());
  return matches.length ? { matches } : { matches: [], note: 'No prior decision found for this topic.' };
};

exports.recordAction = async (payload) => ({ recorded: await add([{ what: payload.what, why: payload.why || '', source: payload.source || 'rovo' }]) });
