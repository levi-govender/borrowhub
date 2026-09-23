# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-08-damage-filter`
- Task: `ENH-08` Damage-note filter — DONE

## What changed

- `GET /v1/admin/bookings?damaged=true` keeps bookings whose `damage_note` is non-blank
- List items include `damaged`
- Admin bookings toolbar has **Damage notes only**

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/web test` — 15 passed; typecheck
- `pnpm --filter @borrowhub/bff test` — 13 passed

## Next

`P0-01` still BLOCKED.
