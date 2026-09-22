# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-07-admin-bookings-overdue`
- Task: `MVP-07` Admin bookings/overdue — DONE (dashboard jump to overdue list)

## What changed

- Dashboard cards open bookings with the matching status; overdue uses `CHECKED_OUT` + `overdue=true`
- Overdue rows highlighted; admin cancel still requires `allowedActions` and ADMIN
- Bookings filter Reset

## Verification

- `pnpm --filter @borrowhub/web test` — 8 passed
- `pnpm --filter @borrowhub/web typecheck` and `build`
- Playwright not re-run (no Compose stack)

## Next

After merge: `MVP-08` audit and failure handling. `P0-01` and `P0-02` remain open. `MVP-02` catalogue polish still TODO.
