# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-10-checked-out-list`
- Task: `ENH-10` Checked-out inventory — DONE

## What changed

- Admin equipment list accepts `checkedOut=true` (exists a CHECKED_OUT booking)
- Each admin row includes `checkedOutTo` and `loanOverdue`
- Inventory table has a With column and a Checked out only switch
- Employee catalogue rows set `checkedOutTo` null and `loanOverdue` false

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/web test` — 15 passed; typecheck
- `pnpm --filter @borrowhub/bff test` — 13 passed

## Next

`P0-01` still BLOCKED.
