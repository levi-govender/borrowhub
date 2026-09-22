# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-06-admin-inventory`
- Task: `MVP-06` Admin inventory — DONE (web GET/PATCH asset; Java still authorizes)

## What changed

- Admin web `get`/`update` for `/api/v1/admin/equipment/{id}`
- Inventory table tag opens **Edit asset** (location, status, archive via PATCH)
- Create/edit hidden unless `/me` role is ADMIN

## Verification

- `pnpm --filter @borrowhub/web test` — 6 passed
- `pnpm --filter @borrowhub/web typecheck`
- `pnpm --filter @borrowhub/web build`
- Playwright / live dashboard not run this slice (no Compose stack)

## Next

After merge: `MVP-07` admin bookings/overdue polish. `P0-01` and `P0-02` remain open. `MVP-02` catalogue polish still TODO.
