# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 3 identity and cloud foundation — Entra JWT/OBO (P3-01)
- Branch: `feature/p3-01-entra-pkce-obo`
- Task: `P3-01` Entra PKCE/OBO and Java authorization — DONE (live tenant still `P0-01`)

## What changed

- Java resource server: when demo identity is off, `/v1/**` requires a JWT; `oid`/`tid`/`roles` upsert `app_user`; Admin app role required for admin APIs
- `GET /v1/me` and BFF `GET /api/v1/me`
- BFF exchanges `Authorization: Bearer` via Entra OBO when client id/secret/scope/token URL are set; local demo headers still work without Bearer
- Admin web shows the signed-in user from `/me`
- `.env.example` placeholders for four Entra app registrations (no secrets)

## Verification

- `cd services/backend && ./gradlew test` — including `JwtIdentityTest`
- `pnpm --filter @borrowhub/bff test` and `typecheck`
- `pnpm --filter @borrowhub/web test`, `typecheck`, `build`
- Browser at http://localhost:5173: “Signed in as admin-1 (ADMIN)”

## Next

After merge: `feature/p3-02-docker-images`. `P0-01` blocks live PKCE. `P0-02` remains open.
