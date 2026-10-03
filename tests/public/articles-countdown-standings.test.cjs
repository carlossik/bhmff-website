const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(path, overrides = {}) {
 const source=fs.readFileSync(path,'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',compiled)(name=> overrides[name] ?? require(name),module,module.exports);
 return module.exports;
}
const {calculateStandings}=load('src/utils/calculateStandings.ts');
const teams=['a','b','c'].map(id=>({id,name:id,manager:'',logoUrl:''}));
test('wins, draws, goals and ranking are calculated from current results',()=>{
 const rows=calculateStandings(teams,[{homeTeamId:'a',awayTeamId:'b',homeScore:2,awayScore:1},{homeTeamId:'c',awayTeamId:'a',homeScore:0,awayScore:0}]);
 assert.deepEqual(rows.map(x=>[x.id,x.played,x.won,x.drawn,x.lost,x.goalsFor,x.goalsAgainst,x.goalDifference,x.points]),[['a',2,1,1,0,2,1,1,4],['c',1,0,1,0,0,0,0,1],['b',1,0,0,1,1,2,-1,0]]);
});
test('correction, deletion and unrelated or invalid results do not retain old points',()=>{
 const result={homeTeamId:'a',awayTeamId:'b',homeScore:2,awayScore:1};
 calculateStandings(teams,[result]);
 const corrected=calculateStandings(teams,[{...result,homeScore:0,awayScore:3}]);
 assert.equal(corrected[0].id,'b');assert.equal(corrected.find(x=>x.id==='a').points,0);
 assert.ok(calculateStandings(teams,[]).every(x=>x.played===0));
 assert.ok(calculateStandings(teams,[{...result,homeScore:null},{...result,awayTeamId:'other'},{...result,awayTeamId:'a'},{...result,homeScore:-1}]).every(x=>x.played===0));
});
test('countdown changes at the boundary, including on an already-open page',()=>{
 const realNow=Date.now; const boundary=Date.parse('2026-10-03T09:00:00+01:00');
 let state;let tick;let init=true;
 const hooks={...React,useState(value){if(init){state=typeof value==='function'?value():value;init=false}return [state,value=>{state=value}]},useEffect(fn){fn()},useMemo:fn=>fn()};
 global.window={setInterval(fn){tick=fn;return 1},clearInterval(){}};
 try {
  const {TournamentCountdown}=load('src/components/public/TournamentCountdown.tsx',{react:hooks});
  Date.now=()=>boundary-1000;
  let html=renderToStaticMarkup(React.createElement(TournamentCountdown));
  assert.match(html,/The Festival Begins In/);assert.match(html,/bhmffCountdownGrid/);
  Date.now=()=>boundary;tick();
  html=renderToStaticMarkup(React.createElement(TournamentCountdown));
  assert.match(html,/The Festival Has Begun/);assert.doesNotMatch(html,/<div class="bhmffCountdownGrid"/);
 }finally{Date.now=realNow;delete global.window}
});
test('article direct lookup supports id, slug, loading and missing pages',()=>{
 let data={articles:[{id:'id1',slug:'story',title:'Festival story',body:['Body'],tags:[],actions:[]}],loading:false,error:null};
 global.window={location:{pathname:'/articles/id1',origin:'https://bhmff.co.uk'}};
 const ArticlePage=load('src/components/ArticlePage.tsx').ArticlePage;
 const {PublicArticlePage}=load('src/pages/public/PublicArticlePage.tsx',{'react-router-dom':{useNavigate:()=>()=>{}},'../../hooks/usePublicArticles':{usePublicArticles:()=>data},'../../components/ArticlePage':{ArticlePage}});
 for(const articleKey of ['id1','story']){
  const html=renderToStaticMarkup(React.createElement(PublicArticlePage,{articleKey,basePath:''}));
  assert.match(html,/Festival story/);assert.match(html,/Copy article link/);assert.match(html,/wa.me/);
 }
 assert.match(renderToStaticMarkup(React.createElement(PublicArticlePage,{articleKey:'missing',basePath:''})),/Article unavailable/);
 data.loading=true;assert.match(renderToStaticMarkup(React.createElement(PublicArticlePage,{articleKey:'id1',basePath:''})),/Loading article/);
 delete global.window;
});
test('group refresh reads changed results and cleans up polling',async()=>{
 let state=[];let index=0;let effect;let refresh;let removed=0;
 const states=[];
 const hooks={...React,useState(value){const i=index++;states[i]=value;return [value,v=>{states[i]=v}]},useEffect(fn){effect=fn}};
 let score=2;
 const query=name=>{const q={select(){return q},eq(){return q},order(){return q},then(resolve){const data=name==='groups'?[{id:'g',name:'A',sort_order:1}]:name==='competition_teams'?['a','b'].map(id=>({id,team_id:id,team:{id,name:id,published:true,participation_status:'confirmed'}})):name==='group_teams'?['a','b'].map(id=>({group_id:'g',competition_team_id:id})):[{home_score:score,away_score:1,fixture:{id:'f',competition_id:'comp',group_id:'g',home_competition_team_id:'a',away_competition_team_id:'b',stage:'Group Stage'}}];return Promise.resolve({data,error:null}).then(resolve)}};return q};
 global.window={setInterval(fn,ms){assert.equal(ms,15000);refresh=fn;return 1},clearInterval(){removed++},addEventListener(){},removeEventListener(){}};
 global.document={hidden:false,addEventListener(){},removeEventListener(){}};
 const {PublicGroupStandings}=load('src/components/public/PublicGroupStandings.tsx',{react:hooks,'../../lib/supabaseClient':{supabase:{from:query}},'../../utils/calculateStandings':{calculateStandings}});
 PublicGroupStandings({competitionId:'comp'});const cleanup=effect();
 await new Promise(setImmediate);assert.equal(states[0][0].standings[0].id,'a');
 score=0;refresh();await new Promise(setImmediate);assert.equal(states[0][0].standings[0].id,'b');
 cleanup();assert.equal(removed,1);delete global.window;delete global.document;
});
test('social preview resolves the article on BHMFF and organisation URLs',async()=>{
 const realFetch=global.fetch;
 global.Netlify={env:{get:name=>name.includes('URL')?'https://db.example':name.includes('KEY')?'anon':''}};
 const requests=[];
 global.fetch=async(url)=>{
  requests.push(new URL(url));
  return Response.json(String(url).includes('/organisations?')?[{id:'org1',name:'BHMFF',slug:'bhmff',logo_url:null,primary_colour:null,background_colour:null,organisation_type:'competition'}]:[{title:'History & Football',summary:'Read the festival story',hero:'',image_url:'https://images.example/story.jpg',image_alt:'Festival photo'}]);
 };
 try{
  const {default:handler}=load('netlify/edge-functions/public-social-preview.ts');
  for(const url of ['https://bhmff.co.uk/articles/story','https://app.tournamenthq.co.uk/bhmff/articles/story']){
   const response=await handler(new Request(url),{next:async()=>new Response('<html><head><title>Old</title></head><body></body></html>',{headers:{'content-type':'text/html'}})});
   const html=await response.text();assert.match(html,/History &amp; Football/);assert.match(html,/Read the festival story/);assert.match(html,/https:\/\/images.example\/story.jpg/);assert.ok(html.includes(url));
   const query=requests.at(-1).searchParams;assert.equal(query.get('organisation_id'),'eq.org1');assert.equal(query.get('status'),'eq.published');assert.equal(query.get('slug'),'eq.story');
  }
 }finally{global.fetch=realFetch;delete global.Netlify}
});
