# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-14-next-reservation`
- Task: `ENH-14` Next reservation — DONE

## What changed

- Admin equipment detail includes `nextReservation`: earliest `RESERVED` booking (borrower, start, end)
- Inventory drawer shows it and opens that booking
- Employee catalogue detail leaves `nextReservation` null

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/web typecheck`

## Next

`P0-01` still BLOCKED.
