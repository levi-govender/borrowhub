# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-02-catalogue-polish`
- Task: `MVP-02` Catalogue — DONE (office TZ window, pagination, not-bookable)

## What changed

- Catalogue Load more (page/pageSize through BFF)
- Non-ACTIVE rows labelled not bookable; Reserve stays disabled
- Detail default window formatted in `Africa/Johannesburg`

## Verification

- `pnpm --filter @borrowhub/mobile test` — 8 passed
- `pnpm --filter @borrowhub/mobile typecheck`
- Expo UI not launched

## Next

Product MVP rows 01–08 are done. Remaining: `P0-01` Entra/Azure tenant, `P0-02` frontend spike (`DEC-01` still separate apps). Enhancements ENH-01+ after that.
