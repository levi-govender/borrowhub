# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-04-my-bookings-cancel`
- Task: `MVP-04` My bookings/cancel — DONE (mobile list+cancel via BFF; Java owns ownership and too-late)

## What changed

- Mobile `listMine` GET `/api/v1/bookings` and `cancelBooking` POST `/api/v1/bookings/{id}/cancel` with UUID `Idempotency-Key`
- Catalogue **My bookings** screen; Cancel only when `allowedActions` includes `CANCEL`

## Verification

- `pnpm --filter @borrowhub/mobile test` — 7 passed
- `pnpm --filter @borrowhub/mobile typecheck`
- Expo UI not launched this slice

## Next

After merge: `MVP-05` collection/return on mobile. `P0-01` and `P0-02` remain open. `MVP-02` catalogue polish still TODO.
