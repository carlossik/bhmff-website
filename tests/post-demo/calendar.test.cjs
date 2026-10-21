const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const m={exports:{}};const compiled=ts.transpileModule(fs.readFileSync('src/services/clubCalendarService.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','module','exports',compiled)(()=>({supabase:{}}),m,m.exports);
const {localToInstant,zonedInput}=m.exports;
test('session edits use event timezone independent of device timezone',()=>{assert.equal(localToInstant('2026-10-18T18:00','Europe/London'),'2026-10-18T17:00:00.000Z');assert.equal(localToInstant('2026-10-25T18:00','Europe/London'),'2026-10-25T18:00:00.000Z');assert.equal(zonedInput('2026-10-18T17:00:00Z','Europe/London'),'2026-10-18T18:00')});
test('nonexistent spring-forward local time is rejected',()=>assert.throws(()=>localToInstant('2027-03-28T01:30','Europe/London'),/does not exist/));
test('malformed session dates fail before a database write',()=>assert.throws(()=>localToInstant('invalid','Europe/London'),/valid date/));
