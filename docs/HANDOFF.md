# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-13-open-loan-from-inventory`
- Task: `ENH-13` Open loan from inventory — DONE

## What changed

- Admin equipment rows include `checkedOutBookingId` for the CHECKED_OUT loan
- The inventory **With** name opens that booking

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/web typecheck`

## Next

`P0-01` still BLOCKED.
