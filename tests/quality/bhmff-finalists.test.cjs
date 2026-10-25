const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '../..')
const helperSource = fs.readFileSync(path.join(root, 'src/components/public/home/bhmffFinalists.ts'), 'utf8')
const componentSource = fs.readFileSync(path.join(root, 'src/components/public/home/BhmffKnockoutSpotlight.tsx'), 'utf8')
const transpiled = ts.transpileModule(helperSource, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}, reportDiagnostics:true})
assert.equal(transpiled.diagnostics.length, 0)
const moduleObject = { exports: {} }
vm.runInNewContext(transpiled.outputText, { exports:moduleObject.exports, module:moduleObject }, { filename:'bhmffFinalists.cjs' })
const {FINAL_DAY_PROMOTION_AT, ANNOUNCED_FINAL_KICKOFF, getBhmffSpotlightMode, getBhmffSemifinals, getBhmffFinalMatch, getBhmffThirdPlace} = moduleObject.exports

const semi = (id, home, away, kickoffTime='2026-10-25T11:00:00Z') => ({
  id, homeTeam:home, awayTeam:away, stage:'Semi Final', kickoffTime,
  status:'completed', venueName:'Birchmere Park',venueAddress:'',venuePostcode:'',venueNotes:''
})
const result = (fixtureId, homeScore, awayScore) => ({
  id:`result-${fixtureId}`,fixtureId,homeScore,awayScore,
  homeTeam:'',awayTeam:'',homeTeamId:'',awayTeamId:'',stage:'Semi Final',
  kickoffTime:'2026-10-25T11:00:00Z',playerOfMatch:'',matchReport:''
})
const fixtures = [semi('s1','Team A','Team B'),semi('s2','Team C','Team D','2026-10-25T13:00:00Z')]
const thirdPlace = {...semi('p1','Team B','Team C','2026-10-31T11:00:00Z'),stage:'Third Place Playoff',status:'scheduled'}
const championship = {...semi('g1','Team B','Team D','2026-10-31T14:00:00Z'),stage:'Grand Final',status:'scheduled',venueName:'Thamesmead Sporting Ground'}

// Time-based feature promotion must work in Europe/London irrespective of the visitor's timezone.
test('midnight UK Monday 26 October switches the top feature to final day',()=>{
  assert.equal(FINAL_DAY_PROMOTION_AT,Date.parse('2026-10-26T00:00:00Z'))
  assert.equal(getBhmffSpotlightMode(Date.parse('2026-10-25T23:59:59Z'),2),'results')
  assert.equal(getBhmffSpotlightMode(Date.parse('2026-10-26T00:00:00Z'),2),'final-day')
  assert.equal(getBhmffSpotlightMode(Date.parse('2026-10-26T00:00:01Z'),0),'final-day')
})
test('published semi-final results trigger Super Sunday Results rather than fixture advertising',()=>{
  assert.equal(getBhmffSpotlightMode(Date.parse('2026-10-25T20:00:00Z'),2),'results')
  assert.equal(getBhmffSpotlightMode(Date.parse('2026-10-25T08:00:00Z'),0),'fixtures')
})
test('published scores drive the finalists without team-name hardcoding',()=>{
  const final=getBhmffFinalMatch(fixtures,[result('s1',2,3),result('s2',2,4)])
  assert.equal(final.home.name,'Team B')
  assert.equal(final.away.name,'Team D')
  assert.equal(final.home.confirmed,true)
  assert.equal(final.away.confirmed,true)
  assert.equal(final.fixture,null)
})
test('missing published result does not invent a finalist',()=>{
  const final=getBhmffFinalMatch(fixtures,[result('s1',2,3)])
  assert.equal(final.home.name,'Team B')
  assert.equal(final.away.name,'Winner of Semi-Final 2')
  assert.equal(final.away.confirmed,false)
})
test('drawn semi-final does not invent penalty-shootout winner',()=>{
  const final=getBhmffFinalMatch(fixtures,[result('s1',1,1),result('s2',2,4)])
  assert.equal(final.home.confirmed,false)
  assert.equal(final.away.name,'Team D')
})
test('official final fixture overrides home/away ordering',()=>{
  const final=getBhmffFinalMatch([...fixtures,championship],[result('s1',2,3),result('s2',2,4)])
  assert.equal(final.fixture.id,'g1')
  assert.equal(final.home.name,'Team B')
  assert.equal(final.away.name,'Team D')
})
test('official final fixture can resolve penalty-shootout team',()=>{
  const final=getBhmffFinalMatch([...fixtures,championship],[result('s1',2,2),result('s2',2,4)])
  assert.equal(final.home.name,'Team B')
})
test('third-place play-off is excluded from championship finalists',()=>{
  const final=getBhmffFinalMatch([...fixtures,thirdPlace],[result('s1',2,3),result('s2',2,4)])
  assert.equal(final.fixture,null)
  assert.equal(final.away.name,'Team D')
})
test('third place appears only if actual fixture exists and is not cancelled',()=>{
  assert.equal(getBhmffThirdPlace(fixtures),null)
  assert.equal(getBhmffThirdPlace([...fixtures,thirdPlace]).id,'p1')
  assert.equal(getBhmffThirdPlace([...fixtures,{...thirdPlace,status:'cancelled'}]),null)
})
test('stage matches should not depend on hard-coded team names',()=>{
  assert.equal(getBhmffSemifinals(fixtures).length,2)
  assert.equal(getBhmffSemifinals([...fixtures,thirdPlace,championship]).length,2)
})
test('fallback covers an incorrectly labelled October 25 knockout match',()=>{
  const legacy=fixtures.map(x=>({...x,stage:'Knockout'}))
  assert.equal(getBhmffSemifinals(legacy).length,2)
})
test('cancelled match is never displayed in knockout feature',()=>{
  const cancelled={...fixtures[1],status:'cancelled'}
  assert.equal(getBhmffSemifinals([fixtures[0],cancelled]).length,1)
})
test('announced final kickoff is at 2pm local UK on October 31',()=>{
  assert.equal(ANNOUNCED_FINAL_KICKOFF, Date.parse('2026-10-31T14:00:00Z'))
})
test('homepage has a single conditional top feature replacing results with final fixtures',()=>{
  assert.match(componentSource,/mode === 'final-day' \? <div id="bhmff-final"/)
  assert.match(componentSource,/mode === 'results' \? 'Semi-Final Results' : 'Semi-Final Fixtures'/)
  assert.match(componentSource,/getBhmffSpotlightMode\(now, publishedSemiCount\)/)
  assert.match(componentSource,/\{result \? `\$\{result.homeScore\} – \$\{result.awayScore\}` : 'VS'\}/)
  assert.doesNotMatch(componentSource, /teams\.includes\('thamesmead warriors'\)/)
})
test('final day feature includes date, venue, club badges and verified published results',()=>{
  assert.match(componentSource,/Thamesmead Sporting Ground/)
  assert.match(componentSource,/31 October 2026/)
  assert.match(componentSource,/MatchBadge teams=\{teams\} name=\{finalMatch\.home\.name\}/)
  assert.match(componentSource,/MatchBadge teams=\{teams\} name=\{finalMatch\.away\.name\}/)
  assert.match(componentSource,/Published Results/)
  assert.match(componentSource,/getBhmffThirdPlace\(fixtures\)/)
})
test('TypeScript JSX compiles without syntactic diagnostics',()=>{
  const parsed=ts.transpileModule(componentSource,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext},reportDiagnostics:true})
  assert.equal(parsed.diagnostics.length,0,parsed.diagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '))
})
