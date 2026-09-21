# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 4 repeatability — observability (P4-02)
- Branch: `feature/p4-02-observability`
- Task: `P4-02` Observability and cost controls — DONE (compile + BFF tests; not deployed)

## What changed

- Workspace Application Insights; Java/BFF get `APPLICATIONINSIGHTS_CONNECTION_STRING`
- Log Analytics 1 GB/day cap; optional monthly Consumption budget when `budgetContactEmail` is set
- One `X-Correlation-Id` per BFF request; Java console pattern includes `traceId`; Kusto lookup in `infra/README.md`

## Verification

- `make bicep-build` — no BCP errors
- BFF tests + typecheck pass (correlation header forwarded)
- No Azure deploy; no live traces

## Next

After merge: `feature/p4-03-user-device-cloud-tests`. `P0-01` and `P0-02` remain open.
