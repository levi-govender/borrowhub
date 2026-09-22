# Tasks

Statuses: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`.

Keep only one implementation task `IN_PROGRESS`. Evidence is required for `DONE`.

## Phase 0 — Decisions and skeleton

Exit: both clients render a starter screen, services expose local health endpoints, decisions recorded.

| ID | Title | Status | Notes |
| --- | --- | --- | --- |
| P0-01 | Confirm tenancy, budget, region | BLOCKED | Operator: Entra tenant, Azure subscription, South Africa North candidate, cost approval. Missing as of 2026-09-22: tenant id, subscription id, four app registrations, GitHub OIDC/SWA/ACR secrets. Live PKCE against Entra stays blocked. Java JWT + BFF OBO exist against mocks (P3-01). |
| P0-02 | Frontend spike: separate vs universal | DONE | Evidence 2026-09-22: inspected `apps/web/src/App.tsx` HTML tables + Playwright `getByRole("cell")`; Expo `web` script exists without admin tables or a `react-native-web` direct dependency; SWA Bicep targets Vite `dist`; `packages/api-client` still a placeholder. **Kept option A.** Did not migrate UI to RN Web. |
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
| MVP-02 | Catalogue | DONE | Evidence 2026-09-22: `pnpm --filter @borrowhub/mobile test` (8, including `formatOfficeWindow` SAST and `isBookable`) and `typecheck`. List Load more; MAINTENANCE labelled not bookable; detail window in Africa/Johannesburg. Expo UI not run. Archived still excluded by Java employee catalogue. |
| MVP-03 | Create reservation | DONE | Evidence 2026-09-21: `pnpm --filter @borrowhub/mobile test` (6, including POST `/api/v1/bookings` + `Idempotency-Key` + demo object id) and `typecheck` pass. Detail screen **Reserve this window** shows booking id/status. Native UI not run in Expo this slice. Java overlap still owns the write. |
| MVP-04 | My bookings/cancel | DONE | Evidence 2026-09-21: `pnpm --filter @borrowhub/mobile test` (7, including GET `/api/v1/bookings` and POST cancel + `Idempotency-Key`) and `typecheck` pass. My bookings screen lists mine and Cancel when `allowedActions` includes CANCEL. Expo UI not run. Java still owns ownership and too-late cancel. |
| MVP-05 | Collection/return | DONE | Evidence 2026-09-22: `pnpm --filter @borrowhub/mobile test` (8, including POST collect/return + `Idempotency-Key`) and `typecheck` pass. My bookings shows Collect/Return when `allowedActions` includes them. Expo UI not run. Java still owns lead window and one CHECKED_OUT loan. |
| MVP-06 | Admin inventory | DONE | Evidence 2026-09-22: `pnpm --filter @borrowhub/web test` (6, including GET/PATCH `/api/v1/admin/equipment/{id}`); `typecheck`; `build`. Edit asset panel PATCHes Java; create/edit hidden unless `/me` is ADMIN. Playwright not re-run (no local stack this slice). |
| MVP-07 | Admin bookings/overdue | DONE | Evidence 2026-09-22: `pnpm --filter @borrowhub/web test` (8, including overdue+CHECKED_OUT query); `typecheck`; `build`. Dashboard overdue card opens bookings `status=CHECKED_OUT&overdue=true`. Playwright not re-run. |
| MVP-08 | Audit and failure handling | DONE | Evidence 2026-09-22: web test 9 (error `traceId` + `formatAuditChange`); mobile test 8 (404 includes code/trace); web typecheck/build; mobile typecheck. Admin booking audit shows `changeSummary`. UI failures append `[CODE; trace …]`. Playwright not re-run. |

## Enhancements (after MVP)

| ID | Title | Status | Notes |
| --- | --- | --- | --- |
| ENH-01 | QR open | DONE | Evidence 2026-09-22: `pnpm --filter @borrowhub/mobile test` (9, including `parseEquipmentQr`) and `typecheck`. Catalogue **Open from code** accepts UUID, `borrowhub:equipment:{id}`, URL, or asset tag. Live camera not added (no EAS project). |
| ENH-02 | Photos/damage | DONE | Evidence 2026-09-22: Flyway `V003` `damage_note`; return body `{ damageNote }` hashed for idempotency; audit `BOOKING_RETURNED`. `pnpm` mobile test 9 + typecheck; BFF test 12 + typecheck. CI: `SchemaMigrationTest` expected Flyway version 2; updated to 3 + `damage_note` column. Photos/blob still `P0-01`. |
| ENH-03 | Reminders | TODO | |
| ENH-04 | Admin calendar | TODO | |
