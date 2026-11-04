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

test('fixture date picker supports historical dates without native input', () => {
 const modal = read(
     'src/components/admin/Fixtures/FixtureModal.tsx'
 );
 const picker = read(
     'src/components/admin/Fixtures/FixtureDatePicker.tsx'
 );

 // Competition fixtures use the new date-picker component.
 assert.match(
     modal,
     /import\s*\{\s*FixtureDatePicker\s*\}/
 );
 assert.match(modal, /<FixtureDatePicker\b/);

 // Retain the existing fixture date update handler.
 assert.match(
     modal,
     /function handleKickoffDateChange\(/
 );

 // Prevent the old minimum-date restriction returning.
 assert.doesNotMatch(
     modal,
     /min=\{minimumFixtureDate\}/
 );
 assert.doesNotMatch(
     modal,
     /selectedDate\s*<\s*getTodayLocalDate\(/
 );

 // Ensure the replacement component has been implemented.
 assert.match(picker, /export\s+(?:function|const)\s+FixtureDatePicker\b/);
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
