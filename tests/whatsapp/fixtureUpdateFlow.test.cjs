const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync('src/services/whatsAppFixtureService.ts','utf8');
function load(db){
 const module={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(()=>({supabase:db}),module,module.exports);
 return module.exports;
}
const body='Your scheduled fixture has been updated.\n\nMatch: {{1}}\nDate: {{2}}\nKick-off: {{3}}\nVenue: {{4}}\n\nPlease check these updated details before travelling.';
test('approved fixture template mapping refuses incompatible templates',()=>{
 const api=load({});
 const template={name:'fixture_update',language:'en',category:'UTILITY',components:[{type:'BODY',text:body}]};
 assert.equal(api.fixtureUpdateTemplate([template]),template);
 for(const change of [{language:'en_US'},{category:'MARKETING'},{components:[{type:'BODY',text:body.replace('{{1}}','{{5}}')}]}]) assert.equal(api.fixtureUpdateTemplate([{...template,...change}]),null);
 assert.deepEqual(api.fixtureParameters({match:'A vs B',date:'10 October 2026',kickoff:'11:00',venue:'Park'}),{'body:1':'A vs B','body:2':'10 October 2026','body:3':'11:00','body:4':'Park'});
});
test('club fixture lookup is organisation scoped and preserves away order and date',async()=>{
 const calls=[];
 const db={from(table){const q={select(){return q},eq(...args){calls.push([table,'eq',...args]);return q},in(){return q},order(){return q},then(resolve){resolve({error:null,data:table==='club_fixtures'?[{id:'f',team_id:'t',opponent_id:'o',fixture_date:'2026-10-11',kickoff_time:'11:30:00',home_away:'away',venue_name:'Arena',venue_address:'SE28'}]:table==='teams'?[{id:'t',name:'Petts Wood Vets'}]:[{id:'o',name:'Meridian'}]})}};return q}};
 const fixtures=await load(db).loadWhatsAppFixtures('club');
 assert.equal(fixtures[0].match,'Meridian vs Petts Wood Vets');
 assert.equal(fixtures[0].date,'11 October 2026');
 assert.equal(fixtures[0].kickoff,'11:30');
 assert.equal(fixtures[0].venue,'Arena, SE28');
 assert.ok(calls.some(c=>c[0]==='club_fixtures'&&c[2]==='organisation_id'&&c[3]==='club'));
});
test('review form uses a fixture selector instead of raw template inputs',()=>{
 const ui=fs.readFileSync('src/components/admin/Communications/CommunicationComposerModal.tsx','utf8');
 assert.ok(ui.includes('setWhatsAppParameters(fixture ? fixtureParameters(fixture) : {})'));
 assert.ok(!ui.includes("field.replace(':', ' field ')"));
 assert.ok(ui.includes('!whatsAppFixtureId || !whatsAppConsent'));
});
