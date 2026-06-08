# Full-Funnel Attribution UI — Platform Analysis

**Author:** full-funnel-attribution-ui agent
**For:** Shaw Cole
**Status:** Scoping / pre-build
**Current prototype:** https://sm-funnel.netlify.app/ (repo: `salesmatch-funnel`)

---

## 0. TL;DR

The prototype is **two apps wearing one coat**:

1. A **Pipeline/Funnel dashboard** (`PipelineDashboard`) driven by a single hand-edited `public/funnel-config.json`. It renders a TAM → Intent → Ad Audience → LP Visitors → Retarget → Converted funnel for two pipelines (Sales Hires, CSM Hires), plus spend/impression/CTR highlight cards and a per-pipeline creative gallery. **All numbers are static.** "Live" updating is an admin typing into a box that saves to `localStorage`.

2. A **Map/Audience explorer** (`MapView` + demographic cards) that is genuinely data-driven — it loads compact contact records, aggregates them client-side, and paints a national county/ZCTA choropleth with rich multi-select filtering. This is the strong, real part of the codebase.

The mission — a **live, multi-platform funnel attribution UI** — is essentially: **take the static funnel view and make every node a real, queryable, multi-touch-attributed number sourced from ad-platform APIs + the ArkData pixel, scoped per tenant/partner.** The map explorer becomes the "audience" drill-down at each funnel stage.

This is a **platform build, not a frontend tweak.** The frontend is ~30% of the work; the other 70% is an ingestion/identity/attribution backend that does not exist yet. The current app has **no backend of its own** — `apiClient.ts` exists but is unused; the live app aggregates static JSON in the browser.

T-shirt total: **XL–XXL** (3–6 months to a credible v1 with 2 ad platforms + pixel + last-touch attribution; the data-driven attribution model and full multi-platform coverage are the long tail).

---

## 1. Current-State Audit

### 1.1 Stack as built

| Layer | Tech | Notes |
|---|---|---|
| Framework | React 19 + Vite 7 + TypeScript 5.9 | Modern, fine foundation. |
| Styling | Tailwind v4 (`@tailwindcss/vite`) + custom `glass` utility | Dark glassmorphism theme, consistent. |
| Map | **MapLibre GL** + **PMTiles** (`pmtiles` protocol) | Self-hosted vector tiles in GCS (`storage.googleapis.com/listmagic-tiles`), CARTO dark raster basemap. **No Mapbox token needed** despite `mapbox-gl`/`react-map-gl` still in `package.json` (dead deps). |
| Charts | **Recharts 3** exclusively | BarChart, PopulationPyramid, FamilyDoughnut, HorizontalBar. No custom SVG, no streaming charts. |
| Flow/graph | `@xyflow/react` 12 is installed | **Unused.** Worth noting — it's the natural library for a node-graph funnel/Sankey view. |
| Icons | `lucide-react` | |
| State | React Context + `useReducer` (`FilterContext`) | All filter state; serialized to URL. |
| Data (map) | Static `public/datasets/{sales,csm}_{revenue,headcount}.json`, client-side `aggregateRecords()` | Whole dataset shipped to browser, filtered/aggregated in `clientAggregation.ts`. |
| Data (funnel) | Static `public/funnel-config.json` | Hand-edited. Admin overrides → `localStorage` only. |
| Backend | **None deployed.** `apiClient.ts` (`fetchDashboard`, `exportUrl`) targets a `listmagic-receiver` API that the live build does not call. | The app is 100% static-hosted on Netlify. |

### 1.2 The funnel view (the thing we're evolving)

- **`PipelineDashboard`** fetches `funnel-config.json`, renders:
  - Header (`{client} Pipeline`, "Intent → Ads → Landing Page → Retarget → Convert").
  - **Pipeline filter** chips: `All Pipelines` + one per pipeline.
  - **`HighlightBar`** — 6 KPI cards: Total Spend, Impressions, Clicks, Avg CTR, Avg CPC, Influenced Accounts. Each has a hardcoded `trend` %.
  - **`FunnelChart`** — horizontal tapering bar funnel. Stages = `TAM` (optional) + 5 nodes (`intentCore`, `metaAudience`, `lpVisitors`, `retargetAudience`, `converted`). Computes stage-to-stage conversion %, "% in-market", "% of TAM". Aggregates across pipelines.
  - **`PipelineRow`** (per pipeline, expandable) — TOFU section (IntentCore → MetaAudience → LPVisitors) and BOFU section (Retarget → Converted), node cards with transfer rates, status badges (`refreshDays`, `pending sync`, landing-page), an **asset gallery** (creatives with impressions/clicks/CTR per platform), outreach-channel chips, and a "View audience on map" link.
