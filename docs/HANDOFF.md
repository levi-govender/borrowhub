# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-24-audit-filter`
- Task: `ENH-24` Audit filter — DONE

## What changed

- `GET /v1/admin/audit` accepts `action` and `entityType` (`booking` or `equipment`)
- An unknown record type is a validation error
- The Audit tab has an action menu and record-type chips

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/bff test` — 13 passed
- `pnpm --filter @borrowhub/web exec tsc -p tsconfig.app.json --noEmit`
- The Audit tab was not opened in a browser

## Next

`P0-01` still BLOCKED.
