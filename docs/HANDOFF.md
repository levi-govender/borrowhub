# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-23-admin-audit`
- Task: `ENH-23` Admin audit list — DONE

## What changed

- Admins can list audit events newest first at `GET /v1/admin/audit`
- Employees are forbidden
- The admin app has an Audit tab for the latest page

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/bff test` — 13 passed
- `pnpm --filter @borrowhub/web exec tsc --noEmit`
- The Audit tab was not opened in a browser

## Next

`P0-01` still BLOCKED.