- **Node semantics today** (`types.ts` `NODE_META`):
  - `intentCore` — "IntentCore 3rd party" (the upstream intent vendor — i.e. DataMoon/RetargetIQ, surfaced to client as "Intent Audience").
  - `metaAudience` — "Meta Custom Audience" (Ad Audience).
  - `lpVisitors` — **"ArkData pixel"** (landing-page visitors captured by the pixel).
  - `retargetAudience` — "Pixel → Meta sync" (pixel-built retargeting audience).
  - `converted` — "Booked / submitted".

**This 5-node spine is already the funnel the mission wants — it's just hardcoded and Meta-only.** The data model literally bakes "Meta" into a node name. Multi-platform means generalizing `metaAudience`/`retargetAudience` into platform-agnostic stages with per-platform breakdowns.

### 1.3 The map view (the strong part)

- `MapView` is a genuinely sophisticated MapLibre integration: county + ZCTA PMTiles layers with a zoom-driven crossfade (counties below z6, ZIPs above z7, manual opacity ramp to dodge MapLibre maxzoom drops), feature-state density coloring, viewport-normalized ZIP density, click-to-zoom on counties, click-to-include/exclude ZIPs, hover tooltips, auto-fit-bounds on filter change. This is production-grade and worth preserving wholesale.
- Demographic cards (`AgeGenderCard`, `IncomeCard`, `CreditRatingCard`, `NetWorthCard`, `FamilyDynamicsCard`, `LanguageCard`, `TopCitiesCard`, `HeadcountCard`, `CompanyRevenueCard`) all read `apiData.aggregations.*` from context and render Recharts. Draggable on desktop (`DraggableCard`), grid + bottom-sheet on mobile.
- `FilterContext` filters and re-aggregates **client-side** on every change, debounced 100ms, with a synthetic 300ms min-loading for UX. Filters serialize to the URL (`urlFilters.ts`) for shareable links.

### 1.4 What's placeholder vs real

| Element | Real? | Notes |
|---|---|---|
| Map choropleth, ZIP/county density | **Real** | Driven by actual contact records. |
| Demographic aggregations | **Real** | Computed from records. |
| Filtering / URL sharing | **Real** | Robust tri-state include/exclude. |
| Funnel node counts | **Static** | From JSON; admin overrides are localStorage. `metaAudience`, `lpVisitors`, `retargetAudience` are `null` ("pending sync") in the shipped config. |
| Highlight KPIs (spend, CTR…) | **Static** | Hand-entered; trends are decorative. |
| Creative asset performance | **Static** | Impressions/clicks/CTR per creative are literals in JSON. |
| Asset thumbnails | **Placeholder** | Gray box + icon; no real creative preview. |
| "Influenced Accounts" | **Static** | No attribution logic behind it. |
| Real-time anything | **None** | No websockets, no polling, no backend. |
| Multi-tenant | **None** | Single hardcoded `client: "Sales Match"`. `?dataset=` and `?admin=true` are the only "modes". |

### 1.5 Cruft to clear (per `REMAINING-WORK.md` + my read)

- Dead deps: `mapbox-gl`, `react-map-gl`, `maplibre-gl` is the real one (Mapbox ones unused), `xlsx` (per remaining-work), `@xyflow/react` (unused but *should be used* for funnel graph).
- `apiClient.ts` is written but unused in the live path — it's the seed of the real backend client, keep it.
- Loose root files: `new_mapview.txt`, `part1/2/3.txt`, `part3_content.txt` — scratch, delete.
- `package.json` name is still `listmagic-geo-dashboard` (forked from the ListMagic geo dashboard — this whole app is a fork). `REMAINING-WORK.md` describes the *ListMagic* migration, not this funnel product — it's stale relative to the funnel mission.

