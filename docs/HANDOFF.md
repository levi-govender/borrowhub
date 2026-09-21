# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 2 booking correctness — my bookings and cancel (P2-03) complete
- Branch: `feature/p2-03-my-bookings-cancel`
- Task: `P2-03` my bookings and cancel — DONE

## What changed

- Java `GET /v1/bookings` and `GET /v1/bookings/{id}` return only the caller's bookings (other users → 404)
- `POST /v1/bookings/{id}/cancel` locks equipment, cancels `RESERVED` before start, writes `BOOKING_CANCELLED` audit, and is idempotent
- BFF proxies list/detail/cancel with demo identity and `Idempotency-Key` on cancel
- Demo user upsert retries if two requests create the same identity at once

## Verification

- `cd services/backend && ./gradlew test` — including `BookingMineCancelTest`
- `pnpm --filter @borrowhub/bff test` and `typecheck`

## Next

After merge: `feature/p2-04-collection-return`. `P0-01` and `P0-02` remain open. Mobile/web booking UI still later.
