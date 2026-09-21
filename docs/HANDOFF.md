# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 4 repeatability — CI/CD (P4-01)
- Branch: `feature/p4-01-ci-cd`
- Task: `P4-01` CI/CD and immutable deploys — DONE (workflows + local CI equivalent; Azure release not run)

## What changed

- `.github/workflows/ci.yml` — PR/`main`: JS tests+builds, Gradle tests, Bicep compile
- `.github/workflows/release.yml` — manual; images tagged with git SHA; Container Apps/Flyway/SWA update; skips Azure when OIDC/ACR secrets are missing (`P0-01`)
- `make ci` mirrors GitHub CI locally

## Verification

- `pnpm install --frozen-lockfile`; typecheck; BFF/web/mobile tests; web+BFF production builds
- `./gradlew test` BUILD SUCCESSFUL
- No GitHub-hosted run until this branch is pushed; no Azure deploy

## Next

After merge: `feature/p4-02-observability`. `P0-01` and `P0-02` remain open.
