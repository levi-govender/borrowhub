# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-03-create-reservation`
- Task: `MVP-03` Create reservation — DONE (mobile POST via BFF; Java still owns overlap)

## What changed

- Mobile `createBooking` posts `{ equipmentId, startAt, endAt }` with UUID `Idempotency-Key` and session `X-Demo-Object-Id`
- Detail screen **Reserve this window** (same tomorrow 07:00–10:00 UTC window as availability check); confirmation shows booking id and status
- Inactive equipment cannot reserve from the UI

## Verification

- `pnpm --filter @borrowhub/mobile test` — 6 passed
- `pnpm --filter @borrowhub/mobile typecheck`
- Expo UI not launched this slice

## Next

After merge: `MVP-04` my bookings / cancel on mobile. `P0-01` and `P0-02` remain open. `MVP-02` catalogue polish still TODO.