---

## 2. Data-Source Integrations Needed

The funnel has two fundamentally different data classes:

- **Spend/delivery data** (impressions, clicks, spend, CTR, CPC, creative performance) → from **ad platform APIs**.
- **Identity/intent/conversion data** (intent audience, LP visits, retarget audience, conversions) → from the **upstream intent vendor + ArkData pixel + tenant conversion sources**.

Attribution is the join between them.

### 2.1 Ad platform APIs (spend + delivery, per funnel stage TOFU/BOFU)

| Platform | API | Auth | Key data | Freshness / limits | Sizing |
|---|---|---|---|---|---|
| **Meta (Facebook/Instagram) Ads** | **Marketing API** (Graph API `/insights` edge); async `insights` report jobs for large pulls | OAuth 2.0, long-lived system-user token; per-app rate limiting (BUC — Business Use Case). | impressions, clicks, spend, CTR, CPC, reach, frequency, actions/conversions, per ad/adset/campaign + creative (`/adcreatives`), breakdowns by age/gender/region/placement. **Custom Audiences API** for the `metaAudience`/`retargetAudience` nodes (audience size, delivery). | Insights ~near-real-time (minutes lag); async jobs for big date ranges. Rate limits by ad-account tier. Attribution windows configurable (1d/7d click, 1d view). | **L** — richest + already the prototype's primary channel. Build first. |
| **Google Ads** | **Google Ads API v17+** (gRPC/REST), GAQL query language | OAuth 2.0 + developer token (requires Google approval, basic→standard access). | impressions, clicks, cost_micros, conversions, conversion_value, per campaign/ad_group/ad/keyword. Customer Match audiences (analog to Custom Audiences). | Reports near-real-time; conversions lag (import/offline conv up to days). Daily quotas by access tier. | **L** |
| **LinkedIn Ads** | **LinkedIn Marketing API** (`/adAnalytics`, `/dmpEngagements` for matched audiences) | OAuth 2.0 3-legged; partner program approval for some scopes. | impressions, clicks, spend, conversions, demographics (seniority, company size, function — *highly relevant to this B2B ICP*). Matched Audiences for retarget. | Daily-ish reporting granularity; stricter rate limits; demographic data only above thresholds (privacy floors). | **M** — very on-ICP (this is a B2B CXO product). High value despite smaller scale. |
| **TikTok Ads** | **TikTok Business / Marketing API** (`/report/integrated/get`) | OAuth 2.0; app review. | impressions, clicks, spend, conversions, video views, creative-level. Custom Audiences. | Near-real-time reporting; standard rate limits. | **M** — less B2B-relevant; defer unless a tenant runs TikTok. |
| **Programmatic / DSP** | Varies — **DV360** (Display & Video 360 API + Bid Manager/SDF), **The Trade Desk** (REST, partner-gated), Yahoo/Xandr, StackAdapt | Per-DSP OAuth/API keys; TTD requires partner agreement. | impressions, clicks, spend, viewability, conversions; pixel-based retargeting segments. The prototype's "dsp" outreach channel + DSP creative assets map here. | Daily batch typical (SDF/report pulls); some near-real-time. | **L** — fragmented, each DSP is its own integration. Pick the one(s) tenants actually use. |
| **Email / cold outreach** | Tenant's ESP/sequencer — **Klaviyo** (ArkData already has a Klaviyo integration spec), SendGrid, Customer.io, Smartlead/Instantly (cold), HubSpot/Salesforce Marketing | API key / OAuth per vendor. | sends, opens, clicks, replies, bounces; for cold: sequence step performance. The prototype has `cold_email` + `linkedin_inmail` outreach channels. | Webhook (real-time events) or polling. | **M** — high variance per tenant; webhook-driven. |

**Aggregation shortcut:** Funnel.io, Supermetrics, Adverity, Fivetran, and Improvado all sell pre-built connectors to every platform above and normalize spend/delivery into one schema. **Buy-vs-build is a real fork** (see §10 and questionnaire) — building 6 OAuth integrations + maintaining them against API version churn is a multi-month tax; a connector vendor collapses §2.1 to "configure + map fields," at a per-source SaaS cost and with less control over freshness/custom fields.

