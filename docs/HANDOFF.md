# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 4 — user/device/cloud tests (P4-03)
- Branch: `feature/p4-03-e2e-tests`
- Task: `P4-03` — DONE (Playwright local + Pixel 5; cloud skipped)

## What changed

- Playwright admin journeys: dashboard signed in as `admin-1`, inventory search `PHONE-001`
- Device: Pixel 5 project. Cloud spec skips without `CLOUD_WEB_URL` (`P0-01`)
- CI Playwright job starts Compose `--profile apps`. Local uses installed Chrome (`channel: chrome`)

## Verification

- Compose backend/BFF healthy
- `pnpm --filter @borrowhub/web test:e2e` — 4 passed, 2 skipped
- No cloud URL; no native mobile e2e

## Next

After merge: `feature/p4-04-runbooks`. `P0-01` and `P0-02` remain open.
