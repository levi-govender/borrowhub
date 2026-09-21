# BorrowHub — project specification

Readable PDF: `BorrowHub_Project_Blueprint.pdf` (v1.0, 21 September 2026). This Markdown file is the working spec for implementation.

## Product

Workplace equipment booking for **individual physical assets** (test phones, monitors, adapters, cameras), not pooled quantities.

- Employees: mobile app — browse, reserve a time window, collect, return.
- Administrators: browser dashboard — inventory, all bookings, overdue, audit.
- Central technical problem: inventory and reservations stay correct under concurrency and retries.

### Boundaries (MVP)

One organisation, one office, one office timezone, two roles, one asset per booking, no payments. No approvals, waitlists, recurring bookings, push, image uploads, or offline mutations. Asset images are placeholders. QR scanning is the first enhancement. Public app-store release is out of scope.

### Roles

- **Employee:** sign in, search, availability, create reservation, own bookings, cancel future reservation, collect, return. Cannot edit inventory or see other people's booking details.
- **Admin:** employee capabilities plus inventory, all-booking search, acting on another user's booking **with a recorded reason**. UI hides forbidden actions; **Java enforces** independently.

### Policy defaults (backend config, injected clock in tests)

Office timezone: `Africa/Johannesburg`. Store UTC. APIs: ISO 8601 with offsets.

- Duration: 15 minutes minimum, 7 days maximum.
- New reservation starts in the future, within 30 days.
- Collection: 15 minutes before start until reserved end, if physically available.
- Cancel: employee only while `RESERVED` and before start; admin may cancel uncollected later with reason.
- No time edits: cancel and create another booking.
- Intervals are half-open `[start, end)`. Overlap: `existing.start < requested.end AND existing.end > requested.start`.
- Expired uncollected (`RESERVED` and end in the past) cannot be collected. Overdue is derived (`CHECKED_OUT` past end), not a stored state.

### Success criteria

Two employees cannot both reserve overlapping time on the same asset. IDOR on bookings fails. Admin can identify overdue loans. Local checkout from documented commands. Cloud from Bicep plus documented identity bootstrap.

## Architecture

```
React Native (employee)  ─┐
                          ├─► TypeScript BFF (public) ─► Spring Boot (internal) ─► PostgreSQL
React web (admin)        ─┘
Entra ID authenticates users; BFF exchanges delegated tokens for Java (OBO).
```

| Layer | Owns |
| --- | --- |
| Clients | Presentation, navigation, temporary UI state |
| BFF | Client API, boundary validation, token exchange, aggregation, timeouts, error translation |
| Spring Boot | Domain rules, authorization, transitions, transactions, persistence, audit |
| PostgreSQL | Rows, keys, constraints, locking |
| Bicep | Azure resource configuration only |

Do **not** add microservices, Kubernetes, Redis, API Management, or an event bus in MVP.

BFF routes: `/api/v1/mobile/*` and `/api/v1/admin/*` on one deployment. BFF has no booking database.

## Frontend

- Mobile screens: Sign-in, Home, Catalogue, Asset detail, Booking form, Booking confirmation/detail, My bookings, Profile.
- Web screens: Sign-in, Dashboard, Inventory table, Asset create/edit, Bookings table, Booking detail and audit.
- Share generated API types/clients, date formatting, validation helpers, tokens, permission labels. Do not share native/DOM UI or Java classes.

`DEC-01`: separate apps until a spike says otherwise.

## Data

Tables (SQL): `app_user`, `equipment`, `booking`, `audit_event`, `idempotency_record`. Flyway: `services/backend/src/main/resources/db/migration/V001__initial_schema.sql`.

Booking states: `RESERVED` → `CHECKED_OUT` | `CANCELLED`; `CHECKED_OUT` → `RETURNED`. Terminal: `RETURNED`, `CANCELLED`.

Writes that affect availability: lock equipment row first; verify `ACTIVE`; query conflicts; validate policy; persist booking + audit + idempotency together.

Idempotency: client UUID per attempt; unique `(userId, route, key)`; same hash replays; different hash → `409 IDEMPOTENCY_KEY_REUSED`. Persist in DB, not BFF memory.

## APIs (sketch)

BFF: `GET /api/v1/me`, equipment list/detail/availability, `POST /api/v1/bookings` with `Idempotency-Key`, mine/detail, cancel/collect/return, admin overview/bookings/equipment/audit.

Java: `/v1` resource APIs including `/v1/bookings/summary`. Errors: `{ code, message, traceId, fieldErrors }`. Lists: `{ items, page, pageSize, total }`.

Owner ID is never taken from the client payload.

## Local layout

```
apps/mobile          React Native (Expo)
apps/web             React + Vite
services/bff         Fastify
services/backend     Spring Boot
packages/api-client  generated TS clients
packages/shared      portable schemas/formatting
contracts/           OpenAPI
infra/               Bicep foundation (P3-03); Container Apps in P3-04
docs/                this tracker
compose.yaml         local PostgreSQL
```

BFF port **3000**. Java **8080**. Web Vite default. Postgres **5432**.

## Delivery

Phase 0 skeleton → Phase 1 catalogue slice → Phase 2 booking correctness → Phase 3 Entra + Azure → Phase 4 CI/observability/runbooks.

First implementation pass: repo skeleton, contracts stub, health endpoints, starter screens. Do not generate the entire cloud stack in one change.
