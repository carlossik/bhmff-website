const { test } = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const ts = require('typescript');
function compile(text) { return ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText; }
function load(path, overrides={}) { const m={exports:{}};new Function('require','module','exports',compile(fs.readFileSync(path,'utf8')))(name=>overrides[name]??require(name),m,m.exports);return m.exports; }
test('modal retains typing focus across callback changes while Escape uses the latest handler',()=>{
 let cursor=0;const slots=[];let queued=[];let keydown;let focusCount=0;let closed='';
 const hooks={useId:()=> 'dialog-id',useRef(initial){const i=cursor++;if(!slots[i])slots[i]={current:initial};return slots[i]},useEffect(fn,deps){const i=cursor++;const old=slots[i];if(!old||deps.some((x,j)=>x!==old.deps[j]))queued.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}};
 global.document={body:{style:{overflow:'auto'}}};global.window={addEventListener:(name,fn)=>{keydown=fn},removeEventListener:()=>{}};
 try {const {Modal}=load('src/components/common/Modal.tsx',{react:hooks});
  function render(close){cursor=0;Modal({title:'Add Goal',children:'Input',onClose:close});slots[0].current={focus:()=>focusCount++};for(const fn of queued)fn();queued=[];}
  render(()=>{closed='old'});assert.equal(focusCount,1);
  for(const text of ['A','Al','Alex','Alex Smith'])render(()=>{closed=text});
  assert.equal(focusCount,1);keydown({key:'Escape'});assert.equal(closed,'Alex Smith');
  for(const slot of slots)slot?.cleanup?.();assert.equal(document.body.style.overflow,'auto');
 }finally{delete global.document;delete global.window;}
});
test('public goals with optional blank minutes survive mapping and refresh after corrections/deletion',async()=>{
 const source=fs.readFileSync('src/pages/public/PublicHomePage.tsx','utf8');const tree=ts.createSourceFile('home.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&!effect)effect=n.arguments[0];ts.forEachChild(n,visit)}visit(tree);
 let goals=[{id:'g',fixture_id:'f',player_name:'Alex',minute:null,team:{id:'t',name:'Team'}}];let storedGoals;let timer;let removed=0;const calls=[];
 const fixture={id:'f',home_competition_team:{team:{id:'t',name:'Team'}},away_competition_team:{team:{id:'a',name:'Away'}}};
 const query=table=>{const q={select(){return q},eq(k,v){calls.push([table,k,v]);return q},in(k,v){calls.push([table,k,v]);return q},order(){return q},neq(){return q},limit(){return q},maybeSingle(){return q},then(resolve){return Promise.resolve({error:null,data:table==='competitions'?{id:'c'}:table==='results'?[{id:'r',fixture_id:'f',home_score:1,away_score:0,fixture}]:table==='goals'?goals:[]}).then(resolve)}};return q};
 global.window={setInterval(fn,ms){assert.equal(ms,15000);timer=fn;return 1},clearInterval(){removed++},addEventListener(){},removeEventListener(){removed++}};global.document={hidden:false,addEventListener(){},removeEventListener(){removed++}};
 const vars={organisationId:'org',supabase:{from:query},setLoading(){},setPublicTeams(){},setPublicFixtures(){},setPublicResults(){},setPublicGoals(value){storedGoals=value},isRecord:value=>value&&typeof value==='object'&&!Array.isArray(value),firstRecord:value=>Array.isArray(value)?value[0]:value,getString:(value,key)=>typeof value?.[key]==='string'?value[key]:'',getNumber:(value,key)=>typeof value?.[key]==='number'?value[key]:null,getBoolean:(value,key)=>value?.[key]===true};
 try{const cleanup=new Function(...Object.keys(vars),compile(`const run=${effect.getText(tree)};run();`).replace('run();','return run();'))(...Object.values(vars));
  await new Promise(setImmediate);assert.equal(storedGoals[0].playerName,'Alex');assert.equal(storedGoals[0].minute,null);assert.ok(calls.some(x=>x[0]==='goals'&&x[1]==='fixture_id'&&x[2][0]==='f'));
  goals=[{...goals[0],player_name:'Corrected'}];timer();await new Promise(setImmediate);assert.equal(storedGoals[0].playerName,'Corrected');
  goals=[];timer();await new Promise(setImmediate);assert.deepEqual(storedGoals,[]);cleanup();assert.equal(removed,3);
 }finally{delete global.window;delete global.document;}
});
test('goal creation confirms a returned row and does not report a silent non-save as success',async()=>{
 let response={data:{id:'saved'},error:null};let payload;
 const q={insert(value){payload=value;return q},select(){return q},single:async()=>response};
 const {goalService}=load('src/components/admin/Goals/goalService.ts',{'../../../lib/supabaseClient':{supabase:{from:()=>q}}});
 const values={fixture_id:'f',team_id:'t',player_name:' Alex ',minute:'',video_timestamp:''};
 await goalService.createGoal('comp',values);assert.equal(payload.player_name,'Alex');assert.equal(payload.minute,null);
 response={data:null,error:null};await assert.rejects(goalService.createGoal('comp',values),/not saved/);
});
