# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: Enhancements
- Branch: `feature/enh-32-home-open-loans`
- Task: `ENH-32` Home open loans — DONE

## What changed

- Home loads the employee's checked-out and reserved bookings, up to 100 of each
- Returned and cancelled bookings stay off home
- An older due loan is no longer hidden behind the newest 20 rows

## Verification

- `pnpm --filter @borrowhub/mobile test` — 14 passed; typecheck
- Expo UI not run

## Next

`P0-01` still BLOCKED.
