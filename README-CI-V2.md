# TournamentHQ CI v2 — validated against committed source structure

This overlay updates only `.github/workflows/quality.yml` and `.github/workflows/performance.yml`.
It does not modify any app module or existing test. Retain all existing tests and `tests/quality` from the previously installed foundation.

## Evidence
The committed source ZIP contains `tests/public`, `tests/whatsapp`, `tests/post-demo`, `tests/admin`, and `tests/officials`, plus Playwright and PGlite dependencies. Tests/quality and CI workflows are **not** in that snapshot (they were new local work). The archive contains `.env` and `.env.local` because `git archive HEAD` captures earlier committed content even after `git rm --cached`; do not distribute that archive publicly. Do not copy those files into this overlay.

## Jobs
- Build and offline regression: npm clean install/build, existing quality checks, read-only source/regression checks, PGlite-isolated DB tests.
- Browser staging: public Playwright regression; runs only if repository `THQ_STAGING_URL` is configured. Staging must seed `bhmff` and `pettswood-vets1` (or override variables). This job is **skipped** otherwise.
- Audit: report only; review findings before making it blocking.
- Performance: existing weekly/manually-triggered browser timing baseline, staged only. This is not a load test.

## Deployment cautions
Only enable `THQ_STAGING_URL` on an isolated staging frontend pointing to staging Supabase with test data. Do not configure a production URL. `quality.yml` still needs a real GitHub Actions run before it can be claimed passing. Individual existing tests may require adaptation for CI; fix failures instead of ignoring them. Deno-based WhatsApp unit tests are not wired in this version until the execution and environment allowances are verified; they remain runnable locally via `npm run test:whatsapp`.

## Security
5/5 local quality checks passed according to the user. `.env` and `.env.local` were previously committed and may remain in Git history. Untracking does not expunge history or revoke secrets; check whether real secrets existed and rotate privileged credentials as necessary. No secrets are needed for build-and-regression.

## Next
Validate workflows on a PR; establish protected branch rules; add authenticated test accounts and seeded Supabase staging for role checks and WhatsApp readiness. For more extensive performance/load checks, introduce nonproduction k6 tests and baseline thresholds once staging is representative.
