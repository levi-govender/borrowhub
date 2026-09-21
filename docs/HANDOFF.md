# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 4 — CI Bicep job fix
- Branch: `debug/ci-bicep-install`
- `azure/setup-bicep` is not a public Action; CI now uses `az bicep install` on `ubuntu-latest`

## Next

Merge this so `main` CI is green. Continue `feature/p4-02-observability` (or start it from updated `main` if not merged). `P0-01` and `P0-02` remain open.
