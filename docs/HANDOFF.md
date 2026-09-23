# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-12-overdue-assets`
- Task: `ENH-12` Overdue assets — DONE

## What changed

- Admin equipment list accepts `loanOverdue=true` (CHECKED_OUT and end before the Java clock)
- Inventory toolbar has **Overdue loans only**

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/web test` — 15 passed; typecheck
- `pnpm --filter @borrowhub/bff test` — 13 passed

## Next

`P0-01` still BLOCKED.
