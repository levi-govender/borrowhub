# Handoff

A new session should continue from here without reconstructing chat history.

## Current

- Phase: 0 (skeleton on branch; tenancy and frontend spike still open)
- Branch: `setup/phase-0-repo-skeleton` — do not continue on `main`
- Tasks: `P0-03` and `P0-04` DONE with evidence. Next unblocked product task after merge is `P1-01` unless you want `P0-02` first.

## What changed

- `docs/` spec, tasks, decisions, handoff
- `.cursor/rules/borrowhub.mdc` (architecture + git prefixes)
- Monorepo: `apps/web`, `apps/mobile`, `services/bff`, `services/backend`, `packages/*`, `contracts/`, `compose.yaml`

## Verification performed

| Check | Result |
| --- | --- |
| `pnpm --filter @borrowhub/bff typecheck` | pass |
| `pnpm --filter @borrowhub/web typecheck` and `build` | pass |
| `pnpm --filter @borrowhub/mobile exec tsc --noEmit` | pass |
| `cd services/backend && ./gradlew test` | pass (`BackendApplicationTests.contextLoads`) |
| `curl http://127.0.0.1:3000/health/live` | `{"status":"ok"}` |
| `curl http://127.0.0.1:3000/health/ready` | `{"status":"ok"}` |
| `curl http://127.0.0.1:8080/actuator/health/liveness` | `{"status":"UP"}` |
| `curl http://127.0.0.1:8080/actuator/health/readiness` | `{"status":"UP"}` |
| Playwright `http://localhost:5173/` | title BorrowHub Admin; starter heading and bullets rendered |
| Expo on a device/simulator | not run this session |
| `docker compose up` | not required for this skeleton; not run |

## Unresolved / blockers

- `P0-01`: Azure subscription, Entra tenant, region, budget
- `P0-02`: universal vs separate frontend spike (`DEC-01` remains proposed)
- Entra app registrations and secrets
- Bicep/CI not started

## Next action after you push and merge

Pull `main`, create a new `setup/` or `feature/` branch. Suggested: `feature/p1-01-flyway-schema` **or** `setup/p0-02-frontend-spike`.
