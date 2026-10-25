const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const homepage = fs.readFileSync(path.join(root, 'src/pages/public/PublicHomePage.tsx'), 'utf8')
const spotlight = fs.readFileSync(path.join(root, 'src/components/public/home/BhmffKnockoutSpotlight.tsx'), 'utf8')

test('home page retrieves published public results by competition, without a fragile nested view relationship', () => {
  assert.match(homepage, /\.from\('public_results'\)/)
  assert.match(homepage, /\.eq\('competition_id', competition\.id\)/)
  assert.match(homepage, /\.eq\('published', true\)/)
  assert.doesNotMatch(homepage, /fixture:fixtures!results_fixture_id_fkey!inner/)
})

test('home page only maps published results through fixtures scoped to this competition', () => {
  assert.match(homepage, /const fixturesById = new Map<string, UnknownRecord>/)
  assert.match(homepage, /getString\(fixtureRow, 'competition_id'\) === competition\.id/)
  assert.match(homepage, /getString\(resultRecord, 'competition_id'\) !== competition\.id/)
})

test('Super Sunday published results are not limited to pre-semi-final kickoff', () => {
  assert.doesNotMatch(spotlight, /Date\.parse\(r\.kickoffTime\)\s*<=\s*FIRST_SEMI/)
  assert.match(spotlight, /const recent = useMemo\(\(\) => \[\.\.\.results\]/)
  assert.match(spotlight, /resultsByFixtureId\.get\(f\.id\)/)
})

test('Super Sunday fixture cards display an entered and published score', () => {
  assert.match(spotlight, /publishedScore\.homeScore/)
  assert.match(spotlight, /publishedScore\.awayScore/)
  assert.match(spotlight, /publishedScore \? 'FULL TIME' : 'VS'/)
})
