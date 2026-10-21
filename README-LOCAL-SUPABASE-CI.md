# TournamentHQ — no-subscription Supabase CI (first stage)

This package is **additive**. It does not overwrite existing GitHub Actions quality/performance workflows, existing tests, or application code. It adds a manually triggered local Supabase schema-check workflow.

## Install
Extract at the repository root, preserving `.github/workflows/` and `scripts/`. On the existing `staging` branch, stage only these files:

```powershell
git add .github/workflows/local-supabase-validation.yml scripts/assert-local-test-config.cjs README-LOCAL-SUPABASE-CI.md
git commit -m "ci: validate schema in disposable local Supabase"
git push origin staging
```

At GitHub > Actions > TournamentHQ local Supabase validation > Run workflow, select `staging` then run. No cloud Supabase subscription, staging URL, Netlify deployment or GitHub secrets are required. The GitHub-hosted runner uses Docker. Usage remains subject to GitHub Actions allowance/billing.

## What this checks
1. No remote database credentials are present in the workflow environment.
2. CLI starts a disposable local Supabase stack.
3. All repository migrations apply, in sequence, against that local database.

This is a **migration readiness check**, not yet an end-to-end test or an authenticated RLS test. The repo has dozens of migrations and the committed archive doesn't include `supabase/seed.sql`, although `config.toml` references it. If this check fails, inspect the FIRST failing migration or missing seed reported in its logs. Do not change production or mask failures. Once the schema starts cleanly, the next increment is an isolated seed of synthetic organisations/users and real RLS/REST/Playwright checks against the local service.

## Local trial (optional, requires Docker Desktop running)
```powershell
node scripts/assert-local-test-config.cjs
npx supabase start
npx supabase db reset --local --yes
npx supabase stop --no-backup
```

Do not run `supabase link`, `supabase db push`, or `supabase db reset --linked` as part of this workflow. Never feed production credentials or real player data into test fixtures.

The existing `quality.yml` remains unchanged and should continue to run on main and pull requests. The new workflow is manual while the migration/seed state is being validated; promote it to a required pull-request check only after it passes reliably.
