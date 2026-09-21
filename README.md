# borrowhub

BorrowHub lets employees find and reserve individual workplace assets such as test phones, monitors, adapters and cameras. Employees use a mobile application. Office administrators use a browser dashboard to manage assets and oversee loans. Each reservation refers to one specific physical asset, not a pooled quantity of interchangeable items.

This repository is the implementation of the learning blueprint in `BorrowHub_Project_Blueprint.pdf`. Cursor working files live under `docs/`.

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
# GET http://localhost:3000/api/v1/equipment
# GET http://localhost:3000/api/v1/equipment/{id}
# GET http://localhost:3000/api/v1/equipment/{id}/availability?startAt=...&endAt=...
# make health
```

Java backend (http://localhost:8080), `dev` profile seeds 10 demo assets:

```bash
make backend
# GET http://localhost:8080/v1/equipment
# GET http://localhost:8080/v1/equipment/{id}
# GET http://localhost:8080/v1/equipment/{id}/availability?startAt=...&endAt=...
```

Admin web inventory (http://localhost:5173):

```bash
make db-up
make backend
make bff
make web
```

Employee app (Expo). Catalogue talks to the BFF (`EXPO_PUBLIC_BFF_BASE_URL`, default localhost / Android emulator `10.0.2.2`):

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
docs/                spec, tasks, decisions, handoff
```
