
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
 return fs.readFileSync(
     path.join(process.cwd(), relativePath),
     'utf8'
 );
}

test('sponsorship fields use custom themed dropdowns', () => {
 const source = read(
     'src/components/public/PublicSponsors.tsx'
 );

 const dropdowns = source.match(/<ThemedSelect\b/g) ?? [];

 // The sponsorship form must have two custom dropdowns.
 assert.equal(dropdowns.length, 2);

 // Both fields must retain their existing state bindings.
 assert.match(source, /form\.sponsorshipInterest/);
 assert.match(source, /form\.estimatedBudget/);

 // The old native dropdowns must not return.
 assert.doesNotMatch(source, /<select\b/i);
});

test('custom dropdown provides dark styling and accessibility', () => {
 const source = read(
     'src/components/common/ThemedSelect.tsx'
 );

 // Ensure that the popup is controlled by our component.
 assert.match(source, /aria-expanded/);
 assert.match(source, /onKeyDown/);

 // Ensure the custom dropdown uses dark styling.
 assert.match(source, /bg-/);
 assert.match(source, /text-/);
});
