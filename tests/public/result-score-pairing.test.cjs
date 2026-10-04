const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const moduleUnderTest={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/components/ResultsList.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function('require','module','exports',code)(name=>name==='./public/home/PublicEmptyState'?{PublicEmptyState:()=>null}:require(name),moduleUnderTest,moduleUnderTest.exports);
const result=(homeTeam,awayTeam,homeScore,awayScore)=>({id:homeTeam,fixtureId:'fixture',stage:'Group Stage',kickoffTime:'2026-10-04T10:00:00Z',homeTeamId:'home',awayTeamId:'away',homeTeam,awayTeam,homeScore,awayScore,playerOfMatch:'',matchReport:''});
test('each published score remains bound to its team in latest results',()=>{
 for(const data of [result('Ivory Coast','Gravesend',3,2),result('Erith Park','Meridian',2,3),result('SouthWood','Naija Best',0,3)]){
  const html=renderToStaticMarkup(React.createElement(moduleUnderTest.exports.ResultsList,{results:[data],surfaceColour:'#000',textColour:'#fff',accentColour:'#9f0'}));
  assert.ok(html.includes(`aria-label="${data.homeTeam} ${data.homeScore}, ${data.awayTeam} ${data.awayScore}, full time"`));
  const rows=html.match(/<div class="flex min-w-0[^]*?<\/div>/g);assert.equal(rows.length,2);
  assert.ok(rows[0].includes(data.homeTeam));assert.ok(rows[0].includes(`>${data.homeScore}</strong>`));
  assert.ok(rows[1].includes(data.awayTeam));assert.ok(rows[1].includes(`>${data.awayScore}</strong>`));
  assert.match(rows[1],/flex-row-reverse/);assert.match(rows[1],/lg:flex-row/);
 }
});
