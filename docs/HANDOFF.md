# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-05-collect-return`
- Task: `MVP-05` Collection/return — DONE (mobile collect/return via BFF; Java owns windows)

## What changed

- Mobile `collectBooking` / `returnBooking` POST `/api/v1/bookings/{id}/collect` and `/return` with UUID `Idempotency-Key`
- My bookings shows Collect / Return only when `allowedActions` includes them

## Verification

- `pnpm --filter @borrowhub/mobile test` — 8 passed
- `pnpm --filter @borrowhub/mobile typecheck`
- Expo UI not launched this slice

## Next

After merge: `MVP-06` admin inventory polish (web inventory already exists from P2-05). `P0-01` and `P0-02` remain open. `MVP-02` catalogue polish still TODO.
