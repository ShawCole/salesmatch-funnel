# Handoff: full-funnel-attribution-ui → full-funnel-attribution-ui-2 (2026-06-08)

## Session Summary

I (full-funnel-attribution-ui, a T2 product/UI agent on `vps`) own the product scoping and
UI architecture for evolving the **SalesMatch funnel prototype** (`/home/shaw/repos/salesmatch-funnel`,
deployed at https://sm-funnel.netlify.app/) into a **live, multi-tenant, full-funnel attribution
dashboard**. Today I: completed a full codebase audit, verified the 3 prior deliverables from the
Haiku agent (analysis doc, questionnaire, wireframes), recorded Shaw's **28 questionnaire answers**,
captured the **hero-view architecture** from a follow-up message, and wrote the complete **Plan 1
MVP build plan** (8 tasks, full code for every step). Shaw said **"Begin with the phased build plan
and run with it."**

I **self-terminated on context exhaustion at ~20:19, immediately AFTER writing Plan 1 and BEFORE
executing a single task.** Nothing in `/server`, `/src/layouts`, or `/src/views` has been created yet.

**Your #1 job: execute the Plan 1 build plan.** Everything is specified — the plan contains complete,
paste-ready code for all 8 tasks.

## Arc 1: Audit, questionnaire, and Plan 1 authoring

- **Codebase audit** — read every source file (App.tsx, funnel/ components, contexts, hooks, utils, types).
  No code was modified; the existing prototype is intact and stays preserved via a `?demo=true` escape hatch.
- **Prior deliverables verified (KEEP, do not modify):**
  - `docs/full-funnel-attribution-analysis.md` — platform analysis doc (Haiku-authored, good).
  - `questionnaires/full-funnel-attribution-ui-v1.html` — OrchestraOS-format questionnaire.
  - `docs/full-funnel-mockup.html` + `docs/full-funnel-attribution-wireframe.html` — wireframes.
- **28 questionnaire answers recorded** → `docs/questionnaire-responses.md` (submitted 2026-06-08T15:49:51Z).
- **Hero-view architecture captured** from Shaw's follow-up (see LOCKED decisions below).
- **Plan 1 build plan written** → `docs/superpowers/plans/2026-06-08-full-funnel-attribution-mvp.md` (59 KB, 8 tasks, full code).
- **Execution state saved** → `docs/superpowers/plans/EXECUTION-STATE.md` (task checklist, all unchecked).
- **Proof / git:** latest commit is `b18af9f Add full-funnel attribution wireframe + finalize analysis doc`.
  The plan, EXECUTION-STATE, and questionnaire-responses.md are **untracked** (`git status --short`
  shows `?? docs/questionnaire-responses.md` and `?? docs/superpowers/`) — they were NOT committed.
  Commit them when you start.

## What needs building next (priorities)

1. **EXECUTE THE PLAN 1 BUILD PLAN** at
   `docs/superpowers/plans/2026-06-08-full-funnel-attribution-mvp.md` — 8 sequential tasks, full code
   for every file already in the doc. Use the **superpowers:executing-plans** skill (or
   subagent-driven-development if you have agent-spawning authority — confirm with Shaw first; this
   agent's prompt does not grant it). Tasks:
   1. Backend scaffold + Express server (`server/package.json`, tsconfig, index.ts, config.ts)
   2. DB schema + migration runner (pool.ts, migrate.ts, `001-init.sql`)
   3. Auth — JWT + role hierarchy (roles.ts, middleware.ts, auth routes, scoping.ts)
   4. Dev seed data (seed.ts — 4 users, 2 pipelines, 30d events)
   5. Core API routes — funnel + tenants (funnel.ts, tenants.ts)
   6. Frontend auth context + role router (AuthContext.tsx, LoginPage.tsx, App.tsx update)
   7. Widget system foundation (registry, WidgetShell, WidgetGrid, DashboardLayout, useWidgetLayout)
   8. Widget layout API route (widgets.ts GET/PUT)
   - **Dependency order:** backend chain 1→2→3→4→5; frontend chain 6→7; task 8 depends on 5+7.
2. **Plan 2 — Data Pipeline** (Weeks 2-3): Meta Ads integration, event normalization, hourly
   aggregation, live funnel API. Write/author Plan 2 only after Plan 1 lands.
3. **Plan 3 — Core Views:** tenant funnel (live data), partner portfolio (sparkline KPIs),
   funnel→demographics drill-down.
4. **Plan 4 — Multi-tenant + Google Ads** and **Plan 5 — Ship** (export, activity feed, Cloud Run deploy).

## Critical gotchas (do not relearn)

- **Do NOT modify** `docs/full-funnel-attribution-analysis.md`, the wireframes, or `questionnaire-responses.md` — they're finalized inputs.
- **Preserve the existing prototype** — Plan 1 evolves in-place but keeps the current UI reachable via `?demo=true`. Don't delete the existing PipelineDashboard / demographics-map; they become the tenant funnel view + drill-down view.
- **Vite already proxies `/api` → `localhost:8082`.** Backend must listen there in dev (check the plan's config).
- **"DataMoon" must never appear in any client-facing material** (UI or network). AudienceLab is the only surfaced provider brand. (Org-wide rule.)
- **Plan/state docs are untracked** — they were written but never `git add`/committed. Don't assume they're in history.
- **Backend tasks (1-5) must run before frontend auth tasks (6-8)** can be tested end-to-end.
- **No external contact** — this is analysis/build for Shaw only.
- **Subagent authority is NOT granted** by this agent's prompt — EXECUTION-STATE.md suggests subagent-driven-development, but confirm with Shaw before spawning anything.

## Key files / artifacts this session

| Path | What |
|---|---|
| `docs/superpowers/plans/2026-06-08-full-funnel-attribution-mvp.md` | **THE Plan 1 build plan** — 8 tasks, full code. Execute this first. |
| `docs/superpowers/plans/EXECUTION-STATE.md` | Task checklist (all unchecked), resume instructions, dependency notes. |
| `docs/questionnaire-responses.md` | Shaw's 28 answers — the locked requirements. |
| `docs/full-funnel-attribution-analysis.md` | Platform analysis (Meta/Google APIs, attribution models, pixel role). KEEP. |
| `docs/full-funnel-mockup.html` | Interactive full-funnel mockup. Reference. |
| `docs/full-funnel-attribution-wireframe.html` | Wireframe. Reference. |
| `questionnaires/full-funnel-attribution-ui-v1.html` | OrchestraOS-format questionnaire. |
| `REMAINING-WORK.md` | Pre-existing prototype gaps (Apr 6). |
| `~/scripts/agent-orchestra/prompts/full-funnel-attribution-ui.md` | This agent's full mission prompt. |

## Architecture decisions LOCKED

From the 28 questionnaire answers + Shaw's hero-view follow-up:

- **4 role tiers (hierarchy):** `admin` (ArkData god-mode, sees all) > `meta_partner` > `partner` > `tenant`.
  JWT carries tenant hierarchy claims; scoping = a user sees their own tenant + all tenants below them.
  **Meta-Partners get their own isolated God-mode view** across all their tenants, partners, and pipelines.
- **Multi-tenant from day 1.** Hierarchy: tenant > pipeline > campaign > ad set > creative.
- **Widget-based, role-configurable layout** — every dashboard section is a widget; layouts saved per-user
  via `/api/widgets`. **Live activity feed is sectioned-off; the dashboard is customizable.**
- **Partner roll-up = sectioned dashboard:** (1) notices/suggestions based on client funnel performance,
  (2) divs with KPIs + inline **sparkline** micro-graphs per campaign/client. Both blended roll-up + per-tenant drill-down.
- **Tenant funnel → demographics drill-down:** clicking a funnel stage opens the integrated map/demographics
  explorer scoped to that stage. Clients **do not** see all the power-user filters in this view.
- **MVP ad platforms:** Meta Ads (graph API) + Google Ads only. **No DSP.** Multiple ESPs for email.
  Meta creds exist for the **Fast Fund Leads** Business Manager account.
- **Attribution:** Last-Touch for MVP. Lookback window configurable per tenant (7/14/30/60).
  Build our own cross-platform identity graph (unified dedup).
- **Conversions:** multiple events — micro (form view/start) + macro (submitted/booked).
- **Freshness:** hourly cron aggregation; <5-min live for pixel fires + audience-sync status; live event ticker.
- **Pixel flow:** dashboard API-polls the existing ArkData API for pixel counts; shows audience sync status,
  last sync, build progress, match rate, eligibility/exclusion reasons, quality score.
- **Stack:** React 19 + TS + Tailwind (frontend) | Node + Express + Postgres + Redis (backend) |
  JWT auth | Vite dev proxy. **Backend on GCP Cloud Run + Cloud SQL (Postgres) + Redis Memorystore + Pub/Sub.**
- **White-label:** full — partners can rebrand (custom domain, logo, colors) for their clients.
- **This replaces the prototype** (evolve the codebase). Responsive but desktop-primary.
- **Export:** CSV + PDF + scheduled email reports. **Timeline:** ASAP, minimal MVP in 4-6 weeks. **Budget:** open, follows scope.

## OPEN decisions (defer / confirm)

- Pricing tier structure — **deferred** ("build first, price later").
- Budget ceiling — **open**.
- Subagent execution authority — **not granted by prompt; confirm with Shaw**.

## Transcript paths (archaeology)

- Final boot (ended on context exhaustion, ~376 records): `/home/shaw/.claude/projects/-home-shaw-repos-salesmatch-funnel/ca12af59-aad3-444e-8a73-1cfa6ef47177.jsonl`
- Earlier session (~316): `/home/shaw/.claude/projects/-home-shaw-repos-salesmatch-funnel/0995613e-c940-48e7-a94d-0e62d895766c.jsonl`
- Earlier session (~126): `/home/shaw/.claude/projects/-home-shaw-repos-salesmatch-funnel/81663701-33bf-4bab-8946-c072d06fadaf.jsonl`
