'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function trackedFiles() {
  const out = cp.execFileSync('git', ['ls-files', '-z'], {encoding:'buffer'});
  return out.toString('utf8').split('\0').filter(Boolean);
}

test('sensitive environment files are not tracked by git', () => {
  const files = trackedFiles();
  const bad = files.filter(f => /(^|\/)\.env(?:\..*)?$/i.test(f) && !/\.example$|\.sample$|\.template$/i.test(f));
  assert.deepEqual(bad, [], `Tracked sensitive environment files: ${bad.join(', ')}`);
});

test('repository does not track private-key or certificate files', () => {
  const files = trackedFiles();
  const bad = files.filter(f => /\.(?:pem|p12|pfx|key)$/i.test(f) && !/(?:fixtures|test-data|samples)\//i.test(f));
  assert.deepEqual(bad, [], `Review tracked key material: ${bad.join(', ')}`);
});

test('public result fetching avoids known invalid PostgREST FK hint', () => {
  const source = fs.readFileSync(path.join('src','pages','public','PublicResultsPage.tsx'),'utf8');
  assert.doesNotMatch(source, /results_home_team_id_fkey|results_away_team_id_fkey|fixtures_home_team_id_fkey|fixtures_away_team_id_fkey/);
});

test('public teams fetching avoids known nonexistent clubs.logo_url selection', () => {
  const source = fs.readFileSync(path.join('src','pages','public','PublicTeamsPage.tsx'),'utf8');
  assert.doesNotMatch(source, /clubs\s*\([^)]*\blogo_url\b/s);
});
