# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 1 local vertical slice
- Branch: `feature/p1-03-bff-catalogue`
- Task: `P1-03` BFF catalogue — DONE

## What changed

- BFF `GET /api/v1/equipment`, `/{id}`, `/{id}/availability` proxy Java `/v1/*`
- Maps Java 4xx, timeouts (504), and unavailability (503); forwards `X-Correlation-Id`
- `/health/ready` checks Java readiness
- `make test-bff` runs Fastify inject tests with a mock fetch

## Verification

`pnpm --filter @borrowhub/bff test` and `pnpm --filter @borrowhub/bff typecheck`

## Next

After merge: `feature/p1-04-mobile-catalogue` (or web inventory `P1-05`) from updated `main`.
