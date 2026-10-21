const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function load(path,overrides){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(n=>overrides[n]??require(n),m,m.exports);return m.exports}
function nodes(tree){return Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[]}
test('WhatsApp onboarding allows skip and chooses the correct Business app or Platform signup mode',()=>{
 let choice='later',back=0,continued=0;function Panel(){};
 const {WhatsAppSetupStep}=load('src/components/onboarding/WhatsAppSetupStep.tsx',{react:{useState:()=>[choice,v=>{choice=v}]},'../admin/Communications/WhatsAppConnectionPanel':{WhatsAppConnectionPanel:Panel}})
 const render=()=>nodes(WhatsAppSetupStep({organisationId:'org',onBack:()=>back++,onContinue:()=>continued++}));let all=render();assert(!all.some(n=>n.type===Panel));all.find(n=>n.type==='button'&&n.props.children==='Skip and finish setup').props.onClick();assert.equal(continued,1)
 all.find(n=>n.type==='input'&&n.props.value==='business_app').props.onChange();all=render();assert.equal(all.find(n=>n.type===Panel).props.initialMode,'business_app');all.find(n=>n.type==='input'&&n.props.value==='platform').props.onChange();all=render();assert.equal(all.find(n=>n.type===Panel).props.initialMode,'platform');all.find(n=>n.type==='button'&&n.props.children==='Back').props.onClick();assert.equal(back,1)
})
