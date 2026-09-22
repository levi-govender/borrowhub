# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-03-reminders`
- Task: `ENH-03` Reminders — DONE (in-app kinds; no push/email)

## What changed

- Java `BookingReminders` adds `COLLECT_NOW`, `RETURN_NOW`, `OVERDUE` on booking JSON using the injected clock
- Mobile My bookings shows those lines. No email/push (P0-01)

## Verification

- `./gradlew test --tests com.borrowhub.backend.booking.BookingRemindersTest` succeeded (no Docker)
- `pnpm --filter @borrowhub/mobile test` — 10 passed; typecheck

## Next

`P0-01` still BLOCKED. Optional ENH-04 admin calendar.
