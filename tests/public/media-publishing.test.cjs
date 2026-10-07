const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, overrides = {}) {
 const module = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
 new Function('require', 'module', 'exports', code)(name => overrides[name] ?? require(name), module, module.exports);
 return module.exports;
}
const logic = load('src/utils/publicMedia.ts');
const helpers = load('src/components/admin/Media/mediaHelpers.ts');
const { validateMedia } = load('src/components/admin/Media/mediaValidation.ts', { '../../../utils/publicMedia': logic, './mediaHelpers': helpers });
const form = extra => ({ title: 'Match', slug: 'match', category: 'Full Match Replay', status: 'published', description: '', youtubeUrl: '', embedUrl: '', thumbnailUrl: '', thumbnailAlt: '', featured: true, homepageFeatured: false, publishedAt: '', files: [], imageUrls: [], ...extra });
test('upload limits reject oversized, empty and unsupported files before storage', () => {
 for (const [type, limit] of [['image/jpeg', logic.IMAGE_LIMIT], ['image/png', logic.IMAGE_LIMIT], ['image/webp', logic.IMAGE_LIMIT], ['video/mp4', logic.VIDEO_LIMIT]]) {
  assert.equal(logic.validateMediaFile({ type, size: limit }), null);
  assert.ok(logic.validateMediaFile({ type, size: limit + 1 }));
  assert.ok(logic.validateMediaFile({ type, size: 0 }));
 }
 assert.match(logic.validateMediaFile({ type: 'video/mp4', size: logic.VIDEO_LIMIT + 1 }), /YouTube or cloud storage/);
 assert.ok(logic.validateMediaFile({ type: 'image/svg+xml', size: 100 }));
});
test('clubs and competitions accept images, MP4 or HTTPS hosted links with consistent validation', () => {
 for (const club of [false, true]) {
  const check = value => validateMedia(form(value), 'org', club ? null : 'competition', club);
  assert.equal(check({ youtubeUrl: 'https://youtu.be/abcdefghijk' }), null);
  assert.equal(check({ youtubeUrl: 'https://cloud.example/public/movie' }), null);
  assert.equal(check({ files: [{ type: 'video/mp4', size: 100 }] }), null);
  assert.equal(check({ category: 'Photo Gallery', files: [{ type: 'image/jpeg', size: 100 }] }), null);
  assert.ok(check({ category: 'Photo Gallery' }));
  assert.ok(check({ youtubeUrl: 'javascript:alert(1)' }));
  assert.ok(check({ files: [{ type: 'video/mp4', size: logic.VIDEO_LIMIT + 1 }] }));
  assert.ok(check({ files: [{ type: 'video/mp4', size: 100 }, { type: 'image/jpeg', size: 100 }] }));
 }
});
test('homepage selection supports highlights and interviews without changing categories', () => {
 const items = [
  { id: 'old', featured: true, homepage_featured: false, homepageFeatured: false, category: 'Full Match Replay', published_at: '2026-10-05' },
  { id: 'goals', homepage_featured: true, category: 'Match Highlights', status: 'published', published_at: '2026-10-03' },
  { id: 'draft', homepage_featured: true, category: 'Player Interview', status: 'draft', published_at: '2026-10-06' },
  { id: 'photos', homepage_featured: true, category: 'Photo Gallery', status: 'published', published_at: '2026-10-07' },
 ];
 assert.equal(logic.selectFeaturedMatch(items).id, 'goals');
 assert.equal(logic.selectFeaturedMatch([{id:'interview', homepage_featured:true, category:'Player Interview', status:'published'}]).id, 'interview');
 assert.equal(logic.selectFeaturedMatch([{id:'old', featured:true, category:'Full Match Replay'}]), null);
 assert.equal(logic.selectFeaturedMatch([]), null);
});
const player = load('src/components/public/MediaPlayer.tsx', { '../../utils/publicMedia': logic, '../admin/Media/mediaHelpers': helpers }).MediaPlayer;
test('player embeds YouTube, plays MP4 and safely opens other cloud viewing links', () => {
 const html = props => renderToStaticMarkup(React.createElement(player, { title: 'Match', ...props }));
 assert.match(html({ url: 'https://youtu.be/abcdefghijk' }), /youtube.com\/embed\/abcdefghijk/);
 assert.match(html({ url: 'https://storage.example/movie.mp4?token=abc' }), /<video.*controls/);
 assert.match(html({ url: 'https://cloud.example/public/movie' }), /Open hosted media/);
 assert.doesNotMatch(html({ url: 'javascript:alert(1)' }), /javascript|iframe|video/);
 assert.doesNotMatch(html({ url: 'https://youtube.com.attacker.example/?v=abcdefghijk' }), /<iframe/);
});
test('media pages share stable GUIDs and show every gallery image', () => {
 global.window = { location: { origin: 'https://bhmff.co.uk' } };
 try {
  const Page = load('src/pages/public/PublicMediaItemPage.tsx', { '../../utils/publicMedia': logic, '../../components/public/MediaPlayer': { MediaPlayer: player } }).PublicMediaItemPage;
  const html = renderToStaticMarkup(React.createElement(Page, { basePath: '', item: { id: 'guid1', slug: 'editable-slug', title: 'Match photographs', category: 'Photo Gallery', image_urls: ['https://image.example/one.jpg', 'https://image.example/two.jpg'] } }));
  assert.match(html, /one.jpg/); assert.match(html, /two.jpg/);
  assert.match(html, /media%2Fguid1/); assert.doesNotMatch(html, /editable-slug/);
  assert.match(html, /Copy link/);
  assert.match(renderToStaticMarkup(React.createElement(Page, { basePath: '' })), /Media unavailable/);
 } finally { delete global.window; }
});
function saveHarness(initial, { failUpload = 0, databaseError = false, club = false } = {}) {
 const source = fs.readFileSync('src/components/admin/Media/MediaManager.tsx', 'utf8');
 const tree = ts.createSourceFile('manager.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let node; function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === 'saveMedia') node = n; ts.forEachChild(n, visit); } visit(tree);
 const code = ts.transpileModule(node.getText(tree), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
 let retained = initial, calls = 0, payload, error;
 const storage = { upload: async () => ({ error: ++calls === failUpload ? new Error('Upload failed') : null }), getPublicUrl: path => ({ data: { publicUrl: `https://storage.example/${path}` } }) };
 const context = { form: initial, isClub: club, organisationId: 'org', currentCompetitionId: club ? null : 'competition', editingId: null, editingMediaItem: null, validateMedia, createEmbedUrl: helpers.createEmbedUrl, createThumbnailUrl: helpers.createThumbnailUrl, createSlug: helpers.createSlug, crypto: { randomUUID: () => `file${calls}` },
  setSaving() {}, setMessage() {}, setErrorMessage(value) { error = value; }, setForm(fn) { retained = fn(retained); }, resetForm() {}, loadMedia: async () => {},
  supabase: { storage: { from: () => storage }, from: () => ({ insert: async value => { payload = value; return { error: databaseError ? { message: 'Database unavailable' } : null }; } }) } };
 const fn = new Function(...Object.keys(context), `${code}; return saveMedia;`)(...Object.values(context));
 return { run: fn, get state() { return { retained, calls, payload, error }; } };
}
test('actual save uploads files under organisation and persists gallery URLs and cover', async () => {
 const harness = saveHarness(form({ category: 'Photo Gallery', files: [{ type: 'image/jpeg', size: 20 }, { type: 'image/png', size: 20 }] }));
 await harness.run(); const { payload, calls } = harness.state;
 assert.equal(calls, 2); assert.equal(payload.organisation_id, 'org');
 assert.equal(payload.image_urls.length, 2); assert.match(payload.image_urls[0], /\/org\//);
 assert.equal(payload.thumbnail_url, payload.image_urls[0]);
});
test('failed uploads and database saves retain successful files for retry', async () => {
 const original = console.error; console.error = () => {};
 try {
  const partial = saveHarness(form({ category: 'Photo Gallery', files: [{ type: 'image/jpeg', size: 20 }, { type: 'image/png', size: 20 }] }), { failUpload: 2 });
  await partial.run(); assert.equal(partial.state.payload, undefined); assert.equal(partial.state.retained.files.length, 1); assert.equal(partial.state.retained.imageUrls.length, 1);
  const db = saveHarness(form({ files: [{ type: 'video/mp4', size: 20 }] }), { databaseError: true });
  await db.run(); assert.equal(db.state.retained.files.length, 0); assert.match(db.state.retained.youtubeUrl, /\.mp4$/);
  assert.equal(db.state.error, 'Database unavailable');
 } finally { console.error = original; }
});
test('actual club save refuses oversized files without uploading', async () => {
 const harness = saveHarness(form({ files: [{ type: 'video/mp4', size: logic.VIDEO_LIMIT + 1 }] }), { club: true });
 await harness.run(); assert.equal(harness.state.calls, 0); assert.equal(harness.state.payload, undefined); assert.match(harness.state.error, /50 MB/);
});
test('media social preview is scoped, published and maps title, description and thumbnail', async () => {
 const previous = global.fetch;
 global.Netlify = { env: { get: name => name.includes('URL') ? 'https://db.example' : name.includes('KEY') ? 'anon' : '' } };
 const requests = [];
 global.fetch = async url => { requests.push(new URL(url)); return Response.json(String(url).includes('/organisations?') ? [{ id: 'org', name: 'BHMFF', slug: 'bhmff', logo_url: null, primary_colour: null, background_colour: null, organisation_type: 'competition' }] : [{ title: 'Saturday full match', description: 'Official match coverage', thumbnail_url: 'https://images.example/match.jpg', thumbnail_alt: 'Match cover' }]); };
 try {
  const handler = load('netlify/edge-functions/public-social-preview.ts').default;
  for (const url of ['https://bhmff.co.uk/media/12345678-1234-1234-1234-123456789abc', 'https://app.tournamenthq.co.uk/bhmff/media/match']) {
   const response = await handler(new Request(url), { next: async () => new Response('<html><head></head><body></body></html>', { headers: { 'content-type': 'text/html' } }) });
   const html = await response.text(); assert.match(html, /Saturday full match/); assert.match(html, /Official match coverage/); assert.match(html, /match.jpg/);
   const request = requests.at(-1); assert.equal(request.pathname, '/rest/v1/media'); assert.equal(request.searchParams.get('organisation_id'), 'eq.org'); assert.equal(request.searchParams.get('status'), 'eq.published');
  }
 } finally { global.fetch = previous; delete global.Netlify; }
});
test('BHMFF hero renders the selected match and never falls back to last year’s fixed video', () => {
 const Hero = load('src/components/Hero.tsx', { './public/MediaPlayer': { MediaPlayer: player }, '../lib/supabaseClient': { supabase: {} } }).Hero;
 const render = featuredMatch => renderToStaticMarkup(React.createElement(Hero, { featuredMatch, basePath: '' }));
 const selected = render({ id: 'new-guid', title: 'Today’s full match', youtube_url: 'https://youtu.be/abcdefghijk', description: 'Saturday coverage' });
 assert.match(selected, /Today’s full match/); assert.match(selected, /\/media\/new-guid/);
 assert.doesNotMatch(selected, /FZohdJg_8CU|Last Year/);
 assert.match(render(null), /Match coverage coming soon/);
 assert.doesNotMatch(render(null), /FZohdJg_8CU/);
});

test('actual media save persists homepage selection separately from library featuring', async () => {
 const harness = saveHarness(form({ category:'Match Highlights', youtubeUrl:'https://youtu.be/abcdefghijk', homepageFeatured:true, featured:false }));
 await harness.run();
 assert.equal(harness.state.payload.category,'Match Highlights');
 assert.equal(harness.state.payload.homepage_featured,true);
 assert.equal(harness.state.payload.featured,false);
 assert.match(validateMedia(form({ category:'Photo Gallery', homepageFeatured:true, thumbnailUrl:'https://image.example/photo.jpg' }), 'org','competition'), /video item/);
});
