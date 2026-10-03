const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, overrides = {}) {
 const module = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 new Function('require', 'module', 'exports', code)(name => overrides[name] ?? require(name), module, module.exports);
 return module.exports;
}
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value) }; };
let sequence = 0;
const uuid = () => `12345678-1234-1234-1234-${String(++sequence).padStart(12, '0')}`;
test('anonymous browser identity persists and is separate for each organisation', () => {
 const identity = load('src/lib/siteVisitorIdentity.ts'); const store = storage();
 const first = identity.getVisitorIdentity(store, 'org', uuid);
 assert.equal(identity.getVisitorIdentity(store, 'org', uuid), first);
 assert.notEqual(identity.getVisitorIdentity(store, 'other', uuid), first);
});
test('reload and repeated effects reuse an event while navigation gets a new event', () => {
 const store = storage(); let identity = load('src/lib/siteVisitorIdentity.ts');
 const first = identity.getPageEventIdentity(store, 'org', 'default', '/', false, uuid);
 assert.equal(identity.getPageEventIdentity(store, 'org', 'default', '/', false, uuid), first);
 identity = load('src/lib/siteVisitorIdentity.ts');
 assert.equal(identity.getPageEventIdentity(store, 'org', 'default', '/', true, uuid), first);
 const article = identity.getPageEventIdentity(store, 'org', 'article-key', '/articles/id', false, uuid);
 assert.notEqual(article, first);
 assert.notEqual(identity.getPageEventIdentity(store, 'org', 'back-home', '/', false, uuid), first);
});
test('service removes queries and fragments and propagates RPC failures', async () => {
 const calls = [];
 const service = load('src/services/siteVisitorService.ts', { '../lib/supabaseClient': { supabase: { rpc: async (name, args) => { calls.push([name,args]); return { data: 4, error: name === 'get_site_visitor_stats' ? new Error('Denied') : null }; } } } });
 await service.recordVisitorPage('org', 'visitor', 'event', '/articles/id/?email=private#test');
 assert.equal(calls[0][1].p_path, '/articles/id');
 assert.equal(await service.getPublicVisitorCount('org'), 4);
 await assert.rejects(service.getVisitorStats('other'), /Denied/);
});
test('tracker waits for consent, excludes known bots and removes listeners/timer', async () => {
 let effect, consent = 'denied', trackCalls = 0, interval, listener, removed = 0;
 const hooks = { ...React, useState: () => [null, () => {}], useEffect: fn => { effect = fn; } };
 global.window = { setInterval: fn => { interval = fn; return 1; }, clearInterval: () => removed++, addEventListener: (name, fn) => { listener = fn; }, removeEventListener: () => removed++ };
 global.document = { hidden: false };
 const previousNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
 Object.defineProperty(global, 'navigator', { value: { userAgent: 'Browser' }, configurable: true });
 global.localStorage = storage(); global.sessionStorage = storage();
 try {
  const Counter = load('src/components/public/PublicVisitorCounter.tsx', { react: hooks, '../../lib/saasAnalytics': { getSaasAnalyticsConsent: () => consent }, '../../lib/siteVisitorIdentity': { getVisitorIdentity: () => 'visitor', getPageEventIdentity: () => 'event' }, '../../services/siteVisitorService': { normaliseVisitorPath: x => x, getPublicVisitorCount: async () => 1, recordVisitorPage: async () => trackCalls++ } }).PublicVisitorCounter;
  Counter({ organisationId: 'org', path: '/', navigationKey: 'default', showCount: true });
  const cleanup = effect(); await new Promise(setImmediate); assert.equal(trackCalls, 0);
  consent = 'granted'; listener(); await new Promise(setImmediate); assert.equal(trackCalls, 1);
  navigator.userAgent = 'SearchBot'; listener(); await new Promise(setImmediate); assert.equal(trackCalls, 1);
  cleanup(); assert.equal(removed, 2); assert.equal(typeof interval, 'function');
 } finally { for (const key of ['window','document','localStorage','sessionStorage']) delete global[key]; if (previousNavigator) Object.defineProperty(global, 'navigator', previousNavigator); else delete global.navigator; }
});
test('admin displays zero values and popular content without claiming historical data', () => {
 const stats = { visitors_today: 0, visitors_month: 5, visitors_total: 7, views_today: 0, views_month: 9, views_total: 11, started_at: null, popular: [{ path: '/media/id', title: 'Today match', views: 3 }] };
 let call = 0;
 const hooks = { ...React, useState: initial => [call++ === 0 ? stats : initial, () => {}], useEffect: () => {} };
 const Stats = load('src/components/admin/SiteVisitorStats.tsx', { react: hooks, '../../services/siteVisitorService': {} }).SiteVisitorStats;
 const html = renderToStaticMarkup(React.createElement(Stats, { organisationId: 'org' }));
 assert.match(html, /Visitors today/); assert.match(html, /Page views this month/); assert.match(html, /Today match/); assert.match(html, /first consenting visitor/);
});