### 2.2 Intent + identity + conversion (the ArkData-owned half)

| Source | What it feeds | Mechanism |
|---|---|---|
| **Upstream intent vendor** (surfaced to clients as "IntentCore" / "Intent Audience" — never the vendor name) | `intentCore` node — the in-market seed audience per topic/ICP. Already the `intent` filter + topic concept in `FilterContext`. | Vendor file/API delivery → ArkData ingest → tenant-scoped intent audience. Refreshes on `refreshDays` cadence (7d in config). |
| **ArkData pixel** | `lpVisitors` node — the funnel's pivot. Pixel fires on landing-page visit → resolves visitor → maps into audience. This is ArkData's core IP. | JS pixel → event endpoint → identity resolution (HEM/email/device) → `v2_persons`-style person store. (ArkData already has multi-tenant pixel + `v2_persons` dedup per the multi-tenant scoping questionnaire.) |
| **Pixel → Ad-platform sync** | `retargetAudience` node — pixel-resolved visitors pushed back to Meta Custom Audiences / Google Customer Match / LinkedIn Matched Audiences for BOFU retargeting. | Conversions API / Audience API uploads (hashed email/HEM). Bidirectional: pixel builds audience, platform reports its delivery. |
| **Tenant conversion source** | `converted` node — booked calls / form submits / closed deals. | Pixel conversion events, form webhooks, or CRM (HubSpot/Salesforce) sync. "Booked / submitted" today. |
| **ArkData contact/audience records** | The map explorer's demographic + geo data (the existing `datasets/*.json`). | Already exists; becomes the per-stage audience drill-down. |

**The pixel is the keystone** — it's the only first-party signal that ties an anonymous impression/click to a known person and back to a platform audience. Everything attributable downstream of the click depends on it. See §5.

### 2.3 Identity resolution (the hard middle)

Multi-touch attribution requires a **person/account graph** joining: ad-click IDs (fbclid, gclid, li_fat_id, ttclid) → pixel-resolved person (HEM/email) → intent record → CRM contact → company/account. ArkData already runs identity resolution for the pixel (`v2_persons` dedup by HEM/email across pixels). The new work is **stitching ad-platform click identifiers to that person graph** — captured as URL params on the landing page the pixel sits on (the click lands → pixel fires with `?fbclid=…&utm_*` → store click-id ↔ person). This is what makes "which platform/creative drove this conversion" answerable.

---

## 3. Attribution Model Options

