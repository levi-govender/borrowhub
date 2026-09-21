# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 2 booking correctness — reservation create (P2-01) complete
- Branch: `feature/p2-01-reservation-transaction`
- Task: `P2-01` reservation transaction — DONE

## What changed

- Java `POST /v1/bookings` locks the equipment row, upserts demo identity (`X-Demo-Object-Id`, optional `X-Demo-Tenant-Id`), checks ACTIVE + policy + overlap, then persists booking and `BOOKING_CREATED` audit in one transaction
- Demo identity is on only for `dev` profile and tests; production default remains off
- Tests pin the clock at `2026-09-21T10:00:00Z`
- BFF `POST /api/v1/bookings` forwards the body and demo headers; does not store bookings

## Verification

- `cd services/backend && ./gradlew test` — `BookingCreateTest` 5/5
- `pnpm --filter @borrowhub/bff test` and `typecheck`

## Next

After merge: `feature/p2-02-idempotency`. `P0-01` (Azure tenancy) and `P0-02` (frontend spike) remain open. Clients still need a booking form (later slices).
