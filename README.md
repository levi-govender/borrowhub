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

PostgreSQL (not required for the Phase 0 health skeleton):

```bash
make db-up
```

BFF (http://localhost:3000):

```bash
make bff
# make health
```

Java backend (http://localhost:8080):

```bash
make backend
```

Admin web:

```bash
make web
```

Employee app (Expo):

```bash
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
