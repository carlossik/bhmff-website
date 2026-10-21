// Exercises the component's actual hooks and event handlers with local services.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function harness(extras=[]) {
 const slots=[],effects=[]; let cursor=0,dirty=true,tree;
 const depsEqual=(a,b)=>a && b && a.length===b.length && a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useState(initial){const i=cursor++; if(!(i in slots))slots[i]=initial; return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;dirty=true}];},
  useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useMemo(fn,deps){const i=cursor++;if(!slots[i]||!depsEqual(slots[i].deps,deps))slots[i]={deps,value:fn()};return slots[i].value},
  useCallback(fn,deps){return react.useMemo(()=>fn,deps)},
  useEffect(fn,deps){const i=cursor++;if(!slots[i]||!depsEqual(slots[i].deps,deps)){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=fn()})}},
 };
 const calls=[];
 const officials=[{key:'official:a',officialUserId:'a',recipientName:'Alex',email:'alex@example.invalid',phone:null,competitionTeamIds:['home'],teamNames:['Home'],whatsappOptIn:false},
 {key:'official:b',officialUserId:'b',recipientName:'Blair',email:'blair@example.invalid',phone:null,competitionTeamIds:['away'],teamNames:['Away'],whatsappOptIn:false},...extras];
 const service={
  async whatsAppAction(org,action,input){calls.push({org,action,input});if(action==='tournament_directory')return {recipients:input.competitionId==='cup'?officials:[]};if(action==='tournament_fixtures')return {fixtures:[{id:'match',match:'Home vs Away',competitionTeamIds:['home','away']}]};return {saved:true}},
  async getProviderStatus(org,competitionId){calls.push({action:'status',org,competitionId});return []},
  async getHistory(org,limit,competitionId){calls.push({action:'history',org,competitionId});return []},
 };
 const jsx=(type,props)=>({type,props});
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('src/components/admin/Communications/TournamentCommunications.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 function Composer(){} function Panel(){}
 new Function('require','module','exports',code)(name=>{
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};
  if(name.endsWith('OrganisationContext'))return {useOrganisation:()=>({currentOrganisation:{id:'org',name:'Festival'}})};
  if(name.endsWith('supabaseClient'))return {supabase:{from(){const q={select(){return q},eq(){return q},order(){return q},then(fn){return Promise.resolve(fn({data:[{id:'cup',name:'Cup'},{id:'other',name:'Other Cup'}],error:null}))}};return q}}};
  if(name.endsWith('communicationsService'))return {communicationsService:service};
  if(name.endsWith('CommunicationComposerModal'))return {CommunicationComposerModal:Composer};
  if(name.endsWith('WhatsAppConnectionPanel'))return {WhatsAppConnectionPanel:Panel};
  throw new Error(name);
 },module,module.exports);
 function nodes(value){if(!value)return [];if(Array.isArray(value))return value.flatMap(v=>nodes(v));if(typeof value!=='object')return [];return [value,...nodes(value.props?.children)]}
 const text=value=>Array.isArray(value)?value.map(text).join(''):typeof value==='object'&&value?text(value.props?.children):String(value??'');
 return {calls,Composer,nodes:()=>nodes(tree),text,
  async flush(){for(let i=0;i<12;i++){if(dirty){cursor=0;dirty=false;tree=module.exports.TournamentCommunications();effects.splice(0).forEach(fn=>fn())}await new Promise(resolve=>setImmediate(resolve))}return tree},
  cleanup(){slots.forEach(s=>s?.cleanup?.())},
 };
}
test('tournament screen scopes requests and reviews only the selected club officials',async()=>{
 const h=harness();await h.flush();
 assert.ok(h.calls.every(c=>c.org==='org'));
 assert.ok(h.calls.filter(c=>c.action==='status'||c.action==='history').every(c=>c.competitionId==='cup'));
 const select=h.nodes().find(n=>n.type==='select'&&n.props.value==='all');
 select.props.onChange({target:{value:'team:home'}});await h.flush();
 const checkboxes=h.nodes().filter(n=>n.type==='input'&&n.props.type==='checkbox');assert.equal(checkboxes.length,1);
 checkboxes[0].props.onChange({target:{checked:true}});await h.flush();
 const textarea=h.nodes().find(n=>n.type==='textarea');textarea.props.onChange({target:{value:'Fixture news'}});await h.flush();
 h.nodes().find(n=>n.type==='button'&&h.text(n)==='Review delivery').props.onClick();await h.flush();
 const composer=h.nodes().find(n=>n.type===h.Composer);
 assert.equal(composer.props.competitionId,'cup');assert.equal(composer.props.defaultTemplateCode,'general_operational_message');
 assert.deepEqual(composer.props.recipients.map(r=>r.officialUserId),['a']);assert.equal(composer.props.initialMessageBody,'Fixture news');
 h.cleanup();
});
test('changing competition clears recipients and the review; group share does not send messages',async()=>{
 const h=harness();await h.flush();
 h.nodes().find(n=>n.type==='button'&&h.text(n)==='Select all shown').props.onClick();await h.flush();
 h.nodes().find(n=>n.type==='textarea').props.onChange({target:{value:'Match tomorrow'}});await h.flush();
 const link=h.nodes().find(n=>n.type==='a');assert.equal(link.props.href,'https://wa.me/?text=Cup%0A%0AMatch%20tomorrow');
 assert.ok(!h.calls.some(c=>c.action==='send'));
 h.nodes().find(n=>n.type==='button'&&h.text(n)==='Review delivery').props.onClick();await h.flush();
 h.nodes().find(n=>n.type==='select'&&n.props.value==='cup').props.onChange({target:{value:'other'}});await h.flush();
 assert.ok(!h.nodes().some(n=>n.type===h.Composer));
 assert.equal(h.nodes().find(n=>n.type==='button'&&h.text(n)==='Review delivery').props.disabled,true);
 h.cleanup();
});

