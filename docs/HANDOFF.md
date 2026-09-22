# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Phase 0 leftovers
- Branch: `setup/p0-02-frontend-spike`
- Task: `P0-02` — DONE (`DEC-01` accepted: separate Vite + Expo). `P0-01` BLOCKED.

## What changed

- Spike recorded in `docs/DECISIONS.md` (DEC-01). No stack change.
- `P0-01` marked BLOCKED (no tenant/subscription/secrets in repo)

## Verification

- Code inspection of web tables, Playwright cell roles, Expo package.json, `infra/modules/web.bicep`, `packages/*` stubs
- Did not run Expo web or rewrite admin UI

## Next

Operator work: **P0-01** (Entra tenant, Azure subscription, cost approval, app registrations, GitHub secrets). Until then: enhancements (ENH-01 QR) are optional; live cloud PKCE stays blocked.
