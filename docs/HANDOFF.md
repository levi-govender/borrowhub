# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 2 booking correctness — idempotency (P2-02) complete
- Branch: `feature/p2-02-idempotency`
- Task: `P2-02` idempotency — DONE

## What changed

- Java stores `Idempotency-Key` on `POST /v1/bookings` in `idempotency_record` in the same transaction as the booking
- Same user + route + key + body replays the stored 201; a different body returns `409 IDEMPOTENCY_KEY_REUSED`
- After the equipment row lock, the service re-reads the idempotency row so a concurrent retry is not treated as an overlap
- BFF requires a UUID `Idempotency-Key` and forwards it; it does not store keys

## Verification

- `cd services/backend && ./gradlew test` — including `BookingIdempotencyTest`
- `pnpm --filter @borrowhub/bff test` and `typecheck`

## Next

After merge: `feature/p2-03-my-bookings-cancel`. `P0-01` and `P0-02` remain open.
