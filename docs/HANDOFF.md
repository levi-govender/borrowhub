# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 1 local vertical slice
- Branch: `feature/p1-02-java-catalogue`
- Task: `P1-02` Java catalogue — DONE

## What changed

- `GET /v1/equipment` (search, category, pagination), `GET /v1/equipment/{id}`, `GET /v1/equipment/{id}/availability`
- Archived assets are omitted / 404 for this employee catalogue
- Dev profile seeds 10 assets (`make backend` sets `SPRING_PROFILES_ACTIVE=dev`)
- Availability uses half-open overlap against RESERVED and CHECKED_OUT; ACTIVE-only

## Verification

`cd services/backend && ./gradlew test` — pass (includes `EquipmentCatalogueTest`)

## Next

After merge: `feature/p1-03-bff-catalogue` from updated `main`.
