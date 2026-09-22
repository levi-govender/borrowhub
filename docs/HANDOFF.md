# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-04-admin-calendar`
- Task: `ENH-04` Admin calendar — DONE (office week; no new domain states)

## What changed

- Java `GET /v1/admin/bookings` accepts `from` and `to` (ISO instants, both required together) and filters half-open overlap
- BFF forwards those query params
- Admin web **Calendar** tab: Monday–Sunday in `Africa/Johannesburg`; open loans by default; click opens the booking drawer

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/bff test` — 13 passed; typecheck
- `pnpm --filter @borrowhub/web test` — 14 passed; typecheck; `vite build`

## Next

`P0-01` still BLOCKED. Tracker has no further ENH rows after ENH-04.
