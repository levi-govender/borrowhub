# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-17-catalogue-location`
- Task: `ENH-17` Catalogue location search — DONE

## What changed

- Employee equipment `query` matches location as well as name and asset tag
- Archived assets stay excluded, including when the query matches their location
- Catalogue search label says name, tag, or location

## Verification

- `./gradlew test --tests com.borrowhub.backend.equipment.EquipmentCatalogueTest` BUILD SUCCESSFUL
- `pnpm --filter @borrowhub/mobile test` — 12 passed; typecheck

## Next

`P0-01` still BLOCKED.
