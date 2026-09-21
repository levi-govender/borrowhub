# Tasks

Statuses: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`.

Keep only one implementation task `IN_PROGRESS`. Evidence is required for `DONE`.

## Phase 0 — Decisions and skeleton

Exit: both clients render a starter screen, services expose local health endpoints, decisions recorded.

| ID | Title | Status | Notes |
| --- | --- | --- | --- |
| P0-01 | Confirm tenancy, budget, region | TODO | Operator: Entra tenant, Azure subscription, South Africa North candidate, cost approval. Live PKCE against Entra is blocked until this exists. Java JWT + BFF OBO are implemented against mocks in P3-01. |
| P0-02 | Frontend spike: separate vs universal | TODO | Default remains separate apps (`DEC-01`). Spike before frontend work is far along. |
| P0-03 | Pin frameworks and toolchains | DONE | Evidence 2026-09-21: pnpm 10.28.0, Node v26.8.2, Java 21, Spring Boot 4.1.1 (start.spring.io), Fastify 5.12.x, Vite 8.3, Expo 57. See DEC-07. |
| P0-04 | Establish repo, contracts, tracker | DONE | Evidence 2026-09-21: `pnpm --filter @borrowhub/bff typecheck`; `pnpm --filter @borrowhub/web build`; `pnpm --filter @borrowhub/mobile exec tsc --noEmit`; `./gradlew test`; curl BFF `/health/live` and `/health/ready` → `{"status":"ok"}`; curl Java `/actuator/health/liveness` and `/readiness` → `{"status":"UP"}`; Playwright loaded http://localhost:5173 with title BorrowHub Admin and starter copy. |

## Phase 1 — Local vertical slice

Exit: both apps show the same seeded asset through BFF and Java. Local demo auth allowed.

| ID | Title | Status |
| --- | --- | --- |
| P1-01 | Database schema and Flyway | DONE | Evidence 2026-09-21: `./gradlew test` pass (Testcontainers Postgres 16). Compose: Flyway `V001` applied; `\dt` shows app_user, equipment, booking, audit_event, idempotency_record; partial unique index `booking_one_checked_out_per_equipment` present. |
| P1-02 | Java catalogue | DONE | Evidence 2026-09-21: `./gradlew test` pass, including `EquipmentCatalogueTest` (list/search/category, archived 404, availability overlap). |
| P1-03 | BFF catalogue | DONE | Evidence 2026-09-21: `pnpm --filter @borrowhub/bff test` and `typecheck` pass. Routes proxy `/api/v1/equipment` to Java `/v1/equipment`. |
| P1-04 | Mobile list/detail | DONE | Evidence 2026-09-21: `pnpm --filter @borrowhub/mobile typecheck` and `test` pass (API URL, 404 mapping, availability window). Screens: catalogue search/filter + detail/policy/availability with loading/empty/error/retry. |
| P1-05 | Web inventory list | DONE | Evidence 2026-09-21: `pnpm --filter @borrowhub/web typecheck`, `test`, `build` pass. Playwright at http://localhost:5173 showed 10 BFF-seeded assets; search PHONE-001 filtered to Pixel test phone. |

## Phase 2 — Booking correctness

Exit: full local journey; concurrency and ownership tests pass.

| ID | Title | Status |
| --- | --- | --- |
| P2-01 | Reservation transaction | DONE | Evidence 2026-09-21: `./gradlew test` pass including `BookingCreateTest` (create+audit, overlap vs adjacent half-open, policy, inactive equipment, missing demo identity, concurrent overlap → one 201 and one 409). `pnpm --filter @borrowhub/bff test` and `typecheck` pass. Idempotency deferred to P2-02. |
| P2-02 | Idempotency | DONE | Evidence 2026-09-21: `./gradlew test` pass including `BookingIdempotencyTest` (same key+body replays one booking, different body → 409 `IDEMPOTENCY_KEY_REUSED`, missing/invalid key → 400, concurrent same key → one row). `pnpm --filter @borrowhub/bff test` and `typecheck` pass (BFF requires UUID `Idempotency-Key`). |
| P2-03 | My bookings and cancel | DONE | Evidence 2026-09-21: `./gradlew test` pass including `BookingMineCancelTest` (list mine only, IDOR 404, cancel frees slot + idempotent replay, other user 404, too late / illegal transition). `pnpm --filter @borrowhub/bff test` and `typecheck` pass. |
| P2-04 | Collection and return | DONE | Evidence 2026-09-21: `./gradlew test` pass including `BookingCollectReturnTest` (collect+return+idempotent replay, too early/too late, IDOR 404, second loan blocked while CHECKED_OUT, overdue return). `pnpm --filter @borrowhub/bff test` and `typecheck` pass. |
| P2-05 | Admin inventory, bookings, audit | DONE | Evidence 2026-09-21: `./gradlew test` pass including `AdminApiTest` (employee 403, archived inventory, create/update equipment, overdue list, admin cancel with reason + audit). `pnpm --filter @borrowhub/bff test` and `typecheck` pass. `pnpm --filter @borrowhub/web test`, `typecheck`, `build` pass. Playwright at http://localhost:5173: dashboard 10 active; inventory create `HUB-ADMIN-01`; search PHONE-001; bookings empty. |

## Phase 3 — Identity and cloud foundation

Exit: real users complete a secured cloud booking. Mock auth disabled in cloud.

| ID | Title | Status |
| --- | --- | --- |
| P3-01 | Entra PKCE/OBO and Java authorization | DONE | Evidence 2026-09-21: `./gradlew test` pass including `JwtIdentityTest` (401 without JWT when demo off, oid/tid mapped on `/v1/me`, Admin app role for `/v1/admin/summary`, Employee 403). `pnpm --filter @borrowhub/bff test` and `typecheck` pass (OBO exchange, 503 without OBO config, demo `/me`). `pnpm --filter @borrowhub/web test`, `typecheck`, `build` pass. Playwright: dashboard “Signed in as admin-1 (ADMIN)”. Live Entra PKCE still needs `P0-01`. |
| P3-02 | Docker images | DONE | Evidence 2026-09-21: `make docker-up` built `borrowhub-backend:local` and `borrowhub-bff:local`; Compose `--wait` reported all healthy. `make health`: BFF live/ready `{"status":"ok"}`, Java liveness/readiness `{"status":"UP"}`. `GET /api/v1/equipment?pageSize=1` through the BFF container returned catalogue JSON (total 11). |
| P3-03 | Bicep network/data/identity foundation | DONE | Evidence 2026-09-21: `make bicep-build` via `mcr.microsoft.com/azure-cli:latest` (`az` not on host PATH). `az bicep build --file infra/main.bicep` succeeded (no BCP errors). Emitted gitignored `infra/main.json` ARM (`2019-04-01`, 9 top-level resources). Not deployed; `P0-01` still required for a real resource group. |
| P3-04 | Container Apps and migration job | DONE | Evidence 2026-09-21: `make bicep-build` via Azure CLI container — no BCP errors; `infra/main.json` includes `Microsoft.App/managedEnvironments`, two `containerApps`, and `Microsoft.App/jobs`. `make docker-build-migrate` built `borrowhub-migrate:local`; `ls /flyway/sql` shows `V001` and `V002`. Not deployed; images default to `:unpushed`; `P0-01` still required. |
| P3-05 | React cloud hosting and mobile dev config | DONE | Evidence 2026-09-21: `make bicep-build` — no BCP errors; ARM includes `Microsoft.Web/staticSites`. `pnpm --filter @borrowhub/web test` (5) and `mobile test` (4) pass; web/mobile typecheck pass; `vite build` copies `staticwebapp.config.json` into `apps/web/dist`. Not deployed; Vite/Expo BFF URLs are build-time env. |

## Phase 4 — Repeatability and release

Exit: merge-to-dev pipeline, trace lookup, teammate can reproduce from docs.

| ID | Title | Status |
| --- | --- | --- |
| P4-01 | CI/CD and immutable deploys | DONE | Evidence 2026-09-21: local CI equivalent — `pnpm install --frozen-lockfile`, `pnpm typecheck`, BFF 12 tests, web 5, mobile 4, `pnpm` web+BFF build; `./gradlew test` BUILD SUCCESSFUL. Workflows: `.github/workflows/ci.yml`, `release.yml` (SHA tags; Azure skipped without P0-01 secrets). No Azure release was run. |
| P4-02 | Observability and cost controls | DONE | Evidence 2026-09-21: `make bicep-build` — no BCP errors; ARM has Application Insights, Log Analytics `workspaceCapping`, conditional Consumption budget. `pnpm --filter @borrowhub/bff test` (12, including `X-Correlation-Id` echo) and typecheck pass. Java logs `traceId=%X{traceId}`. Not deployed; budget resource omitted until `budgetContactEmail` is set. |
| P4-03 | User/device/cloud tests | DONE | Evidence 2026-09-21: `pnpm --filter @borrowhub/web test:e2e` — 4 passed (desktop + Pixel 5: dashboard admin-1, inventory PHONE-001), 2 skipped (`CLOUD_WEB_URL` unset, P0-01). Compose stack was healthy. Native Detox/Maestro not added (`DEC-01` Expo). |
| P4-04 | README, rollback, demo runbooks | DONE | Evidence 2026-09-21: `docs/RUNBOOK.md` (local Compose demo, SHA rollback, Flyway forward-only, P0-01 cloud blockers). README and `infra/README.md` link it. `make help` lists `docker-up`, `test-e2e`, `health`. No Azure demo was run. |

## MVP product catalogue

Local demo identity until Entra exists (`P0-01`). Live PKCE is blocked.

| ID | Title | Status |
| --- | --- | --- |
| MVP-01 | Sign-in and profile | DONE | Evidence 2026-09-21: web/mobile typecheck; `pnpm --filter @borrowhub/web test` (5); mobile tests (5, including `/me` demo header); `pnpm --filter @borrowhub/web build`. Demo object-id sign-in + profile/sign-out. Entra PKCE still `P0-01`. Playwright sign-in steps added; not re-run locally this slice. |
| MVP-02 | Catalogue | TODO | Mobile list/detail exists (P1-04); remaining polish after sign-in. |
| MVP-03 | Create reservation | TODO |
| MVP-04 | My bookings/cancel | TODO |
| MVP-05 | Collection/return | TODO |
| MVP-06 | Admin inventory | TODO | Web inventory exists (P2-05); remaining polish after sign-in. |
| MVP-07 | Admin bookings/overdue | TODO |
| MVP-08 | Audit and failure handling | TODO |

## Enhancements (after MVP)

ENH-01 QR · ENH-02 Photos/damage · ENH-03 Reminders · ENH-04 Admin calendar · later reliability/policy items in the blueprint.
