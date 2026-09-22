# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-08-audit-failures`
- Task: `MVP-08` Audit and failure handling — DONE (UI traces + audit changeSummary)

## What changed

- Web and mobile API errors include BFF `code` and `traceId` (or `X-Correlation-Id`) in the message
- Admin booking audit lines include Java `changeSummary`
- Runbook points operators at that trace for Kusto

## Verification

- `pnpm --filter @borrowhub/web test` — 9 passed; typecheck; build
- `pnpm --filter @borrowhub/mobile test` — 8 passed; typecheck
- Playwright not re-run

## Next

After merge: `MVP-02` catalogue polish (list/detail already exist). `P0-01` and `P0-02` remain open. Product MVP rows 01 and 03–08 are done.
