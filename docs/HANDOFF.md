# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 3 identity and cloud foundation — Docker images (P3-02)
- Branch: `feature/p3-02-docker-images`
- Task: `P3-02` Docker images — DONE

## What changed

- `services/backend/Dockerfile` (Java 21 JRE, bootJar, non-root)
- `services/bff/Dockerfile` (Node 22, pnpm 10.28, `pnpm deploy --legacy`)
- Compose profile `apps` runs backend + BFF against Postgres; `make db-up` still starts Postgres only
- Local `docker-up` uses Spring `dev` profile so the container can start without an Entra JWT issuer. Cloud must set issuer (demo identity stays off in the image default)

## Verification

- `make docker-up` — containers healthy
- `make health` — BFF `ok`, Java `UP`
- `GET http://127.0.0.1:3000/api/v1/equipment?pageSize=1` returned catalogue JSON

## Next

After merge: `feature/p3-03-bicep-foundation`. `P0-01` and `P0-02` remain open.
