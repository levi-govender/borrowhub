# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-11-reservation-window`
- Task: `ENH-11` Reservation window — DONE

## What changed

- Asset detail lets the employee type start and end as `YYYY-MM-DDTHH:mm` in Africa/Johannesburg
- Client checks duration, future start, and advance limit before calling the BFF
- Java still owns overlap and policy on create

## Verification

- `pnpm --filter @borrowhub/mobile test` — 12 passed
- `pnpm --filter @borrowhub/mobile exec tsc --noEmit`
- Expo UI not run

## Next

`P0-01` still BLOCKED.
