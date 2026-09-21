# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 2 booking correctness — admin inventory, bookings, audit (P2-05)
- Branch: `feature/p2-05-admin-inventory-bookings-audit`
- Task: `P2-05` admin inventory, bookings, audit — DONE

## What changed

- Flyway `V002` persists `app_user.role` (`EMPLOYEE`/`ADMIN`)
- Local demo identity reads `X-Demo-Role`; Java `requireAdmin()` enforces independently
- Admin equipment list includes archived; create/update with audit
- Admin booking summary, list (including overdue), detail+audit, cancel-with-reason after start
- BFF `/api/v1/admin/*` forwards demo headers including role; CORS allows PATCH
- Admin web: dashboard, inventory create, bookings, overdue, audit

## Verification

- `cd services/backend && ./gradlew test` — including `AdminApiTest`
- `pnpm --filter @borrowhub/bff test` and `typecheck`
- `pnpm --filter @borrowhub/web test`, `typecheck`, `build`
- Browser at http://localhost:5173: dashboard 10 active assets; inventory listed 10 then created `HUB-ADMIN-01`; search PHONE-001 filtered to one row; bookings empty state. Employee BFF call without `X-Demo-Role: ADMIN` returned `403 FORBIDDEN`.

## Next

After merge: Phase 3 `P3-01` Entra PKCE/OBO. `P0-01` and `P0-02` remain open. Mobile/web employee booking UI still later.
