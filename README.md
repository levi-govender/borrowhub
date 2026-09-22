# borrowhub

BorrowHub lets employees find and reserve individual workplace assets such as test phones, monitors, adapters and cameras. Employees use a mobile application. Office administrators use a browser dashboard to manage assets and oversee loans. Each reservation refers to one specific physical asset, not a pooled quantity of interchangeable items.

This repository is the implementation of the learning blueprint in `BorrowHub_Project_Blueprint.pdf`. Working tracker: `docs/TASKS.md`. **Teammate demo, rollback, and cloud blockers:** [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Git workflow

Do not develop on `main`. Branch from updated `main` using:

- `setup/` — scaffolding, toolchain, docs, repo layout
- `feature/` — product functionality
- `debug/` — investigations and fixes
- `misc/` — everything else

One slice per branch. Push and merge via PR; start the next slice from `main`.

## Toolchain

| Piece | Pin |
| --- | --- |
| Node | >= 22 (pnpm workspaces) |
| Java | 21 |
| Spring Boot | 4.1.x |
| BFF | Fastify |
| Web | React 19 + Vite |
| Mobile | Expo ~57 (React Native) |
| Database (local) | PostgreSQL 16 via Compose |

## Local commands

From the repo root, `make help` lists targets (`install`, `bff`, `backend`, `web`, `mobile`, `test`, `health`, and others).

Install JS dependencies:

```bash
make install
```

PostgreSQL 16 via Compose. Flyway runs when the Java backend starts (`make backend`) and in Testcontainers-backed `make test-backend`.

```bash
make db-up
make backend
```

BFF (http://localhost:3000) — clients call this, not Java:

```bash
make bff
# GET  http://localhost:3000/api/v1/me
# GET http://localhost:3000/api/v1/equipment
# GET http://localhost:3000/api/v1/equipment/{id}
# GET http://localhost:3000/api/v1/equipment/{id}/availability?startAt=...&endAt=...
# POST http://localhost:3000/api/v1/bookings
#   headers: X-Demo-Object-Id (required for local demo identity), optional X-Demo-Tenant-Id, Idempotency-Key (UUID)
#   body: { equipmentId, startAt, endAt }
# GET  http://localhost:3000/api/v1/bookings
# GET  http://localhost:3000/api/v1/bookings/{id}
# POST http://localhost:3000/api/v1/bookings/{id}/cancel  (Idempotency-Key)
# POST http://localhost:3000/api/v1/bookings/{id}/collect (Idempotency-Key)
# POST http://localhost:3000/api/v1/bookings/{id}/return  (Idempotency-Key)
# GET  http://localhost:3000/api/v1/admin/summary           (X-Demo-Object-Id, X-Demo-Role: ADMIN)
# GET  http://localhost:3000/api/v1/admin/equipment
# POST http://localhost:3000/api/v1/admin/equipment
# PATCH http://localhost:3000/api/v1/admin/equipment/{id}
# GET  http://localhost:3000/api/v1/admin/bookings?overdue=true
# GET  http://localhost:3000/api/v1/admin/bookings/{id}
# POST http://localhost:3000/api/v1/admin/bookings/{id}/cancel  (Idempotency-Key, body { reason })
# make health
```

Java backend (http://localhost:8080), `dev` profile seeds 10 demo assets:

```bash
make backend
# GET http://localhost:8080/v1/me
# GET http://localhost:8080/v1/equipment
# GET http://localhost:8080/v1/equipment/{id}
# GET http://localhost:8080/v1/equipment/{id}/availability?startAt=...&endAt=...
# POST http://localhost:8080/v1/bookings (dev profile: X-Demo-Object-Id, Idempotency-Key)
# GET  http://localhost:8080/v1/bookings
# GET  http://localhost:8080/v1/bookings/{id}
# POST http://localhost:8080/v1/bookings/{id}/cancel
# POST http://localhost:8080/v1/bookings/{id}/collect
# POST http://localhost:8080/v1/bookings/{id}/return
# GET  http://localhost:8080/v1/admin/summary
# GET  http://localhost:8080/v1/admin/equipment
# GET  http://localhost:8080/v1/admin/bookings
# POST http://localhost:8080/v1/admin/bookings/{id}/cancel
```

Admin web (http://localhost:5173) — dashboard (overdue card opens overdue loans), inventory (create/edit including archived), bookings, overdue, audit:

```bash
make db-up
make backend
make bff
make web
```

Local admin requests send `X-Demo-Object-Id` from the Sign in screen (default `admin-1`, role `ADMIN`). Java rejects employees with `403 FORBIDDEN`. The `dev` profile keeps that demo identity. Outside `dev`, Java expects an Entra JWT (`oid`, `tid`, app role `Admin`) and the BFF expects OBO settings in `services/bff/.env.example`. Live PKCE needs an Entra tenant (`P0-01`).

## Container images

Java and BFF Dockerfiles ship with this repo. `make db-up` still starts only Postgres. App containers use Compose profile `apps`. The image default leaves demo identity off (cloud must set the JWT issuer). Local `make docker-up` sets the `dev` profile so health and Flyway work without Entra.

```bash
make docker-up
make health
make docker-down
```

## Azure Bicep (compile only)

`infra/` is a resource-group template for private PostgreSQL, Container Apps, a Free Static Web App, workspace Application Insights, a 1 GB/day Log Analytics cap, and an optional monthly cost budget (`budgetContactEmail`). Look up a failed request by pasting `traceId` / `X-Correlation-Id` into the Kusto query in `infra/README.md`. This does **not** deploy anything.

```bash
make bicep-build
make docker-build-migrate
```

## CI / release

GitHub Actions `CI` (`.github/workflows/ci.yml`) runs on pull requests and `main`: JavaScript tests and builds, Gradle Testcontainers tests, `bicep build`, and Playwright against Compose app containers. Locally: `make ci` (no Playwright) and `make test-e2e` after `make docker-up`.

Cloud UI tests (`apps/web/e2e/cloud.spec.ts`) skip unless `CLOUD_WEB_URL` is set (`P0-01`). Employee device coverage is Expo unit tests plus Playwright **Pixel 5** viewport on the admin UI (not a native Detox/Maestro run).

`Release` (`.github/workflows/release.yml`) is **manual**. Rollback is re-running it with a previous git SHA. Details: [docs/RUNBOOK.md](docs/RUNBOOK.md).

```bash
make ci
```

Employee app (Expo). Catalogue, reserve, my bookings, collect, and return talk to the BFF (`EXPO_PUBLIC_BFF_BASE_URL`). Local defaults: iOS `localhost`, Android emulator `10.0.2.2`. Sign in first so `X-Demo-Object-Id` is sent; reserve, cancel, collect, and return use a UUID `Idempotency-Key`. Collect/return/cancel buttons appear only when Java `allowedActions` includes them. For a physical device or cloud BFF, copy `apps/mobile/.env.example` and set the URL (HTTPS for Azure). Preview builds: `apps/mobile/eas.json` (no Expo project ID until an operator creates one).

```bash
make db-up
make backend
make bff
make mobile
```

Copy `**/.env.example` files to ignored `.env` files before adding real configuration. Never commit secrets.

## Layout

```
apps/mobile          employee React Native app
apps/web             admin React app
services/bff         TypeScript BFF
services/backend     Spring Boot
packages/            shared TS packages
contracts/           OpenAPI
infra/               Bicep (Phase 3)
docs/                spec, tasks, decisions, handoff, runbook
```
