'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('public team display logic has safeguarding coverage marker', () => {
  const source = fs.readFileSync(path.join('src','pages','public','PublicTeamsPage.tsx'), 'utf8');
  // Awareness contract only: not a substitute for a seeded child privacy API test.
  assert.match(source, /age_group|show_public_player_names|public_names_enabled/i);
});
