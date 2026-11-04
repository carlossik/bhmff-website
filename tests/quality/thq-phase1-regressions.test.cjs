const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');

test('participant terminology defaults to club and includes school/university options',()=>{
 const s=read('src/config/participantTerminology.ts');
 assert.match(s,/school:.*School.*Schools/);
 assert.match(s,/university:.*University.*Universities/);
 assert.match(s,/academy:.*Academy.*Academies/);
 assert.match(s,/: labels\.club/);
});
test('club registry retains clubs persistence and uses configurable UI terminology',()=>{
 const s=read('src/components/admin/Clubs/ClubsManager.tsx');
 assert.match(s,/\.from\('clubs'\)/);
 assert.match(s,/getParticipantLabels\(/);
 assert.match(s,/Add \{labels\.singular\}/);
 assert.match(read('src/components/admin/Clubs/ClubModal.tsx'),/labels\.singular/);
 assert.match(read('src/components/admin/Clubs/ClubsTable.tsx'),/labels\.plural/);
});
test('fixture date field accepts past dates for previously played matches',()=>{
 const s=read('src/components/admin/Fixtures/FixtureModal.tsx');
 assert.match(s,/type="date"/);
 assert.match(s,/handleKickoffDateChange\(event\.target\.value\)/);
 assert.doesNotMatch(s,/min=\{minimumFixtureDate\}/);
 assert.doesNotMatch(s,/selectedDate <\s*getTodayLocalDate\(/);
});
test('public sponsorship selects have explicit readable foreground and background colours',()=>{
 const page=read('src/pages/public/PublicContactPage.tsx');
 const css=read('src/styles.css');
 assert.match(page,/thq-public-contact-page min-h-screen/);
 assert.match(css,/\.thq-public-contact-page select option[\s\S]*?background-color:\s*#10190f;[\s\S]*?color:\s*#ffffff;/);
 assert.match(css,/\.thq-public-contact-page select \{[\s\S]*?color-scheme:\s*dark/);
});
test('existing BHMFF competition data and role policies are untouched by patch',()=>{
 const s=read('src/services/accessControl.ts');
 assert.match(s,/'match_official'/);
 assert.match(s,/organisation_type: OrganisationType/);
});
