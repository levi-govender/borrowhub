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

Install JS dependencies from the repo root:

```bash
pnpm install
```

PostgreSQL (not required for the Phase 0 health skeleton):

```bash
docker compose up -d
```

BFF (http://localhost:3000):

```bash
pnpm dev:bff
# curl -s http://localhost:3000/health/live
# curl -s http://localhost:3000/health/ready
```

Java backend (http://localhost:8080):

```bash
cd services/backend
./gradlew bootRun
# curl -s http://localhost:8080/actuator/health/liveness
# curl -s http://localhost:8080/actuator/health/readiness
```

Admin web:

```bash
pnpm dev:web
```

Employee app (Expo):

```bash
pnpm --filter @borrowhub/mobile start
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
