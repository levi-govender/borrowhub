# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-22-office-booking-times`
- Task: `ENH-22` Office booking times — DONE

## What changed

- My bookings shows the window in Africa/Johannesburg instead of a raw UTC instant
- A booking that crosses midnight includes the end date
- Home, My bookings, and the reserve confirmation use plain status labels

## Verification

- `pnpm --filter @borrowhub/mobile test` — 13 passed; typecheck

## Next

`P0-01` still BLOCKED.
