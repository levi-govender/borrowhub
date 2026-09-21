# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: MVP product
- Branch: `feature/mvp-01-sign-in-profile`
- Task: `MVP-01` Sign-in and profile — DONE (local demo identity; Entra still P0-01)

## What changed

- Admin web: Sign in (demo object id + role), profile line, Sign out
- Employee mobile: Sign in, Profile screen via catalogue, Sign out
- APIs send `X-Demo-Object-Id` from that session. Playwright local specs sign in as `admin-1` first

## Verification

- Web/mobile unit tests and typecheck; web production build
- Playwright not re-run in this slice (CI Playwright job will cover sign-in)

## Next

After merge: `MVP-03` create reservation on mobile (catalogue already exists). `P0-01` and `P0-02` remain open.
