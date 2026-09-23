# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-16-inventory-search`
- Task: `ENH-16` Inventory search — DONE

## What changed

- Admin equipment `query` matches asset tag, name, location, and the borrower display name on a RESERVED or CHECKED_OUT loan
- Inventory search placeholder says so
- Employee catalogue search is still tag and name only

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL

## Next

`P0-01` still BLOCKED.
