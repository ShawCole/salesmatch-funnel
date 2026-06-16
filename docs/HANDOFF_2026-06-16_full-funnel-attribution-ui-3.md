# Handoff: full-funnel-attribution-ui-3 → full-funnel-attribution-ui-4 (2026-06-16)

## Session Summary
I (ui-3) own the UI for the full-funnel attribution dashboard (`/home/shaw/repos/salesmatch-funnel`,
live at https://sm-funnel.netlify.app) — the attribution layer of ArkData. This session: (1) a
**ground-up UI overhaul** to be native to the shipped ArkData app, reaching feature **parity-plus** with
the market leaders; (2) added the **partner-payouts wedge, AI Insights, Settings, Reports, Incrementality,
MMM, UTM/campaign layer, Campaign Performance**; (3) ran an **LLM council** on competing with Viktor;
(4) **wired REAL Meta campaign data** for Fast Fund Leads / Lions Pride through a clean seam; (5) mapped
the **pixel Postgres** and caught a **bogus `visitor_count` (179k vs real 350)** caused by a
`datamoon_sync_worker` bug — **passed to arkdata-dev21** to fix. All on branch **`plan1-foundation`**.

## ⚠️ Branch & deploy reality
- All work is on **`plan1-foundation`, not main**. Decide with Shaw before merging.
- Netlify deploys from a **local `npm run build` → `dist/` → `netlify deploy --prod --dir=dist --site
  9b081c5d-c691-46b0-b201-a4774c9b1587`**, NOT from git.
- Build = `npm run build` (`tsc -b && vite build`). Dev = `npm run dev` (Vite :5173). Stack: React 19 +
  Vite 7 + **Tailwind v4** (CSS-first, no config) + recharts 3 + lucide. shadcn-style tokens, not the old glass.

## Arc 1 — Fable prep → pivot to building on Opus 4.8
Shaw wanted Fable 5 (desktop app) to do a ground-up overhaul; I wrote a one-shot prompt
(`docs/handoff/sm-funnel-overhaul-ONESHOT.txt` + `sm-funnel-research-digest.md`, `d2c32e5`). Fable didn't
pan out → Shaw said "proceed with opus 4.8". I ran the whole rebuild.

## Arc 2 — Ground-up overhaul (parity-plus). 15 views.
Commits `c65a3de` (shell), then per-feature below. Design system in `src/index.css` (shadcn-neutral HSL,
light+dark, per-tenant accent var), shell in `src/shell/*` (Sidebar 240/68, TopBar persona switcher,
sticky FilterBar), primitives `src/ui/*` (Card, DataTable, KpiCard, charts, ErrorBoundary).
- **UTM/campaign layer** `1f49d5a` — `src/data/utmMock.ts`; pixel reads utm_* pre-redirect; resolves
  click-ID-less conversions (email/partner/organic); fed into reconciliation. See `[[utm-tracking-mechanism]]`.
- **Partner Portal + Payouts** `8c936d5` — `src/data/payoutsMock.ts`, `src/views/Payouts.tsx`; commissions
  tied to pixel-verified conversions (THE WEDGE). Earnings ledger here; **money movement is a SEPARATE
  system** (Stripe Connect/Trolley/Tipalti) — established with Shaw.
- **AI Insights** `6e09ad2` — grounded in recon/attribution/UTM; recommended actions + Route-to-Slack.
- **Settings** `1d9e30e` — integrations grid, white-label accent picker (live), alerts, team.
- **Reports** `9339441` — sortable DataTable (channels/campaigns/clients) + CSV export.
- **Incrementality** `a7b7390` — holdout/geo lift, iROAS, non-incremental %.
- **MMM** `f828e3d` — response curves + budget optimizer.
- **Customizable Overview widgets + scheduled reports** `78ffae4`.
All browser-verified (desktop+mobile, light+dark, tenant+portfolio). See `[[feature-parity-milestone]]`.

## Arc 3 — LLM council: how to compete with Viktor (`56491c8`)
Viktor = $75M Accel AI "coworker" running Meta/Google ads from Slack (shallow attribution). **Verdict:**
be the **referee/source-of-truth**, not an action layer. C (measurement + partner-payouts wedge) is the
business; do NOT become an action layer (D); A (Slack agent) only as a thin verified-alert; gated on real
customer + provable verified data. Report: `docs/council/council-report-2026-06-14.html` + transcript.

## Arc 4 — Product realignment (Shaw, important)
Shaw corrected the over-rotation on payouts: **the product is the measurement layer** that turns a
client's *active campaign* data into **actionable insights**, through two lenses — **client** (is my
marketing working?) and **agency** (how well did we perform?). Payouts is adjacent. The earnings ledger
is needed but is a separate concern; money movement is a separate financial system.

## Arc 5 — REAL DATA: Meta campaign pull (the unblock)
- **`scripts/meta-pull.mjs`** `169c858` — dependency-free Node pull (campaigns + daily insights), reads
  `.env.local`, writes gitignored `src/data/real/meta-<act>.json`.