test('independent referee and organiser contacts can be selected without user accounts',async()=>{
 const referee={key:'contact:ref',officialUserId:null,tournamentContactId:'ref',role:'referee',recipientName:'Referee Rae',email:'ref@example.invalid',phone:'+447700900001',whatsappPhone:'+447700900001',whatsappOptIn:true,competitionTeamIds:[],teamNames:[]};
 const h=harness([referee]);await h.flush();
 const selector=h.nodes().find(n=>n.type==='select'&&n.props.value==='all');selector.props.onChange({target:{value:'tournament'}});await h.flush();
 h.nodes().find(n=>n.type==='button'&&h.text(n)==='Select all shown').props.onClick();await h.flush();
 h.nodes().find(n=>n.type==='button'&&h.text(n)==='Review delivery').props.onClick();await h.flush();
 const composer=h.nodes().find(n=>n.type===h.Composer);
 assert.deepEqual(composer.props.recipients.map(r=>r.key),['contact:ref']);
 assert.equal(composer.props.recipients[0].officialUserId,null);
 assert.equal(composer.props.recipients[0].whatsappOptIn,true);
 h.cleanup();
});
test('tournament administrator can add an account-free referee',async()=>{
 const h=harness();await h.flush();
 h.nodes().find(n=>n.type==='button'&&h.text(n)==='Add referee / organiser / contact').props.onClick();await h.flush();
 const fields=h.nodes().filter(n=>n.type==='input');
 const name=fields.find(n=>n.props.maxLength===120);name.props.onChange({target:{value:'Referee Rachel'}});
 const email=fields.find(n=>n.props.type==='email');email.props.onChange({target:{value:'referee@example.invalid'}});await h.flush();
 const save=h.nodes().find(n=>n.type==='button'&&h.text(n)==='Save contact');
 assert.equal(save.props.disabled,false);save.props.onClick();await h.flush();
 const call=h.calls.find(c=>c.action==='tournament_external_save');
 assert.equal(call.input.role,'referee');assert.equal(call.input.email,'referee@example.invalid');assert.equal(call.input.competitionId,'cup');
 assert.equal(call.input.whatsappOptIn,false);
 h.cleanup();
});
