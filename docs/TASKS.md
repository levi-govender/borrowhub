# Tasks

Statuses: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`.

Keep only one implementation task `IN_PROGRESS`. Evidence is required for `DONE`.

## Phase 0 — Decisions and skeleton

Exit: both clients render a starter screen, services expose local health endpoints, decisions recorded.

| ID | Title | Status | Notes |
| --- | --- | --- | --- |
| P0-01 | Confirm tenancy, budget, region | TODO | Operator: Entra tenant, Azure subscription, South Africa North candidate, cost approval. |
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
| P2-01 | Reservation transaction | TODO |
| P2-02 | Idempotency | TODO |
| P2-03 | My bookings and cancel | TODO |
| P2-04 | Collection and return | TODO |
| P2-05 | Admin inventory, bookings, audit | TODO |

## Phase 3 — Identity and cloud foundation

Exit: real users complete a secured cloud booking. Mock auth disabled in cloud.

| ID | Title | Status |
| --- | --- | --- |
| P3-01 | Entra PKCE/OBO and Java authorization | TODO |
| P3-02 | Docker images | TODO |
| P3-03 | Bicep network/data/identity foundation | TODO |
| P3-04 | Container Apps and migration job | TODO |
| P3-05 | React cloud hosting and mobile dev config | TODO |

## Phase 4 — Repeatability and release

Exit: merge-to-dev pipeline, trace lookup, teammate can reproduce from docs.

| ID | Title | Status |
| --- | --- | --- |
| P4-01 | CI/CD and immutable deploys | TODO |
| P4-02 | Observability and cost controls | TODO |
| P4-03 | User/device/cloud tests | TODO |
| P4-04 | README, rollback, demo runbooks | TODO |

## MVP product catalogue (implement after skeleton)

MVP-01 Sign-in and profile · MVP-02 Catalogue · MVP-03 Create reservation · MVP-04 My bookings/cancel · MVP-05 Collection/return · MVP-06 Admin inventory · MVP-07 Admin bookings/overdue · MVP-08 Audit and failure handling.

## Enhancements (after MVP)

ENH-01 QR · ENH-02 Photos/damage · ENH-03 Reminders · ENH-04 Admin calendar · later reliability/policy items in the blueprint.
