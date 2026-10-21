# TournamentHQ CI foundation (additive overlay)

## Important about the uploaded ZIP
The supplied source ZIP flattened all directory paths. That makes it impossible to verify the complete repository structure or safely patch source modules from the archive alone. This package therefore adds only scoped new files at their expected project paths. It does **not** replace existing tests or app code.

## What is included
- `tests/quality/repository-security.test.cjs`: tracked-env/key files and known invalid PostgREST relationship assertions.
- `tests/quality/safeguarding-contract.test.cjs`: basic presence check, **not** a proof that minor player details are protected. A real seeded access policy test is still required.
- `.github/workflows/quality.yml`: npm build, source regressions, checks, vulnerability audit report. Browser test runs on staging only when `THQ_STAGING_URL` repository variable is configured.
- `.github/workflows/performance.yml`: weekly/manual read-only staging browser baseline; no load generation.
- `scripts/public-performance-baseline.cjs`: timings and JS errors, produces `performance-results.json`.

## Setup
1. Copy this package's folders **into the existing repository** while keeping all existing files. Do not replace other workflows.
2. Set GitHub Repository Settings → Secrets and variables → Actions → Variables → `THQ_STAGING_URL` to your isolated HTTPS staging deployment (same seeded public organisations, if used in existing browser tests). No production Supabase secrets needed.
3. On local Windows terminal: `node --test tests/quality/*.test.cjs` (PowerShell wildcard support varies; use individual files if needed).
4. Commit added files, open PR and review Actions checks. Set branch rules to require `Build and repository contracts`, and enable `Read-only public browser regression (staging)` only after staging configured and stable.

## Caveats and rollout
- Some existing source tests may need mocks or environment setup. CI will surface these; they are intentionally not hidden.
- Existing public browser suite is read-only but requires correct slugs and accessible staging data. Do not point automated tests at production without explicit approval.
- Dependency audit is report-only for initial rollout; only change to blocking after reviewing baseline advisories.
- No automated authenticated isolation, finance/Stripe, permissions, WhatsApp or database RLS testing is claimed. They require seeded disposable fixtures, credentials and local Supabase/isolated test infrastructure.
- GitHub Actions workflows cannot themselves stop direct pushes to main; enable branch protection/required checks.
- The timing baseline isn't a load test and has no fabricated performance SLA. k6, Lighthouse CI and full modules follow after a representative staging environment exists.
