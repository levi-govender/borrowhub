# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 3 identity and cloud foundation — Container Apps (P3-04)
- Branch: `feature/p3-04-container-apps`
- Task: `P3-04` Container Apps and migration job — DONE (compile + local Flyway image)

## What changed

- Bicep: Container Apps environment on `snet-apps`, internal Java, external BFF, manual Flyway job (`DEC-06`)
- Java cloud env sets `SPRING_FLYWAY_ENABLED=false` and demo identity off
- `services/backend/Dockerfile.migrate` copies Flyway SQL onto `flyway/flyway:10.22.0`

## Verification

- `make bicep-build` — no BCP errors
- `make docker-build-migrate` — image `borrowhub-migrate:local` contains `V001` and `V002`
- No Azure deployment; `:unpushed` image tags until ACR is filled; JWT/OBO params empty until `P0-01`

## Next

After merge: `feature/p3-05-web-mobile-cloud`. `P0-01` and `P0-02` remain open.
