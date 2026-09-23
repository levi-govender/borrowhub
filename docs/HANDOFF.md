# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-15-reserved-inventory`
- Task: `ENH-15` Reserved inventory — DONE

## What changed

- Admin equipment list accepts `reserved=true`
- Each row includes `nextReservedTo` and `nextReservedBookingId` (earliest RESERVED booking)
- Inventory has a **Next** column and a **Reserved only** switch

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/web test` — 15 passed; typecheck

## Next

`P0-01` still BLOCKED.
