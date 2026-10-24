# TournamentHQ: Phase 1 database security tests

**Scope:** GitHub Actions, `staging` branch, disposable local Supabase only.
**Prerequisite:** previous workflow completed full migration replay successfully.

## What this patch does
- Keeps the entire green migration foundation unchanged.
- Adds a database-role-level smoke test (`tests/security/rls_tenant_smoke.sql`).
- Runs it **after** `supabase db reset --local --yes`, before stopping containers.
- Seeds synthetic auth users, profiles, two private organisations, two unpublished competitions and two sensitive finance payer records.
- Switches to PostgreSQL `authenticated` and `anon` roles with simulated JWT claims to exercise actual RLS and security-definer functions, rather than querying as postgres/service_role.
- Checks RLS enabled, club A versus B competition access, roles allowed to manage fixtures, finance row isolation, outsider denial and disabled public-club disclosure.
- Rolls all test inserts back on success; the entire container is destroyed after every run.

**Important:** This is a real permission test, not a claim that policies are correct. A missing SELECT/EXECUTE grant, an overly permissive policy, a missing object or a synthetic seed incompatibility will produce a red build. Such a failure is valuable diagnostic information. This patch does **not** grant extra privileges, disable RLS, edit production migrations or mark tests as successful when unauthorised access is observed.

## Apply on Windows PowerShell
1. Open your existing local `bhmff-website` project checkout.
2. `git switch staging`
3. Extract the ZIP at the repository root, preserving folders, replacing the workflow.
4. `git add .github/workflows/local-supabase-validation.yml tests/security/rls_tenant_smoke.sql`
5. `git diff --cached --stat`
6. `git commit -m "test(ci): add real RLS and tenant isolation smoke tests"`
7. `git push origin staging`
8. In GitHub Actions, run **TournamentHQ local Supabase validation** on `staging`.

## Interpretation
- **Green:** the documented Phase 1 test cases passed after migration replay.
- **Red:** inspect the new **Run real RLS, role and tenant-isolation smoke tests** step, not Docker-pull logs.
- Test output contains labelled `PASS`/`FAIL` statements.

## Not yet covered
- Youth/minor opt-in and visibility behaviour with a fully populated public team/season/squad.
- Result-writing UPDATE/INSERT privileges through the API or assigned-team paths.
- Storage upload and download permissions.
- Cross-tenant finance allocations / data writes.
- Remote/production configuration parity: the existing schema includes CI-only baseline reconstructions.

Future phases will add these only after the first suite is stable.
