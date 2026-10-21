/**
 * TournamentHQ public-site smoke tests. Read-only.
 * Start local server first: npm run dev
 * Run: node --test tests/public/publicSiteRegression.test.cjs
 * Optional: THQ_BASE_URL=https://app.tournamenthq.co.uk
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = (process.env.THQ_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const headless = process.env.THQ_HEADLESS !== 'false';
const b = process.env.THQ_BHMFF_SLUG || 'bhmff';
const p = process.env.THQ_PETTSWOOD_SLUG || 'pettswood-vets1';
const timeout = 30000;
let browser;

test.before(async () => { browser = await chromium.launch({ headless }); });
test.after(async () => { await browser?.close(); });

async function visit(path) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const problems = [];
  page.on('response', response => {
    if (response.status() >= 400 && /\/rest\/v1\/|\/functions\/v1\//.test(response.url())) {
      problems.push(`${response.status()} ${response.url().split('?')[0]}`);
    }
  });
  const res = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout });
  return { ctx, page, res, problems };
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function checkPage(page, path, expected) {
  await page.waitForURL(url => new URL(url).pathname.replace(/\/$/, '') === path, { timeout });
  // Do not read transient React "Loading organisation..." state as the final page.
  await page.getByText('Loading organisation...', { exact: true }).waitFor({ state: 'hidden', timeout });
  // Ensure at least some real page content is present (rather than a blank/loading shell).
  await page.locator('body').getByText(expected).first().waitFor({ state: 'visible', timeout });
  const body = await page.locator('body').innerText();
  assert.doesNotMatch(body, /ORGANISATION NOT FOUND|Unable to load (teams|fixtures|results) right now/i);
  assert.match(body, expected);
}

for (const spec of [
  { path: `/${b}`, text: /Black History Month Football Festival/i },
  { path: `/${b}/fixtures`, text: /Fixtures/i },
  { path: `/${b}/teams`, text: /Teams/i },
  { path: `/${b}/results`, text: /Results/i },
  { path: `/${p}`, text: /Petts\s+Wood\s+Vets/i },
  { path: `/${p}/teams`, text: /Teams/i },
]) {
  test(`Public route ${spec.path} resolves with no failed data requests`, async () => {
    const { ctx, page, res, problems } = await visit(spec.path);
    try {
      assert.ok(res && res.status() < 400, `HTTP ${res?.status()}`);
      await checkPage(page, spec.path, spec.text);
      assert.deepEqual(problems, [], `API failures: ${problems.join('; ')}`);
    } finally { await ctx.close(); }
  });
}

test('BHMFF fixtures -> teams navigation stays on BHMFF and loads teams', async () => {
  const { ctx, page, problems } = await visit(`/${b}/fixtures`);

  try {
    await checkPage(page, `/${b}/fixtures`, /Fixtures/i);

    // Accept both the homepage Teams section and dedicated Teams page.
    const expectedPage = `/${b}/teams`;
    const expectedSection = `/${b}#teams`;

    const links = page.locator('a[href]');

    const all = await links.evaluateAll(items =>
        items.map(a => ({
          href: a.getAttribute('href'),
          text: (a.textContent || '').trim()
        }))
    );

    const good = all.find(item => {
      if (!/^teams$/i.test(item.text)) return false;

      try {
        const url = new URL(item.href, base);

        return (
            url.pathname.replace(/\/$/, '') === expectedPage ||
            (
                url.pathname.replace(/\/$/, '') === `/${b}` &&
                url.hash === '#teams'
            )
        );
      } catch {
        return false;
      }
    });

    assert.ok(
        good,
        `No valid BHMFF Teams link found: ${JSON.stringify(all)}`
    );

    const targeted = page.locator('a[href]').filter({
      hasText: /^Teams$/i
    }).first();

    await targeted.click();

    // Verify that navigation remains within BHMFF.
    await page.waitForURL(url =>
        (
            url.pathname.replace(/\/$/, '') === expectedPage ||
            (
                url.pathname.replace(/\/$/, '') === `/${b}` &&
                url.hash === '#teams'
            )
        )
    );

    // The dedicated Teams page must still load correctly.
    await page.goto(`${base}${expectedPage}`);
    await checkPage(page, expectedPage, /Teams/i);

    assert.deepEqual(
        problems,
        [],
        `API failures: ${problems.join('; ')}`
    );

  } finally {
    await ctx.close();
  }
});

test('BHMFF public page does not show Petts Wood identity', async () => {
  const { ctx, page } = await visit(`/${b}`);
  try {
    await checkPage(page, `/${b}`, /Black History Month Football Festival/i);
    const header = await page.locator('header').first().innerText();
    assert.match(header, /Black History Month Football Festival/i);
    assert.doesNotMatch(header, /Petts\s+Wood\s+Vets/i);
  } finally { await ctx.close(); }
});

test('Petts Wood public page does not show BHMFF identity', async () => {
  const { ctx, page } = await visit(`/${p}`);
  try {
    await checkPage(page, `/${p}`, /Petts\s+Wood\s+Vets/i);
    const header = await page.locator('header').first().innerText();
    assert.match(header, /Petts\s+Wood\s+Vets/i);
    assert.doesNotMatch(header, /Black History Month Football Festival/i);
  } finally { await ctx.close(); }
});

test('Teams query never asks for missing clubs.logo_url column', () => {
  const fs = require('node:fs');
  const file = fs.readFileSync('src/pages/public/PublicTeamsPage.tsx', 'utf8');
  assert.doesNotMatch(file, /clubs\s*\(\s*[^)]*\blogo_url\b/s, 'Invalid clubs.logo_url in nested Supabase select');
});
