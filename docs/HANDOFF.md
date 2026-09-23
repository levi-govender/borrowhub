# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-09-current-loan`
- Task: `ENH-09` Current loan on asset — DONE

## What changed

- Admin `GET /v1/admin/equipment/{id}` includes `currentLoan` for the single `CHECKED_OUT` booking (borrower, window, overdue)
- Inventory drawer shows who has the asset, or “Not checked out”
- Employee catalogue detail sets `currentLoan` to null

## Verification

- `./gradlew test --tests com.borrowhub.backend.admin.AdminApiTest --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/web test` — 15 passed; typecheck

## Next

`P0-01` still BLOCKED.
