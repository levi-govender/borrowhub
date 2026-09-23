# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-29-booking-equipment-name`
- Task: `ENH-29` Booking equipment name — DONE

## What changed

- Employee booking JSON includes `equipmentName`
- Home, My bookings, and the booking screen show that name, with the asset tag still available
- An idempotency replay stored before this field returns an empty name

## Verification

- `./gradlew test --tests com.borrowhub.backend.booking.BookingMineCancelTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/mobile test` — 13 passed; typecheck
- Expo UI not run

## Next

`P0-01` still BLOCKED.
