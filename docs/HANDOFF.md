# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 4 — runbooks (P4-04)
- Branch: `feature/p4-04-runbooks`
- Task: `P4-04` README, rollback, demo runbooks — DONE
- Phase 4 tracker is complete. Cloud booking still needs `P0-01`. Frontend spike `P0-02` is still open.

## What changed

- `docs/RUNBOOK.md`: local demo (`make docker-up` / `make test-e2e`), SHA rollback, Flyway is forward-only, cloud steps blocked on P0-01
- README and `infra/README.md` point at the runbook

## Verification

- `make help` lists documented targets
- Links to `docs/RUNBOOK.md` from README and infra README
- No live Azure demo

## Next

After merge: product MVP (`MVP-01` sign-in) **or** unblock `P0-01` / `P0-02`. Do not invent a cloud environment.