| Model | What it does | Fit here |
|---|---|---|
| **Last-touch** | 100% credit to final click before conversion. | **v1 default.** Simplest, matches how Meta/Google report natively, easy to explain to a tenant. Ship this first. |
| **First-touch** | 100% to first interaction. | Useful toggle — shows which TOFU channel *originated* demand. Cheap to add alongside last-touch. |
| **Linear** | Equal credit across all touches. | Easy once the touch timeline exists; good "fairness" baseline. |
| **Time-decay** | More credit to touches nearer conversion. | Strong default for considered B2B purchases (long deliberation). Good "smart default" after last-touch. |
| **Position-based (U/W)** | 40/20/40 first/middle/last. | Common in B2B; offer as a preset. |
| **Data-driven (DDA / Markov / Shapley)** | Algorithmic credit from conversion-path data. | **The long tail.** Needs volume + a path dataset + a model. This is where Northbeam/Rockerbox differentiate. Defer to v2+; requires enough conversions to be non-noise (this funnel's `converted` is currently 0). |

**Recommendation:** Ship **last-touch** as the canonical number, with a **model selector** (last / first / linear / time-decay) that re-weights the *same touch timeline* client-side or via a cheap backend query. Hold DDA until conversion volume justifies it. Critically, **lookback windows are a per-model parameter** (e.g., 7-day click / 1-day view for Meta, 30/90-day for considered B2B) — these must be tenant-configurable and surfaced in the UI, because they materially change every number. The prototype already encodes a refresh cadence (`refreshDays`); attribution windows are the analytic analog.

**Honesty layer (differentiator):** Because ArkData owns a deterministic pixel, the UI can show **pixel-verified conversions** (person actually resolved + converted) *next to* **platform-claimed conversions** (Meta's modeled attribution). The gap between them is exactly the "is my ad spend real?" question Triple Whale/Northbeam built businesses on. Lead with first-party truth.

---

## 4. Real-Time vs Batch

| Data | Cadence | Why |
|---|---|---|
| **Pixel events (LP visits, conversions)** | **Real-time / near-real-time** | First-party, ArkData-owned, webhook/stream native. This is where "live funnel progress" genuinely lands — a visit fires and the `lpVisitors` node ticks up. |
| **Ad spend / impressions / clicks** | **Batch, 15–60 min polling** (Meta insights) to **daily** (Google offline conv, DSP SDF) | Platform APIs are not truly real-time and rate-limit hard. "Live" here is a 15-min refresh, not a stream. Don't over-promise sub-minute spend. |
| **Intent audience** | **Batch on vendor cadence** (7-day refresh today) | Upstream delivery; no value in faster. |
| **Retarget audience sync** | **Batch** (hourly/daily audience uploads) | Platform audience APIs are batch; reflect last sync time. |
| **Attribution recompute** | **Incremental on new conversion** + nightly full reconcile | Touch timelines update when a conversion lands (real-time-ish) but platform-side conversion lag means a nightly reconcile corrects numbers. Show "as of" timestamps everywhere. |

**Architecture implication:** This is **not** a websocket-streaming-charts product end-to-end. It's a **polled/batched data warehouse with a real-time overlay for pixel events.** A websocket/SSE channel for the pixel-driven nodes is justified; the rest is periodic fetch + cache. Recharts is fine; you do **not** need a streaming-chart library. Every number needs a **freshness badge** ("Spend as of 14:05 · Conversions live").

---

## 5. The Pixel's Role in the Funnel

The ArkData pixel is what converts this from "a spend dashboard anyone can build" into "an attribution platform only ArkData can build." Mapping:

```
TAM ──────────────► Intent Audience ───► Ad Audience ───► LP Visitors ───► Retarget ───► Converted
(addressable)       (intent vendor)      (platform        (★PIXEL★)        (pixel→        (pixel conv
                                          custom aud)                        platform)      / CRM)
                         │                     │               │                │              │
   ArkData contact DB ───┘   audience upload ──┘    pixel fires + resolves ─────┘   audience  └─ deterministic
                                                    person (HEM/email) +            sync back     conversion
                                                    captures click-id (fbclid…)     to platforms  attached to person
```

1. **Impression → Click → Visit:** Ad platforms report impression/click counts (batch). The moment the click lands on the tenant landing page, the **pixel fires** — this is `lpVisitors`, the first ArkData-owned, person-level signal. The pixel captures the click identifier (`fbclid`/`gclid`/`utm_*`) in the same event, stitching the anonymous platform click to a resolvable person.
2. **Visit → Intent match:** The resolved person is matched against the intent audience and the ArkData contact DB — enriching them with demographics/firmographics (the exact data the map explorer already visualizes). "Is this LP visitor actually our ICP?" becomes answerable per-visitor.
3. **Visit → Audience (retarget):** Pixel-resolved visitors are pushed back to platform audiences (Meta Custom Audience, Google Customer Match, LinkedIn Matched) for BOFU retargeting — the `retargetAudience` node, already labeled "Pixel → Meta sync" today.
4. **Audience → Conversion:** A conversion (booked call / form submit / CRM deal) is attached deterministically to the resolved person — and through the captured click-id, back to the originating platform/campaign/creative. This is the multi-touch join.

**UI consequence:** Each funnel node should be **clickable to a person-level drill-down** that reuses the map explorer + demographic cards, scoped to that node's audience. The map view isn't a separate tab — it's the **drill-down surface for every funnel stage.** "Click `LP Visitors: 1,240` → see those 1,240 people on the map, by demographic, by which creative they clicked."

---

## 6. Multi-Tenant Data Architecture

ArkData already has a multi-tenant model (see `arkdata-multi-tenant-scoping-v1` and `arkdata-tenant-mapping-v1` questionnaires). The funnel UI must inherit it, not reinvent it.

**Personas (from existing ArkData scoping):**
- **Owner / Viewer** — own tenant only.
- **Partner** — own tenant + all child tenants (agencies running campaigns for tenant clients). Combined view + per-tenant filter.
- **Platform Admin (ArkData)** — all tenants.

**Scoping rules (inherit verbatim):**
- Every funnel query is filtered by visible-tenant set derived from the JWT/session persona.
- A **pixel filter** narrows *within* the visible-tenant set (a tenant may run multiple pixels/landing pages → multiple funnels).
- A **tenant filter** (partner + admin) narrows to one child tenant.
- Tenant scoping is **server-side, never client-trusted** — the current app trusts the URL (`?dataset=`, `?admin=true`), which is fine for a static demo and **unacceptable** for multi-tenant. This is the single biggest architectural gap between prototype and product.

**Data partitioning:**
- Funnel config, node counts, spend, creatives, and the person graph all carry `tenant_id` (+ `pixel_id`, `campaign_id`).
- The map explorer's contact records become **tenant-scoped audiences** rather than four global static files.
- Attribution touch timelines are partitioned by tenant; cross-tenant joins exist only for platform_admin.
- **Ad-account → tenant mapping** is its own config surface: which Meta ad account / Google customer / LinkedIn account belongs to which tenant (the partner agency may have one ad account spanning several tenant clients — needs campaign-level tenant tagging, which is messy and worth a questionnaire item).

**A funnel is keyed by `(tenant_id, pixel_id, campaign_grouping)`** — multiple funnels per tenant (the prototype's two "pipelines" are really two campaign groupings under one tenant). The current `Pipeline` type roughly maps to this; it needs `tenant_id`/`pixel_id`.

---

## 7. UI Components Needed

### 7.1 Evolve (exists, extend)

| Component | Evolution |
|---|---|
| `FunnelChart` | Make data-driven from backend, not JSON. Add per-stage **platform breakdown** (stacked segment or hover: "of 1,240 LP visitors — 720 Meta, 380 Google, 140 LinkedIn"). Add freshness/"as of" badges. Make each stage **clickable → audience drill-down**. |
| `PipelineRow` | Generalize Meta-specific nodes → platform-agnostic with per-platform sub-rows. Real creative thumbnails (pull from platform creative APIs). Real per-creative metrics. |
| `HighlightBar` | Real KPIs from attribution backend; real trends (period-over-period). Add ROAS / CPA / pipeline-influenced-revenue once conversions are real. |
| `MapView` + demographic cards | Become the **per-stage audience drill-down**, scoped to a funnel node's person set. Already production-grade — biggest reuse win. |
| `FilterContext` | Add `tenant`/`pixel`/`campaign`/`platform`/`attributionModel`/`lookbackWindow`/`dateRange` to filter state; back queries with a real tenant-scoped API (the unused `apiClient.ts` is the seed). |

### 7.2 Build new

| Component | Purpose | Size |
|---|---|---|
| **Auth + tenant context** | Session/JWT → persona → visible-tenant set → scoped queries. Tenant/pixel/partner switcher. | **L** |
| **Platform breakdown view** | Per-stage and per-funnel "which platform/campaign/creative drove this" — stacked bars, contribution table. | **M** |
| **Attribution model selector** | Toggle last/first/linear/time-decay + lookback window; re-weights timelines. | **M** |
| **Multi-touch path / Sankey view** | Visualize conversion paths across platforms (this is where unused `@xyflow/react` earns its keep). | **L** |
| **Creative gallery (real)** | Real thumbnails + per-creative funnel contribution, not gray boxes. | **M** |
| **Date-range + comparison** | Time picker, period-over-period, cohort by week. Trends become real. | **M** |
| **Live event feed / pulse** | Real-time pixel events ticking the funnel (SSE/websocket overlay). The literal "live funnel progress." | **M** |
| **Pixel-verified vs platform-claimed panel** | The honesty differentiator (§3). | **M** |
| **Ad-account ↔ tenant mapping admin** | Connect/authorize platform accounts, map to tenants/campaigns. | **L** (OAuth flows) |
| **Connection health / sync status** | Per-source last-sync, errors, rate-limit state. Operational necessity for any integration product. | **M** |

### 7.3 Backend (does not exist — the bulk of the work)

- Ingestion workers per ad platform (OAuth, polling, normalization) **or** a connector vendor.
- Pixel event pipeline + identity resolution (partly exists in ArkData).
- Click-id ↔ person stitching.
- Attribution engine (touch timeline store + model evaluation).
- Tenant-scoped query API (the `/api/geo/dashboard`-style endpoints, generalized to funnel + attribution + tenant auth).
- Warehouse (see §8).

---

## 8. Tech Stack Assessment

**Keep:** React 19 + Vite + TypeScript + Tailwind + MapLibre/PMTiles + Recharts. The frontend foundation is correct and the map work is genuinely good. **Add** `@xyflow/react` usage for the node-graph/Sankey funnel (already installed). **Drop** Mapbox deps, `xlsx`, scratch `.txt` files.

**The real stack questions are backend, which is greenfield:**

| Need | Recommendation |
|---|---|
| **Warehouse** | Columnar store for spend × touch × conversion at scale: **BigQuery** (ArkData is already on GCS — natural fit) or ClickHouse (if sub-second interactive aggregations over billions of rows matter — ClickHouse is the Triple Whale/HockeyStack-class choice). Postgres only survives early/small. |
| **Ingestion** | Buy (Funnel.io / Fivetran / Airbyte / Supermetrics) vs build (workers + queue). Strongly lean **buy for spend connectors**, **build for pixel/identity/attribution** (the IP). |
| **Real-time** | **SSE or websockets** for the pixel-event overlay only. Not for spend. A pub/sub (Pub/Sub, given GCP) → SSE bridge. |
| **API** | Tenant-scoped GraphQL or REST over the warehouse. Server-side auth/scoping is mandatory (§6). |
| **Identity/attribution** | Reuse ArkData's pixel + `v2_persons` resolution; add click-id stitching + a touch-timeline + model-eval layer. |

**Verdict:** Frontend is the right foundation; **do not rebuild it.** The "different approach" the mission asks about is **not** the frontend framework — it's that a **data warehouse + ingestion + attribution backend** has to be built underneath it, and a thin real-time overlay added. Streaming charts: not needed. Websockets: yes, narrowly, for pixel events.

---

## 9. Comparable Products

| Product | What it is | Lesson for us |
|---|---|---|
| **Triple Whale** | Ecommerce (Shopify) attribution + pixel. Their "Triple Pixel" is first-party, server-side. | **Closest analog to ArkData's edge.** Own-pixel attribution as the trust anchor, contrasted with platform-claimed numbers. Lead with first-party truth. They won on "your Meta numbers are inflated, here's reality." |
| **Northbeam** | Multi-touch + media-mix modeling for DTC. Data-driven attribution, ML credit assignment. | The DDA long tail (§3). Don't start here; it's the v2+ moat once volume exists. |
| **Rockerbox** | MTA + marketing measurement, strong on cross-channel paths + spend ingestion. | Path/journey visualization + connector breadth. Their conversion-path view is the Sankey we'd build with xyflow. |
| **HockeyStack** | B2B (!) attribution + revenue analytics, journey-level, CRM-integrated. | **Most ICP-aligned** — B2B, account-level, CRM-joined, "pipeline influenced" as the headline metric (not ROAS). Our CXO/agency ICP wants *influenced pipeline/accounts*, which the prototype already gestures at ("Influenced Accounts"). |
| **Funnel.io** | Data-collection/normalization layer (1000+ connectors) feeding BI. Not attribution per se. | The **buy** option for §2.1 spend ingestion. Could be our ingestion backend rather than a competitor. |
| **Supermetrics / Improvado / Adverity** | Marketing data pipes into warehouses/BI. | Same buy-vs-build lesson. |
| **Dreamdata / Factors.ai** | B2B revenue/intent attribution, intent-data-native. | Intent-signal → pipeline attribution, exactly our intent-audience → conversion story. Closest on the *intent* axis. |

**Positioning takeaway:** We are **HockeyStack/Dreamdata's B2B account-level attribution + Triple Whale's first-party-pixel trust + an intent-data front-end**, delivered white-label to tenants/agencies. The differentiator is owning *both* the intent seed *and* the resolving pixel — competitors own one or neither. The UI should make that loop (intent → ad → pixel-verified visit → retarget → pixel-verified conversion) the hero narrative.

---

## 10. Estimated Complexity (T-shirt)

| Workstream | Size | Notes |
|---|---|---|
| Frontend: data-drive the funnel from a backend API | **M** | Components mostly exist; wire to real queries. |
| Frontend: platform breakdown + attribution selector + date range | **M** | New but bounded. |
| Frontend: Sankey/path view (xyflow) | **M–L** | New interaction model. |
| Frontend: live pixel feed (SSE overlay) | **M** | Narrow real-time slice. |
| Frontend: tenant/pixel/partner switcher + auth wiring | **M** | UI is easy; depends on backend auth. |
| Reuse map explorer as drill-down | **S** | Already built — rescope. |
| Backend: tenant-scoped query API + auth/scoping | **L** | Mandatory, greenfield, security-critical. |
| Backend: warehouse + schema (spend × touch × conversion) | **L** | Foundational. |
| Backend: ad-platform ingestion (per platform) | **L each** (or **M** total if buying a connector vendor) | The buy-vs-build fork. 6 platforms = 6× if building. |
| Backend: click-id ↔ person stitching | **M** | Builds on existing pixel/identity. |
| Backend: attribution engine (timelines + models) | **L** | Last-touch is M; data-driven is XL (defer). |
| Backend: retarget audience sync-back | **M** per platform | Conversions/Audience API uploads. |
| Ops: connection health, freshness, reconcile jobs | **M** | Unsexy, required. |

**Phasing recommendation:**
- **Phase 1 (XL, ~6–10 wks):** Tenant-scoped backend + auth, warehouse, **Meta** ingestion, pixel events live, **last-touch** attribution, data-driven funnel + highlights, map drill-down rescoped. → A real single-platform live funnel for one tenant.
- **Phase 2 (L, ~4–8 wks):** Add **Google** + **LinkedIn**, attribution-model selector + lookback windows, date-range/comparison, platform breakdown, creative gallery, partner/multi-tenant switcher, pixel-verified-vs-claimed panel.
- **Phase 3 (L+, ongoing):** Sankey path view, additional platforms (TikTok/DSP/email), data-driven attribution, audience sync-back automation, alerting.

**Total credible v1 (Phase 1+2): ~3–4.5 months** with backend as the critical path. The frontend is not the bottleneck — the attribution backend is.

---

## 11. Top Risks / Open Decisions (→ questionnaire)

1. **Buy vs build ad-platform ingestion** — collapses or explodes §2.1 and the timeline.
2. **Which platforms first, and do we have API access today** (Meta system token? Google dev token approved? LinkedIn partner status?).
3. **Attribution model + lookback windows** as v1 defaults — changes every number on screen.
4. **Tenant/partner/pixel scoping** — inherit ArkData's model exactly, or does the funnel need its own grouping (campaign-level tenant tagging when a partner ad account spans clients)?
5. **What is "live"** — sub-minute pixel events vs 15-min spend; manage the promise.
6. **Conversion source of truth** — pixel events vs CRM vs form webhook (the `converted` node is 0 today; what fills it?).
7. **First-party-truth positioning** — do we surface the pixel-verified-vs-platform-claimed gap (strong differentiator, but it tells tenants their ad numbers are inflated)?
8. **Monetization** — who pays (tenant vs partner/agency), per-seat vs per-spend vs per-resolution; this shapes which metrics are hero and whether usage metering is needed (ArkData already meters resolution — `arkdata-resolution-metering-v1`).
9. **Warehouse choice** — BigQuery (GCP-native) vs ClickHouse (interactive scale).
10. **Hosting/compute/cost ceiling** for ingestion workers + warehouse + real-time channel.

See `full-funnel-attribution-ui-v1.html` for the structured questionnaire.
</content>
</invoke>
