# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 1 local vertical slice
- Branch: `feature/p1-04-mobile-catalogue`
- Task: `P1-04` mobile list/detail — DONE

## What changed

- Employee app catalogue: search, category chips, reset, loading/empty/error/retry
- Detail: description, booking policy, availability check for tomorrow 09:00–12:00 office time
- Client calls BFF only (`/api/v1/equipment`)

## Verification

`pnpm --filter @borrowhub/mobile typecheck` and `pnpm --filter @borrowhub/mobile test`

Expo was not run on a device this session. Use `make backend`, `make bff`, `make mobile` after merge.

## Next

After merge: `feature/p1-05-web-inventory` from updated `main`.
