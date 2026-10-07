const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync('src/components/admin/Communications/CommunicationComposerModal.tsx','utf8');
const tree=ts.createSourceFile('composer.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const node=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='isSelectableProvider');
const code=ts.transpileModule(node.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const selectable=new Function(code+'; return isSelectableProvider;')();
test('configured dry-run channels are selectable without enabling unconfigured channels',()=>{
 for(const provider of ['meta','resend','twilio']){
  assert.equal(selectable({provider,configured:true,dryRun:true}),true);
  assert.equal(selectable({provider,configured:true,dryRun:false}),true);
  assert.equal(selectable({provider,configured:false,dryRun:true}),false);
 }
 assert.equal(selectable({provider:'unconfigured',configured:true,dryRun:true}),false);
 assert.equal(selectable({provider:'mock',configured:true,dryRun:false}),false);
 assert.equal(selectable({provider:'mock',configured:true,dryRun:true}),true);
 assert.equal(selectable(undefined),false);
});
