#!/usr/bin/env node
'use strict';
// Local repo patch installer. Does not contact Supabase or modify production.
const fs = require('node:fs');
const p = '.github/workflows/local-supabase-validation.yml';
const yaml = fs.readFileSync(p, 'utf8');
const anchor = '      - name: Normalize legacy migration filenames for CI only\n'.replace('\\n','\n');
const tag = 'Align historical club-results award field with deployed schema (CI only)';
if (yaml.includes(tag)) {
  console.log('CI schema parity step already installed.');
  process.exit(0);
}
if (!yaml.includes(anchor) || !yaml.includes('Restore missing registered goal scorer link (CI only)')) {
  throw new Error('Unexpected workflow structure. Aborting rather than overwriting it.');
}
const step = [
 '      - name: ' + tag,
 '        run: |',
 '          test "$GITHUB_REF_NAME" = "staging"',
 '          test -f tests/ci/20260820000001_ci_club_result_award_column.sql',
 '          test ! -e supabase/migrations/20260820000001_ci_club_result_award_column.sql',
 '          cp tests/ci/20260820000001_ci_club_result_award_column.sql supabase/migrations/20260820000001_ci_club_result_award_column.sql',
 '',
].join('\n');
const updated = yaml.replace(anchor, step + anchor);
if (updated === yaml || !updated.includes(tag) || updated.split(tag).length !== 2) {
  throw new Error('Failed to install exactly one CI schema parity step.');
}
fs.writeFileSync(p, updated, 'utf8');
console.log('Added CI-only schema parity step before migration normalization.');