- **`src/data/meta.ts` + `src/views/CampaignPerformance.tsx`** `fa1edbf` — the contract (`CampaignPerf`,
  `AccountSummary`, `normalizeMeta`, `recommendAction`) + the **real/mock seam** (`import.meta.glob` on
  `src/data/real/`) + the Campaign Performance view (pacing, CPA-vs-target, recommended action). Honest
  "sample" vs "live" badge.
- The **integrations agent (`datamoon-integrations-agent`)** owns the production pull. It connected an
  ArkData **System User** (`Ark Data Destinations Sync`, token in GCP Secret Manager
  `partner-arkdata-meta-system-user-token`, project `arkdata-hub`) and pulled FFL **`act_656405914233348`**.
  Handoff for the read half: `docs/handoff/arkdata-meta-connect-pull-handoff.md` + a copy committed into
  `arkdata-meta-connect/docs/PULL_HANDOFF.md`. Refresh script:
  `/home/shaw/arkdata-pipeline/destinations/meta_read_nightly.sh`.
- **Real FFL data (last 30d):** 11 campaigns, **$9,838 spend, 3,662 clicks, 239 leads, 5 active**.
  Top: *truckers* $26 CPA (149 leads, scale); *restaurants* $76 CPA (fix); two retargeting campaigns
  spending with 0 leads.
- **Over-attribution caught (proof of thesis):** Meta reports the 239 leads under 3 aliases
  (`lead`/`onsite_conversion.lead_grouped`/`offsite_complete_registration_add_meta_leads`). Naive sum =
  **717 (3×)**. Fixed in `6c83b58` — count by **`CONVERSION_CONCEPTS`** (first alias per concept) = 239.

## Arc 6 — Pixel Postgres + the visitor_count bug (passed to dev21)
- **Pixel DB:** host `34.148.231.66`, db `pixel`, user `postgres`, password = **`$PG_PASSWORD` in
  `~/arkdata-pipeline/run_daily.sh`** (the `ArkData2027` hardcoded in `v2_populate.py`/`loader.py` is
  **STALE** — auth fails). `psql` not installed; use `psycopg2` (present).
- **FFL's two pixels** are in the **legacy `pixels` table** (not `v2_pixels`), same tenant
  `74048456-bde7-460f-ab6c-e051254241cf`, provider **datamoon** (via intentmap.io):
  - Lion's Pride Capital — `a89d3364-d41e-4b02-91d5-232936e01a96`, `lionspridecapital.com`, slug `fast-fund-leads` (campaigns point here).
  - Fast Fund Leads — `cdbd83f6-edc8-4e6c-8902-2e9399f87a83`, `fastfundleads.com`, slug `fast-fund-leads-clients`.
- **The bug:** `pixels.visitor_count` showed **179,105** for Lion's Pride. DataMoon's UI = 708 total /
  **350 identified** (90d); our **`v2_persons` = 350** (matches DataMoon exactly). So 179k is bogus.
  Root cause in `arkdata/infra/workers/datamoon_sync/datamoon_sync_worker.py`: (1) `update_last_sync()`
  does `visitor_count = COALESCE(visitor_count,0) + upserted` every overlapping sync (accumulator);
  (2) **misattribution** — `sync_pixel` fetches `?website=<slug>` and stamps that pixel's id/tenant on
  EVERY row; agency-level slugs dump all visitors into one client. **Built by dev17, owned by dev20.**
- **Passed to arkdata-dev21** (`/tmp/datamoon-sync-bug-for-dev21.md`) to investigate → **text Shaw its
  understanding before fixing** → fix (scope by client + SET not += + reset corrupted rows). In progress.
- **RULE (locked):** the UI reads **`v2_persons` / `v2_events`** for pixel performance — **NEVER
  `visitor_count`.** Real comparison: Lion's Pride **350 resolved**, Fast Fund **65**.

## Decisions LOCKED
- Build UI first, deploy to sm-funnel. ArkData-native design. Reconciliation = one pixel-verified truth.
  Attribution = total-fixed. **Partner-payouts is the wedge** but the **product core = measurement of
  active-campaign performance (client + agency lens)**; payouts adjacent; money movement = separate system.
- **UI pixel data from `v2_persons`/`v2_events`, never `visitor_count`.** Conversions via
  `CONVERSION_CONCEPTS` (never sum aliases). **One Meta app does read+write** (both directions).
- **DataMoon never surfaced** — `provider='datamoon'`/intentmap.io must map to **AudienceLab** in any UI.
- Real client data is **NOT** deployed to the public URL (would bake FFL ad data into a public bundle).

## What needs building next (priorities — confirm with Shaw)
1. **Goals/targets layer** — real per-campaign CPA/ROAS goals so Campaign Performance recommendations are
   real (today `targetCpaCents` falls back to blended-CPA heuristic). This = the "agency vs goal" lens.
