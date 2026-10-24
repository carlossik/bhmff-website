#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const cp = require('node:child_process');
const path = '.github/workflows/local-supabase-validation.yml';
const branch = cp.execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim();
if (branch !== 'staging') {
  console.error(`Refusing to edit the workflow on branch '${branch}'. Switch to staging first.`);
  process.exit(1);
}
const before = fs.readFileSync(path, 'utf8');
const anchor = '      - name: Show local services (no secrets)';
const stepName = 'Run public club youth safeguarding smoke tests';
const insertion = [
  '      - name: ' + stepName,
  '        run: |',
  '          set -euo pipefail',
  '          test "$GITHUB_REF_NAME" = "staging"',
  '          test -f tests/security/youth_safeguarding_smoke.sql',
  "          mapfile -t dbs < <(docker ps --format '{{.Names}}' | grep '^supabase_db_' || true)",
  '          if [ "${#dbs[@]}" -ne 1 ]; then',
  '            echo "Expected one disposable Supabase DB, found ${#dbs[@]}" >&2',
  '            exit 1',
  '          fi',
  "          docker exec -i \"${dbs[0]}\" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 \\",
  '            < tests/security/youth_safeguarding_smoke.sql',
  ''
].join('\n');
if (before.includes(stepName)) {
  console.log('Safeguarding workflow step already installed.');
  process.exit(0);
}
if (!before.includes('Run real RLS, role and tenant-isolation smoke tests') ||
    !before.includes('      - name: Apply migrations to local database only') ||
    before.split(anchor).length !== 2) {
  console.error('Workflow has changed; refusing to insert step without checking anchor.');
  process.exit(1);
}
const after = before.replace(anchor, insertion + anchor);
fs.writeFileSync(path, after, 'utf8');
console.log('Added safeguarding tests after existing RLS smoke tests.');
