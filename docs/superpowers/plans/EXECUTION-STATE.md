# Execution State — Plan 1 Foundation

**Saved:** 2026-06-08 (updated 2026-06-08 by full-funnel-attribution-ui-2)
**Status:** DB-independent tasks (1, 6, 7) DONE on branch `plan1-foundation`.
Tasks 2-5 + 8 BLOCKED on local Postgres (none installed; no passwordless sudo;
user not in docker group). Awaiting Shaw to provision PG (apt/docker/Cloud SQL).

## Plan Location
`docs/superpowers/plans/2026-06-08-full-funnel-attribution-mvp.md`

## Branch
`plan1-foundation` (off `main` @ eac4df4). Commits per task, not yet pushed/merged.

## Task Status
- [x] Task 1: Backend Scaffold + Express Server — DONE (commit c5f8566). `curl /api/health` → ok via tsx.
- [~] Task 2: Database Schema + Migration Runner — CODE STAGED (commit b139b33), tsc clean. PENDING: run `npm run migrate` (needs PG).
- [~] Task 3: Auth System — JWT + Role Hierarchy — CODE STAGED (b139b33), wiring verified (401 guard works, /auth/login reaches pg). PENDING: real login (needs PG).
- [~] Task 4: Dev Seed Data — CODE STAGED (b139b33). PENDING: run `npm run seed` (needs PG).
- [~] Task 5: Core API Routes — Funnel + Tenants — CODE STAGED (b139b33), routes wired. PENDING: scoped-query verification with seeded data (needs PG).
- [x] Task 6: Frontend Auth Context + Role Router — DONE (commit 0887395). `npm run build` green; dev server serves SPA 200.
- [x] Task 7: Widget System Foundation — DONE (commit 1e3bbf2). Typechecks/builds; not yet wired into routing (Plan 3).
- [~] Task 8: Widget Layout API Route — CODE STAGED (b139b33), route wired. PENDING: GET/PUT round-trip with a real user (needs PG).

Legend: [x] done+verified · [~] code written & typechecked, runtime verification pending Postgres · [ ] not started.

## When Postgres is available — exact resume steps
```
# (after PG is reachable at DATABASE_URL; default postgresql://localhost:5432/salesmatch)
createdb salesmatch                       # or via the chosen provider
cd /home/shaw/repos/salesmatch-funnel/server
npm run migrate                           # expect: Applying 001-init.sql -> ✓ -> Migrations complete
npm run seed                              # expect: Seed complete + 4 dev logins (pw dev123)
npm run dev &                             # server on :8082
# Verify scoped isolation:
TOKEN=$(curl -s -X POST localhost:8082/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"client@salesmatch.co","password":"dev123"}' | jq -r .token)
curl -s "localhost:8082/api/funnel?days=7" -H "Authorization: Bearer $TOKEN" | jq '.stages|keys'
# Then mark Tasks 2,3,4,5,8 [x] and run finishing-a-development-branch.
```

## Future hardening (out of Plan 1 scope, noted during execution)
- Express has no error handler → DB/runtime errors return the default HTML stack-trace
  page (leaks internals). Add a JSON error handler before Cloud Run deploy (Plan 5).
- `npm run build` (tsc) is typecheck-only (noEmit); add a real emit/bundle step for prod.

## BLOCKER (resolve first)
Local Postgres is unavailable on this VPS:
- No `postgres`/`psql`/`createdb` installed, no apt package.
- `sudo` requires a password (not passwordless) — can't `apt install`.
- `docker` exists but socket is root-only; user `shaw` not in `docker` group.
To unblock (Shaw runs ONE in-session via `!`):
- `! sudo apt install -y postgresql redis-server` (then `sudo service postgresql start`), OR
- `! sudo usermod -aG docker shaw` (re-login, then PG+Redis via containers), OR
- provide a Cloud SQL connection string in `DATABASE_URL`.
Once PG is reachable at `DATABASE_URL` (default `postgresql://localhost:5432/salesmatch`):
`createdb salesmatch && cd server && npm run migrate && npm run seed`, then resume Tasks 2→3→4→5→8.

## Deviations from the plan (intentional, plan code never compiled before)
1. `server/tsconfig.json`: added `allowImportingTsExtensions:true`, `noEmit:true`,
   `types:["node"]`. Reason: plan uses `.ts` import specifiers (run via tsx in dev);
   `types:["node"]` stops the parent repo's broken `@types/mapbox__point-geometry`
   from leaking into the nested server project (TS2688). `npm run build` is now a
   typecheck-only — production emit/bundling deferred to Plan 5 (Cloud Run).
2. Added `@types/node@^22` to server devDeps (needed for `process`, `node:fs`, etc.).
3. `vite.config.ts`: also proxy `/auth` → :8082 (PLAN BUG — frontend posts to
   `/auth/login` but Vite only proxied `/api`, so login would 404 in dev).
4. `server/package.json`: included the `seed` script up front (plan adds it in Task 4).

## Execution Approach
Use subagent-driven development: dispatch one subagent per task, spec review after each, then code quality review. Tasks are sequential (1→2→3→4→5 backend chain, 6→7 frontend chain, 8 depends on 5+7).

## Key Context
- Repo: /home/shaw/repos/salesmatch-funnel
- The plan doc has COMPLETE code for every step — subagents just need the task text + file structure context
- Vite already proxies /api to localhost:8082
- Existing prototype preserved via ?demo=true escape hatch
- Backend tasks (1-5) must run before frontend auth tasks (6-8) can be tested end-to-end
- Tasks 7 and 8 are independent of each other but both need Task 6 done first

## Resume Instructions
1. Read the plan at docs/superpowers/plans/2026-06-08-full-funnel-attribution-mvp.md
2. Check which tasks are done (git log, check files exist)
3. Resume from first incomplete task
4. Use subagent-driven development skill to dispatch implementers

## Completed Deliverables (from prior session)
- docs/full-funnel-attribution-analysis.md — platform analysis (KEEP, don't modify)
- docs/questionnaire-responses.md — Shaw's 28 answers
- questionnaires/full-funnel-attribution-ui-v1.html — OrchestraOS format questionnaire
- docs/full-funnel-mockup.html + docs/full-funnel-attribution-wireframe.html — wireframes