2. **Tenant-aware data providers** — `src/data/meta.ts` loads one global real JSON; key it by tenant
   (FFL = tenant `74048456` / `act_656405914233348`) so the page works when wired into the main arkdata app.
3. **Pixel provider + Pixels comparison** — read `v2_persons`/`v2_events` (350 vs 65), add Meta-claimed
   (239) vs pixel-resolved to Reconciliation. (Decide: build now vs wait for dev21's scoping fix.)
4. **Wire other views (funnels/reconciliation/attribution) onto real FFL data.**
5. **Agency Performance scorecard.** Deep-link URLs per view (currently state-only nav).

## Critical gotchas (do not relearn)
- **Branch `plan1-foundation`, not main.** Netlify ≠ git (deploy from local build).
- **Browser verify:** `npm run dev` (5173); launch headless Chrome from puppeteer cache with
  `--headless=new --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --no-sandbox
  --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (swiftshader needed or the **map**
  WebGL fails); screenshot via `.shot.mjs` (gitignored, repo root) using `puppeteer-core` in `~/node_modules`.
  Point puppeteer at `127.0.0.1` not `localhost` (IPv6 ::1 refuses). The superpowers-chrome MCP is flaky.
  Chrome + dev server die between sessions — relaunch both.
- **Real data:** `src/data/real/*.json` is **gitignored** and only on this box. `import.meta.glob` bakes
  it into ANY build — so do NOT run the prod deploy build with real data present unless intentionally
  exposing it. Public deploy = sample data.
- **Pixel DB password** is in `run_daily.sh` (`PG_PASSWORD`), NOT the stale hardcode. `psql` absent → psycopg2.
- **`pixels.visitor_count` is corrupt** (accumulator bug) — never read it; use `v2_persons`/`v2_events`.
- **tmux inject pattern:** ALWAYS `capture-pane` first; if the operator has unsubmitted text in the box,
  send `Enter` to let it through, *then* inject yours (don't clobber). Long prompts → write a file, inject
  "Read <file> and follow it". Sessions: `datamoon-integrations-agent` (Meta/pixel pipeline),
  `arkdata-dev21` (worker bug fix, in arkdata repo), `orchestra-builder` (routing/who-owns-what).
- **Secrets got echoed** into transcripts this session (PG password, AudienceLab account passwords) — they
  should be rotated + moved to Secret Manager (flagged; the integrations/pipeline agents own that).

## Key files this session
| Path | What |
|---|---|
| `src/shell/{AppShell,Sidebar,TopBar,FilterBar,nav}.tsx/ts` | New app shell + nav (15 views) |
| `src/ui/{primitives,DataTable,KpiCard,charts,ErrorBoundary,theme,cn}.tsx` | Design-system primitives |
| `src/data/meta.ts` | **Real Meta seam + contract** (CampaignPerf, normalizeMeta, CONVERSION_CONCEPTS) |
| `src/views/CampaignPerformance.tsx` | Active-campaign performance (real/mock) |
| `src/views/{Overview,Insights,FunnelView,Campaigns,Paths,Reconciliation,Attribution,Experiments,MediaMix,Payouts,Reports,Settings}.tsx` | The views |
| `src/data/{utmMock,payoutsMock,insightsMock,experimentsMock,mmmMock,seriesMock,funnelMock,reconciliationMock,attributionMock,orgMock}.ts` | Mock data + contracts |
| `scripts/meta-pull.mjs` | Meta Marketing API pull (real data) |
| `.shot.mjs` (gitignored) | CDP screenshot harness |
| `docs/handoff/arkdata-meta-connect-pull-handoff.md` | Read-half handoff to integrations agent |
| `docs/council/council-{report,transcript}-2026-06-14.*` | Viktor competitive-strategy council |
| `/tmp/datamoon-sync-bug-for-dev21.md` | The pixel bug spec passed to dev21 |

## Cross-agent state
- **datamoon-integrations-agent** — pulled real FFL Meta data; building `destinations-api` TS service +
  ArkData-BM cutover. Owns `arkdata-meta-connect` + `arkdata-pipeline`.
- **arkdata-dev21** — investigating/fixing the `datamoon_sync_worker` visitor_count + misattribution bug;
  will text Shaw its understanding before fixing.
- **orchestra-builder** — routing; confirmed dev17 built / dev20 owns the worker.

## .jsonl transcripts (grep, don't bulk-read)
| Transcript | Size | Notes |
|---|---|---|
| `…/2849fdca-….jsonl` | 12.6 MB | **this session (ui-3)**: overhaul + real data + pixel bug |
| `…/964735f9-….jsonl` | 12.9 MB | ui-2 (pivot + first UI build + research) |
| `…/f3746b2e-….jsonl` | 5.3 MB | earlier ui-3 |
Search: `rg -i "PATTERN" /home/shaw/.claude/projects/-home-shaw-repos-salesmatch-funnel/*.jsonl`
