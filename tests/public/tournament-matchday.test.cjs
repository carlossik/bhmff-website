const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(path, overrides={}) {
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name=>overrides[name]??require(name),module,module.exports);
 return module.exports;
}
const logic=load('src/utils/tournamentMatchday.ts');
const {getMatchday,londonDay}=logic;
const now=Date.parse('2026-10-03T16:00:00Z');
const fixture=(id,time='2026-10-03T10:30:00Z',status='scheduled')=>({id,kickoff_time:time,status,homeTeam:'Home',awayTeam:'Away',venue:'Ground'});
const result=(id,h=0,a=0,published=true)=>({fixture_id:id,home_score:h,away_score:a,published});
test('match day follows London midnight and DST, not the viewer timezone',()=>{
 assert.equal(londonDay('2026-10-03T23:15:00Z'),'2026-10-04');
 assert.equal(londonDay('2026-10-24T23:15:00Z'),'2026-10-25');
 assert.equal(londonDay('2026-10-25T23:15:00Z'),'2026-10-25');
 assert.equal(londonDay('invalid'),'');
 assert.deepEqual(getMatchday([fixture('today'),fixture('next','2026-10-03T23:15:00Z'),fixture('missing',null)],[],now).map(x=>x.id),['today']);
});
test('published results replace fixtures individually, including 0–0',()=>{
 const matches=getMatchday([fixture('f'),fixture('pending'),fixture('upcoming','2026-10-03T20:00:00Z')],[result('f')],now);
 assert.equal(matches[0].label,'Full time');assert.equal(matches[0].result.home_score,0);
 assert.equal(matches[1].label,'Result pending');assert.equal(matches[2].label,'Scheduled');
});
test('unpublished, missing, negative and fractional scores never become results',()=>{
 for(const score of [result('f',2,1,false),result('f',null,0),result('f',-1,0),result('f',1.5,0)])assert.equal(getMatchday([fixture('f')],[score],now)[0].result,null);
 assert.equal(getMatchday([fixture('f')],[result('other')],now)[0].result,null);
});
test('corrections and withdrawals appear on a fresh update',()=>{
 assert.equal(getMatchday([fixture('f')],[result('f',3,0)],now)[0].result.home_score,3);
 assert.equal(getMatchday([fixture('f')],[result('f',1,0)],now)[0].result.home_score,1);
 assert.equal(getMatchday([fixture('f')],[],now)[0].label,'Result pending');
});
test('cancelled and postponed fixtures do not imply a final score',()=>{
 for(const status of ['cancelled','postponed']){
 const match=getMatchday([fixture('f',undefined,status)],[result('f')],now)[0];
 assert.equal(match.result,null);assert.equal(match.label,status==='cancelled'?'Cancelled':'Postponed');
 }
 assert.deepEqual(getMatchday([],[],now),[]);
});
test('banner scopes queries, refreshes results and cleans up timers/listeners',async()=>{
 const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
 const state=[];let index=0;let effect;let poll;let intervalCount=0;let cleared=0;let removed=0;let publishedScore=3;const calls=[];
 const hooks={...React,useState(initial){const i=index++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],value=>{state[i]=value}]},useEffect(fn){effect=fn}};
 const from=table=>{const filters=[];const q={select(){return q},eq(...args){filters.push(['eq',...args]);return q},in(...args){filters.push(['in',...args]);return q},order(){return q},then(resolve){calls.push({table,filters});const data=table==='fixtures'?[{id:'f',kickoff_time:'2026-10-03T10:30:00Z',status:'scheduled',home_competition_team:{team:{name:'SouthWood'}},away_competition_team:{team:{name:'Naija Best'}},venue:{name:'Birchmere Park'}}]:[result('f',0,publishedScore)];return Promise.resolve({data,error:null}).then(resolve)}};return q};
 const realNow=Date.now;Date.now=()=>now;
 global.document={hidden:false,addEventListener(){},removeEventListener(){removed++}};
 global.window={setInterval(fn,ms){intervalCount++;if(ms===15000)poll=fn;return intervalCount},clearInterval(){cleared++},addEventListener(){},removeEventListener(){removed++}};
 try {
 const {TournamentMatchday}=load('src/components/public/TournamentMatchday.tsx',{react:hooks,'../../context/PublicOrganisationContext':{useOptionalPublicOrganisation:()=>({organisationId:'org',basePath:'',publicData:{competitions:[{id:'comp'}]}})},'../../lib/supabaseClient':{supabase:{from}},'../../utils/tournamentMatchday':logic});
 TournamentMatchday();const cleanup=effect();await new Promise(setImmediate);
 assert.deepEqual(calls[0].filters,[['eq','published',true],['in','competition_id',['comp']]]);
 assert.deepEqual(calls[1].filters,[['eq','published',true],['in','fixture_id',['f']]]);
 index=0;let html=renderToStaticMarkup(TournamentMatchday());assert.match(html,/Today’s Results/);assert.match(html,/0 – 3/);
 publishedScore=1;poll();await new Promise(setImmediate);index=0;html=renderToStaticMarkup(TournamentMatchday());assert.match(html,/0 – 1/);
 cleanup();assert.equal(cleared,2);assert.equal(removed,2);
 }finally{Date.now=realNow;delete global.document;delete global.window}
});
