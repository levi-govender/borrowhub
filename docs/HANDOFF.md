# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-18-employee-cancel-reason`
- Task: `ENH-18` Employee cancel reason — DONE

## What changed

- Employee cancel accepts an optional reason (max 500). A blank reason stays null.
- The reason is stored on the booking, included in the idempotency hash, and shown on home and My bookings.
- Admin cancel still requires a reason.

## Verification

- `./gradlew test --tests com.borrowhub.backend.booking.BookingMineCancelTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/bff test` — 13 passed
- `pnpm --filter @borrowhub/mobile test` — 12 passed; typecheck

## Next

`P0-01` still BLOCKED.
