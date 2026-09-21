# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 2 booking correctness — collection and return (P2-04) complete
- Branch: `feature/p2-04-collection-return`
- Task: `P2-04` collection and return — DONE

## What changed

- Java `POST /v1/bookings/{id}/collect` locks equipment, allows collection from 15 minutes before start until reserved end, blocks a second CHECKED_OUT on the same asset, audits `BOOKING_COLLECTED`
- `POST /v1/bookings/{id}/return` returns a CHECKED_OUT loan (including overdue), audits `BOOKING_RETURNED`
- Both are owner-only, idempotent, and proxied by the BFF

## Verification

- `cd services/backend && ./gradlew test` — including `BookingCollectReturnTest`
- `pnpm --filter @borrowhub/bff test` and `typecheck`

## Next

After merge: `feature/p2-05-admin-inventory-bookings-audit`. `P0-01` and `P0-02` remain open. Mobile/web booking UI still later.
