# Decisions

ADR format: ID, date, status, context, options, decision, consequences, revisit condition.

Proposals from the blueprint are not team approval until confirmed in Phase 0.

## DEC-01 — Frontend strategy

| Field | Value |
| --- | --- |
| Date | 2026-09-21 |
| Status | Proposed (pending spike) |
| Context | Employees need a mobile app; admins need a browser dashboard. A universal React Native Web approach is an explicit gate, not the default. |
| Options | (A) Separate React web + React Native apps. (B) Universal RN-compatible components on web. |
| Decision | **A for now.** Prototype catalogue/detail on both platforms and a representative admin table before changing this. |
| Consequences | Two frontend tracks; shared types/clients in `packages/`. Backend contracts stay the same either way. |
| Revisit | After a small spike proves auth redirects, accessibility, responsive layout, and admin tables work acceptably on a universal stack. |

## DEC-02 — BFF framework

| Field | Value |
| --- | --- |
| Date | 2026-09-21 |
| Status | Accepted (Phase 0 pin) |
| Context | Need a small TypeScript HTTP layer with explicit route schemas. |
| Options | Fastify; NestJS. |
| Decision | **Fastify.** |
| Consequences | Routes organised as routes, schemas, auth, backendClient, aggregators, error handling. Pin versions in the workspace lockfile. |
| Revisit | Only if the team prefers Nest conventions and records a new ADR before large BFF work. |

## DEC-03 — Java backend shape

| Field | Value |
| --- | --- |
| Date | 2026-09-21 |
| Status | Accepted (Phase 0 pin) |
| Context | Booking rules must live in one transactional service, not microservices. |
| Options | Modular Spring Boot monolith; multiple deployable services. |
| Decision | **Modular monolith** with packages for identity, equipment, booking, and audit. Java 21 + Spring Boot 4.1.x (current start.spring.io default). Gradle wrapper. |
| Consequences | One Java Container App. No Kubernetes, Redis, API Management, or event bus in MVP. |
| Revisit | If a measured constraint requires another component. |

## DEC-04 — Availability locking

| Field | Value |
| --- | --- |
| Date | 2026-09-21 |
| Status | Accepted (concurrency tests in P2-01) |
| Context | Two employees must not reserve the same asset for overlapping intervals. |
| Options | Per-equipment row lock then conflict query; exclusion constraints only; application-level lock. |
| Decision | **PostgreSQL row lock on equipment** inside the mutation transaction, then conflict read. Partial unique index for `CHECKED_OUT`. |
| Consequences | Every path that changes availability must take the same lock first. Tests require real PostgreSQL, not an in-memory substitute. |
| Revisit | Exclusion constraint remains an optional extra defence. |

## DEC-05 — Identity

| Field | Value |
| --- | --- |
| Date | 2026-09-21 |
| Status | Proposed |
| Context | Workforce users; BFF and Java need distinct token audiences. |
| Options | Entra PKCE + OBO; mock identity in cloud. |
| Decision | **Microsoft Entra ID**: PKCE on clients, on-behalf-of from BFF to Java. Local mock auth only in an isolated development profile. |
| Consequences | Four app registrations (web, mobile, BFF API, Java API). Cloud MVP is incomplete while mock auth is enabled. Java validates JWTs when `borrowhub.demo-identity.enabled=false`. The BFF exchanges a user Bearer token with Entra OBO before calling Java. Local `dev` still uses `X-Demo-*` headers. Live PKCE needs `P0-01`. |
| Revisit | When tenant/admin consent is available (`P0-01` / `P3-01`). |

## DEC-06 — Cloud data plane

| Field | Value |
| --- | --- |
| Date | 2026-09-21 |
| Status | Proposed |
| Context | Database should not be on the public internet. Public CI cannot reach a private DB. |
| Options | Private PostgreSQL + in-network migration job; public firewall learning setup. |
| Decision | **Private Flexible Server** plus a **manual Container Apps Job** for Flyway. |
| Consequences | Local work uses Compose PostgreSQL. Cloud debugging needs an approved private path. |
| Revisit | If sandbox networking cannot support VNet integration; document any simpler alternative explicitly. |

## DEC-07 — Toolchain pins (Phase 0)

| Field | Value |
| --- | --- |
| Date | 2026-09-21 |
| Status | Accepted |
| Context | Need one Node package manager, one Java LTS pair, and local Compose before feature work. |
| Decision | **pnpm** workspaces; **Node** (engines `>=22`); **Java 21**; **Spring Boot 4.1.x**; **Vite + React 19** for web; **Expo** development-build workflow for mobile (confirm Expo vs Expo Go constraints before native auth). PostgreSQL **16** locally. |
| Consequences | Lockfile and Gradle wrapper are source of truth. Commands are recorded in the README only after they are run. |
| Revisit | If Expo cannot support the chosen Entra/native auth library. |
