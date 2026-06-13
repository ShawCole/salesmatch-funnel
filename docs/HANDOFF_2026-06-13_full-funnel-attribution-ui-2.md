# Handoff: full-funnel-attribution-ui-2 → full-funnel-attribution-ui-3 (2026-06-13)

## Session Summary
I (full-funnel-attribution-ui-2) own the UI for evolving the SalesMatch funnel prototype
(`/home/shaw/repos/salesmatch-funnel`, deployed at https://sm-funnel.netlify.app) into a live,
multi-tenant **full-funnel attribution dashboard** — which is the attribution layer of the larger
**ArkData** platform (app.arkdata.io). My predecessor scoped + wrote a backend-heavy "Plan 1." **Shaw
pivoted hard away from that to "just build the UI"** — so this session is almost entirely visible,
deployed UI built from mock data, plus three research deliverables. Everything below is on branch
**`plan1-foundation`** and live on Netlify.

## ⚠️ Branch & deploy reality (read first)
- **All work is committed on branch `plan1-foundation`, NOT `main`.** Decide with Shaw whether to merge.
- **Netlify is current regardless of git branch** — deploys come from a local `npm run build` → `dist/`
  → `netlify deploy --prod --dir=dist --site 9b081c5d-c691-46b0-b201-a4774c9b1587`. Not from git/CI.
- Build = `npm run build` (`tsc -b && vite build`). Dev = `npm run dev` (Vite :5173, proxies /api+/auth → :8082).

## Arc 1 — The pivot: build the visible UI (the product Shaw actually wanted)
- The predecessor's Plan 1 backend (Express + Postgres + JWT + widgets) was staged but blocked on a
  missing local Postgres. Commits `0887395, 1e3bbf2, b139b33, 28b3cad, 9845ab6`. **Largely superseded** —
  Shaw said build the UI, not backend. Backend code still on the branch; not the focus.
- **Live full-funnel attribution dashboard** as the landing view — `91fd42c`. Built from
  `docs/full-funnel-mockup.html`. Live-ticking mock data, KPI strip, funnel, drill panel, live pixel feed,
  pixel-verified-vs-claimed.

## Arc 2 — Core UI feature set (all deployed + browser-verified, desktop & mobile)
- **People vs Marketing funnel split** (top toggle) — `419e395`. People = person-level deterministic
  (uploaded→audience→LP→converted→booked→closed); Marketing = aggregate (impressions→…→closed). Who/Source
  drill toggle on People; attribution-model selector only on Marketing.
- **Role-based views** — `11d4d5d`. Persona switcher (Admin/Meta-Partner/Partner/Tenant) + portfolio
  roll-ups (aggregate KPIs, sparklines, notices) + breadcrumb drill-down to a tenant's funnel. Org tree in
  `src/data/orgMock.ts`.
- **Mobile optimization** — `1a15cbc`. Funnel rows stack (the fixed-width columns crushed the bars);
  `h-dvh` nav; persona switcher nowrap.
- **Reconciliation explainer** (the P0 from research; the flagship) — `d3d53a4` → `9ec21e4` (honest
  framing: naive sum is the trap) → `b1217e4` (**fully per-platform, no combined number**) → `3cf1e7b`
  (**one pixel-verified truth**, not two). LOCKED model: each platform reconciled on its own (Meta 96→61,
  Google 58→50), then composed to one truth (89 = Meta-only 33 · overlap 28 · Google-only 22 · pixel-only
  6). Files: `src/data/reconciliationMock.ts`, `src/components/Waterfall.tsx`, `src/views/ReconciliationView.tsx`.
- **Attribution models** — `1f8b247`. Full suite (first/last/linear/time-decay/data-driven). Total
  conversions FIXED; model re-splits credit across channels. Credit-by-channel bars + Channel×Model
  comparison matrix + insight line. Files: `src/data/attributionMock.ts`, `src/views/AttributionByModel.tsx`.

## Arc 3 — Research deliverables (3 docs)
- **Competitive landscape** — `e28dd2c` → `docs/competitive-landscape-research.md` (multi-agent
  deep-research, verified). Wedge = pixel-verified person-level attribution + partner payouts.
- **UI patterns** + feature inventory — `1630e76`, `5bd0bc9` → `docs/ui-patterns-research.md`. Common
  themes + our gaps (no line charts, no sankey, no persistent filter bar, no light theme, no partner portal).
- **ArkData AI-Insights feature HANDBOOK** — `1f63272`. Canonical:
  `/home/shaw/repos/arkdata-app/docs/AI_INSIGHTS_FEATURE_HANDBOOK.md` (30KB, 14 sections); tracked copy
  `docs/arkdata-ai-insights-handbook.md`. For a future agent ("fable") to build the AI insights feature on
  app.arkdata.io. **Researched the real ArkData platform via 3 parallel agents.** Key findings inside:
  (1) Meta Ads + GA4 integrations DON'T EXIST yet (must be built); (2) "ArkData look" = the shipped
  React18+Vite+Tailwind+shadcn app (dark slate, per-tenant accent), not the gold marketing brand; (3) an AI
  Proposal Builder already exists (Gemini 2.5 Flash on Vertex) to inherit.

## Decisions LOCKED
- **Build visible UI first, mock data, deploy to sm-funnel.** Shaw judges by the deployed product, not
  backend. (See memory `prioritize-visible-ui`.)
- Reconciliation: **fully per-platform, ONE pixel-verified truth, never a summed/stacked number.**
  Reconciliation answers *how many real people*; attribution answers *who gets credit* — different surfaces.
- Attribution: total fixed, model re-splits credit; full 5-model suite.
- Role hierarchy admin > meta_partner > partner > tenant.
- **"DataMoon" never surfaced to tenants** (org-wide rule, UI + network). AudienceLab is the only provider brand.

## What needs building next (await Shaw's direction — he drives this project closely)
Likely candidates (no work started on these):
1. **UI P0 gaps** from `docs/ui-patterns-research.md`: real time-series line charts (sparklines aren't
   enough), a sankey path view, a persistent filter bar + comparison period, loading/empty/error states,
   light theme (for white-label), sidebar nav as surfaces grow.
2. **Real data wiring** — the perennial blocker: needs the Fast Fund Leads Meta token + a database.
3. **Branch decision** — merge `plan1-foundation` → main, or keep iterating.
4. The **AI-insights handbook** is done; "fable" likely owns that build, not necessarily ui-3.

## Critical gotchas (do not relearn)
- **All UI work is on `plan1-foundation`, not main.** Don't assume main has it.
- **Process-kill noise:** `pkill`/`kill` in compound commands often return "Exit code 144" but actually
  worked — re-check with `pgrep`, don't panic.
- **Browser verification pattern** (used all session): launch headless Chrome from the puppeteer cache
  (`find /home/shaw/.cache/puppeteer/chrome -name chrome`) with `--headless=new --remote-debugging-port=9222
  --no-sandbox`, then screenshot via the `superpowers-chrome` `use_browser` MCP tool. **That MCP tool
  disconnected near session end** — may need a reconnect/re-check. Always start `npm run dev` first.
- **Backend `npm run build` is typecheck-only** (`noEmit`) — no prod bundle yet (Plan 5 concern).
- **No local Postgres** (no passwordless sudo, user not in docker group) — backend DB tasks blocked. Moot
  since the UI pivot, but don't burn time retrying.
- **Map tiles:** commit `a5e2761` (not mine — concurrent agent) repointed tiles to `gs://arkdata-tiles`
  because the old `listmagic-tiles` bucket billing was closed. Verify the Map view still renders.
- **Telegram to Shaw:** curl in `~/scripts/agent-orchestra/prompts/infrastructure.md` (bot token + chat_id
  6046524812). He follows along there; text him on milestones with the live URL.

## Key files this session
| Path | What |
|---|---|
| `src/App.tsx` | Persona shell + nav + view routing (people/marketing/reconciliation/map + portfolio) |
| `src/views/FullFunnelView.tsx` | The two funnels + mode toggle + KPIs + drill + live feed |
| `src/views/ReconciliationView.tsx` | Per-platform reconciliation + truth composition |
| `src/views/AttributionByModel.tsx` | Credit-by-channel + model comparison matrix |
| `src/views/PortfolioView.tsx` | Role-based portfolio roll-up |
| `src/components/{Waterfall,Sparkline}.tsx` | Reusable chart components |
| `src/data/{funnelMock,reconciliationMock,attributionMock,orgMock}.ts` | All mock data + contracts (real-data seams) |
| `docs/{competitive-landscape-research,ui-patterns-research,arkdata-ai-insights-handbook}.md` | Research deliverables |
| `/home/shaw/repos/arkdata-app/docs/AI_INSIGHTS_FEATURE_HANDBOOK.md` | Canonical AI-insights handbook |
