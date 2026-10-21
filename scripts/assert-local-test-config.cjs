#!/usr/bin/env node
'use strict';
// Refuse accidental remote-backed database runs. Do not print environment values.
const fs = require('node:fs');
const assert = require('node:assert/strict');
assert.ok(fs.existsSync('supabase/config.toml'), 'Run from TournamentHQ project root');
assert.ok(fs.existsSync('supabase/migrations'), 'Supabase migrations directory missing');
const forbidden = ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PROJECT_ID','SUPABASE_PROJECT_REF','DATABASE_URL','PGHOST','PGPASSWORD'];
const set = forbidden.filter(k => !!process.env[k]);
assert.deepEqual(set, [], `Remote/privileged credentials are present in this test environment: ${set.join(', ')}`);
const config = fs.readFileSync('supabase/config.toml', 'utf8');
assert.match(config, /^\[db\]/m, 'No local database configuration');
console.log('Safe local-only database test context confirmed.');
