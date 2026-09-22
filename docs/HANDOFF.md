# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-01-qr-open`
- Task: `ENH-01` QR open — DONE (payload parse + Open from code; no camera)

## What changed

- `parseEquipmentQr` accepts UUID, `borrowhub:equipment:{uuid}`, URL path/query, or asset tag
- Catalogue **Open from code** (keyboard / wedge scanners). GET by id or list-by-tag

## Verification

- `pnpm --filter @borrowhub/mobile test` — 9 passed
- `pnpm --filter @borrowhub/mobile typecheck`
- Camera / Expo Go barcode not added (`P0-01` / EAS project still missing)

## Next

`P0-01` still BLOCKED. Optional: ENH-02 photos/damage, or camera follow-up once an Expo project exists. Live Entra PKCE still needs the operator.
