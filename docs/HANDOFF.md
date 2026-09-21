# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 3 identity and cloud foundation — web/mobile cloud config (P3-05)
- Branch: `feature/p3-05-web-mobile-cloud`
- Task: `P3-05` React cloud hosting and mobile dev config — DONE (compile + client env; not deployed)

## What changed

- Bicep Free Static Web App (`infra/modules/web.bicep`); BFF CORS includes SWA origin plus localhost
- `apps/web/public/staticwebapp.config.json` (SPA fallback; copied into `dist`)
- `apps/web/.env.example`, `apps/mobile/.env.example`, `apps/mobile/eas.json` for cloud BFF HTTPS / Expo preview

## Verification

- `make bicep-build` — no BCP errors; ARM has `Microsoft.Web/staticSites`
- Web/mobile tests and typecheck pass; `pnpm --filter @borrowhub/web build` includes `staticwebapp.config.json` in `dist`
- No Azure deploy; no Expo project ID; live PKCE still `P0-01`

## Next

After merge: `feature/p4-01-ci-cd`. `P0-01` and `P0-02` remain open. Phase 3 exit (real cloud booking) still needs a tenant and a deploy.
