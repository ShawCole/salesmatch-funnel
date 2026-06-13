# ArkData AI-Powered Insights — Feature Handbook

**Status:** Research + spec, ready to hand to the next build agent ("fable")
**Author:** full-funnel-attribution-ui-2 (research synthesis)
**Date:** 2026-06-13
**Scope:** The AI-powered insights feature for **app.arkdata.io** — an intelligence layer that
turns the data ArkData collects (identity/pixel + intent + audiences + CRM outcomes, and — once
built — clients' **Meta Ads** and **Google Analytics** accounts) into clear, actionable insights for
ArkData, SuperPartners, partners/agencies, and tenants.

> **How to use this doc:** This is the "everything we need this feature to accomplish" handbook for a
> ground-up rebuild. It is intentionally comprehensive: §3 (data dependency) and §8 (architecture) are
> load-bearing — read them before scoping. §13 lists the decisions that still need Shaw.

---

## 1. Executive summary — the vision in one paragraph

ArkData already resolves anonymous website visitors into real people with deep demographic, firmographic,
financial, and intent profiles; lets agencies build and deploy intent audiences to ad platforms; and
pushes resolved people into CRMs. **The AI Insights feature is the layer that reads across all of that
data — plus the client's connected Meta Ads and Google Analytics — and tells each user, in plain
language, what is happening, why, and what to do next.** It is part conversational analyst ("ask anything
about my data"), part proactive watchdog (anomalies + opportunities surfaced before you look), and part
recommendation engine (specific, one-click actions: build this audience, shift this budget, fix this
pixel, pitch this service). It must feel native to app.arkdata.io — dark, premium, fast, per-tenant
branded — and it must be trustworthy: it never fabricates, it cites its data, and it never leaks PII.

---

## 2. Where this fits in app.arkdata.io (platform context)

ArkData (arkdata.io — always a **K**) is a white-label, multi-tenant **intent-data + visitor-identity**
platform. The end-to-end product flow the insights feature sits on top of:

```
intent topics + demo/firmo filters
        ↓ (deterministic resolver, NO AI)
build audience → free preview (count + maps + 13-chart insights) → pay → delivery
        ↓
deploy to ad platforms (Meta / Google) ── "destinations service" (in progress)
        ↓
ArkData identity PIXEL fires on the client's site → resolves visitors to people (DataMoon)
        ↓
full-funnel attribution (pixel → site visit → audience match → ad sync → conversion)  ← PLANNED (Phase 5)
        ↓
CRM push (HubSpot / Klaviyo / GoHighLevel) of ICP-qualified people
```

**The shipped app today** (React 18 + Vite SPA, `/home/shaw/repos/arkdata/apps/web`) already has:
Visitors + Companies (the core identity surfaces), Audiences, Segments, Funnels, ICP Rules, Automations,
Integrations, Pixel install, Dashboards/DashboardBuilder, Analytics + AdvancedAnalytics, Reports, Billing,
and a large Admin console. So the insights feature is a **new surface inside a mature app**, not a new app.

**There is already one AI feature in flight — the AI Proposal Builder** (Gemini 2.5 Flash on Vertex AI).
The Insights feature should be its sibling, reusing the same model stack, safety posture, and UX idioms
(Ask/Build, streaming "thinking", conversation, strict PII isolation). See §8.

---

## 3. 🚨 CRITICAL DEPENDENCY — the data this feature runs on

**This is the most important section. Read it before promising a timeline.**

### 3a. What exists today (rich, real, in PostgreSQL `public` schema)
The current data asset is the **DataMoon identity/enrichment layer + pixel visitor stream**:
- **Per-resolved-person identity:** name, address/geo, age/gender, emails/phones (hashed + validated),
  marital/household, **firmographics** (title, seniority, department, company, domain, LinkedIn), **financial**
  (income, net worth, credit band, investor flags), **real-estate** (ownership, home value, mortgage),
  **vehicle** (VIN-level), **behavioral/intent** (IAB browsing categories + per-person `intent_score`),
  and **visit history** (`v2_events`: url paths, referral, UTMs, visit timestamps).
  Tables: `v2_persons`, `v2_persons_dm_enrichment`, `v2_emails/phones/events`, `v2_person_vehicles/
  devices/behaviors`, `persons`, `companies`. (`infra/.../2026-05-22-datamoon-enrichment-schema.sql`)
- **Audiences:** `audiences` (JSONB filter spec, record counts, blob paths), intent taxonomy (`iab_taxonomy`).
- **ICP:** `icp_rules` / `icp_field_registry` (per-tenant qualification logic).
- **CRM outcomes:** `hubspot_sync_log`, `klaviyo_webhook_events`, `ghl_*` (outbound push results).
- **Tenancy:** `tenants`, `pixels` (organized meta-partner→partner→tenant), `users`.

### 3b. What does NOT exist — and is the FEATURE'S PREMISE
The brief is "AI insights based on data from clients' **Meta accounts and Google Analytics** via API."
**Neither integration exists in the codebase — no API client, no OAuth, no schema, no data.** (Verified by
grep across `apps/web`, `infra/functions`, `infra/workers`, `services`.) The only "meta" in the repo is the
`meta_partner` *pricing-tier role string* — unrelated to Meta/Facebook Ads.

**Implication: the AI Insights feature is really TWO layers, and the bottom one is greenfield:**
1. **Ingestion layer (net-new build):** Meta Marketing API + GA4 Data API connectors — OAuth (or Meta
   system-user token), a normalized schema for ad accounts/campaigns/adsets/ads/creatives + spend/
   impressions/clicks/conversions/ROAS, and GA4 sessions/channels/events/funnels; scheduled sync into
   Postgres. **Without this, the AI has nothing to say about ad performance.**
2. **Insights layer (this feature):** the AI reasoning + UI over that data joined to the identity/intent/
   audience/CRM data we already have.

The single most valuable thing ArkData can do that competitors cannot is **join its first-party,
person-level pixel truth to the client's Meta/GA platform-reported numbers** — i.e. reconcile
platform-claimed vs pixel-verified, attribute deterministically, and surface the in-market ICP a client is
*not yet reaching*. That cross-source join is the feature's moat, and it requires layer 1 to exist.

> See the companion prototype in `salesmatch-funnel` (sm-funnel.netlify.app) — the People/Marketing
> funnels, the **reconciliation explainer** (platform-claimed → pixel-verified), and **attribution
> models** are working mock prototypes of exactly the attribution layer the AI would narrate.

---

## 4. Personas & jobs-to-be-done (who the insights serve)

The insight content, default questions, and recommended actions must **adapt to the viewer's tier** (the
app already has this role hierarchy: platform_admin → meta_partner/SuperPartner → partner → tenant_admin/
owner → analyst/operator/read_only).

| Persona | What they do | What AI insights must give them |
|---|---|---|
| **ArkData (platform admin)** | Runs the platform; merchant of record | Network-wide health, churn/expansion signals, which tenants/partners are thriving vs at-risk, COGS/margin anomalies (internal-only) |
| **SuperPartner** (master distributor) | Resells to partners; pixel pricing power | Portfolio roll-up across their partners/tenants; where to push volume; underperforming accounts to intervene on |
| **Partner / agency** (the terminal data buyer) | Buys audiences as COGS, sells a **managed campaign service** to tenants | Per-client campaign performance, what's working/failing and **why**, what to do next, what to **pitch** (upsell), how to prove ROI to the client. *This is the primary buyer of the insight value.* |
| **Tenant / white-label brand** | Pays the partner for results | Plain-language "is my marketing working?" — results, not data; the reassurance/score + the few things to act on |
| **End client / direct self-use** | Advertiser audience / raw-data buyer | (Mostly indirect; direct clients get the tenant view) |

**Positioning constraint (drives tone):** ArkData is **marketing-enablement, not sales-enablement**. Reach
(row count) is the value; intent is a *filter*, never a price multiplier. Insights should optimize for
campaign/audience performance and reach efficiency, not "hot lead" sales framing.

Named real tenants/partners for realistic seed/demo: **AI or Die**, **Strategy|Simple**, **ListMagic.ai**
(ArkData's own first-party agency), Runday.ai, Cleverly.io, AccuPoint, Blueprint Income, BizyPro.

---

## 5. Feature analysis — what the AI Insights feature must accomplish

Organized as capability tiers. Each capability notes whether it leans on existing data (✅) or the net-new
Meta/GA ingestion (🚧). The through-line mandate from Shaw: **"empower users to make actionable business
decisions."** Every insight must end in a *what-to-do*, ideally one-click.

### 5.1 Conversational AI analyst — "ask anything about my data"
- Natural-language Q&A over the user's scoped data: "Which audiences drove the most pixel-verified
  conversions last month?" "Why did my Meta CPL spike?" "Who are the in-market ICP companies I'm not
  reaching yet?" ✅/🚧
- Returns answers as **narrative + the supporting visualization + a cited data source**, not just text.
- Follow-up/conversation memory; scoped strictly to the viewer's tenant + role (see §8 isolation).
- Two modes mirroring the Proposal Builder: **Ask** (advises, read-only) and **Act** (proposes/executes a
  concrete action — build audience, create segment, adjust a destination — behind a confirm step).

### 5.2 Proactive insight feed — surfaced before you look
- An always-on "what changed and what matters" feed per workspace: anomalies, opportunities, risks.
- **Anomaly detection** with plain-language cause hypotheses: conversion rate dropped 30%, CPL up 2×,
  pixel match-rate fell, an audience's reach decayed, budget pacing too fast/slow. ✅/🚧
- **Opportunity detection** — the signature ArkData play: **"in-market ICP you're NOT reaching"** gap
  reports (the designed audience-upsell engine), creative fatigue, a high-performing audience worth
  scaling, a segment worth a new campaign. ✅/🚧
- Each item carries **severity + a recommended action + a one-click CTA** ("build an audience of these",
  "shift budget", "fix pixel", "pitch this service"). Alerts route to in-app + (opt-in) email/Slack.

### 5.3 Narrative summaries / auto-reporting
- Auto-written plain-language summaries at the top of every analytics surface and in scheduled reports:
  "This week: 12,304 visitors resolved (+8%), 2 audiences underperforming, Meta over-claimed 38% of
  conversions the pixel couldn't verify; recommended: …" ✅/🚧
- Powers **white-label client reports** (PDF/email) the agency sends the tenant — the AI writes the story,
  the agency's brand wraps it. (Ties to the existing Reports surface + proposal-builder branding model.)

### 5.4 Recommendations with actions (the decision layer)
- Specific, ranked recommendations tied to the user's goals (more conversions, lower CPL, more reach,
  higher match rate, more pipeline). Each = *claim → evidence → recommended action → one-click execute*.
- The ArkData-specific recommendation set: build/expand an audience; reconcile/trust which platform's
  numbers; reallocate budget by **pixel-verified** performance; improve pixel match mode; push a segment
  to a CRM; **what to pitch** a prospect (service recommendation — already probed by the proposal eval).

### 5.5 Forecasting & pacing (later tier)
- Trend forecasts: projected conversions/spend before budget exhaustion, audience decay, pipeline velocity,
  resolution volume vs plan caps (ties to billing/usage). 🚧

### 5.6 The cross-source signature insights (the moat — needs §3b ingestion)
These are the insights *only ArkData can produce* because it holds the person-level pixel truth:
- **Pixel-verified vs platform-claimed** reconciliation per platform (Meta/Google over-claim %, view-through
  it never saw, cross-platform overlap only the pixel resolves) — narrated by the AI. *(Prototyped in
  salesmatch-funnel.)*
- **Deterministic full-funnel attribution** (impression → click → site-visit(pixel) → audience match →
  conversion → CRM/closed) with attribution-model choice — narrated and explained.
- **In-market ICP gap** — "X companies/people matching your ICP are in-market right now that your campaigns
  aren't reaching" → one-click build.
- **Audience → outcome loop** — which delivered audiences actually produced resolved visitors and
  conversions (closing the loop the audience builder can't see today).

### 5.7 Anti-features / explicit non-goals
- **No AI in the audience *build* path** — the resolver stays deterministic (codes-not-labels). AI advises
  and narrates; it does not silently change what data gets pulled.
- **No fabricated numbers, ever.** If the data can't answer, say so or omit — never invent. (Org-wide rule.)
- **No "DataMoon"** (or any vendor name) surfaced to tenants, in UI or network. AudienceLab is the only
  provider brand ever shown.
- No raw PII in any AI prompt/response that the viewer isn't already entitled to see (see §9).

---

## 6. Data inputs the AI can reason over (the context surface)

| Source | Status | What it gives the AI |
|---|---|---|
| Pixel / identity (`v2_persons*`, `v2_events`) | ✅ live | Who visited, resolved profiles, on-site behavior, UTMs, intent score |
| Intent / behaviors (`iab_taxonomy`, `v2_person_behaviors`) | ✅ live | Topic-level intent per person/audience |
| Audiences (`audiences`) | ✅ live | Built audiences, specs, counts, delivery status |
| ICP rules (`icp_rules`) | ✅ live | What "qualified" means per tenant |
| CRM outcomes (`hubspot/klaviyo/ghl` logs) | ✅ live | Push results, suppression/consent |
| Billing / usage | ✅ live | Plan, caps, pacing |
| **Meta Ads** (campaigns/spend/impr/clicks/conv/ROAS/creatives) | 🚧 **build first** | Ad performance, the "platform-claimed" side of reconciliation |
| **Google Analytics (GA4)** (sessions/channels/events/funnels) | 🚧 **build first** | Traffic + on-platform funnel, a 3rd reconciliation source |

**Retrieval pattern:** the AI should reason over *pre-computed, aggregated, tenant-scoped metrics and
structured summaries* (not raw row dumps). Build a small "insights data service" that produces typed,
bounded context objects (KPIs, trends, anomalies, audience stats, reconciliation deltas) and feed those to
the model — this bounds tokens, enforces isolation, and prevents PII leakage (see §8/§9).

---

## 7. UI/UX analysis

### 7.1 Match the *shipped* look & feel (not the marketing brand)
**Important:** the gold (`#C5A54E`) + Inter/Plus Jakarta are the **marketing** brand; the **shipped app** is a
dark, "Bold Dramatic" Tailwind-slate system with a **per-tenant runtime accent** (default `#7c3aed`),
shadcn/ui components, system fonts. To match the app, **build on the app's existing primitives**, and let the
accent come from the tenant's `accent_color`/`primary_color` CSS vars (ArkData's own workspace can carry the
gold). Concretely reuse:
- **Components:** shadcn/ui (`src/components/ui/*`), `MetricCard` (KPI tile — `text-xs uppercase` label,
  `text-2xl font-bold` value, emerald/red delta), cards = `rounded-xl border bg-white dark:bg-slate-900`.
- **Charts:** Recharts (Area/Bar/Pie) + the existing custom `components/charts/` set —
  **`FunnelChart`, `SankeyChart`, `HeatmapChart`, `KPICard`, `ChartBase`** — and the `--chart-1..8` token
  series. (Sankey already exists → use it for multi-touch paths.)
- **Layout:** the 240/68px collapsible left **sidebar** + `Layout.jsx`; route via `pages.config.js`.
- **Theming:** `BrandingContext` CSS vars (`--brand-accent`/`--brand-primary`), inline `style={{color: accent}}`
  for active states. Per-tenant logo/colors/domain already resolve via SSR boot + cache + fetch.
- **Stack:** React 18, TanStack Query v5, react-hook-form + Zod, framer-motion, lucide-react.

### 7.2 Where Insights lives in the IA
- **A dedicated "Insights" (or "Intelligence") nav item** under the Navigation section — the home for the
  conversational assistant + the proactive feed + saved insights.
- **Embedded insight cards everywhere** — a reusable `<InsightCard>` that drops into the top of Home,
  Analytics, Audiences, Visitors, Funnels: a one-line AI narrative + a metric/chart + a CTA. The feature is
  both a *destination* (the Insights page) and a *pervasive layer* (cards on existing pages).
- **A persistent "Ask AI" affordance** (command-bar / floating button) callable from any page, pre-scoped to
  the page's context ("ask about these visitors / this audience / this funnel").

### 7.3 Interaction models
1. **Conversational panel** — Ask/Act modes, streaming **"thinking" dropdown** (reuse the proposal builder's
   streaming-thinking + conversation patterns), answers rendered as narrative + inline chart + **source
   citation chip** ("based on 14d pixel + Meta data"). Suggested/starter questions per persona.
2. **Proactive feed** — a scannable list of insight cards (severity-colored: emerald good / amber watch /
   rose risk), each expandable to evidence + a one-click action. Filter by type (anomaly/opportunity/risk),
   dismiss/snooze, "why am I seeing this?".
3. **Narrative headers** — every analytics surface gets an AI summary line ("never a naked number").
4. **Drill-down** — every insight links to the underlying surface (the existing Visitors/Audiences/Funnels
   pages) with filters pre-applied; insights are an entry point, not a dead end.

### 7.4 Visualization discipline (from market research + the app's kit)
- KPI = scorecard tile (one number + one comparison vs prior period + one micro-viz; **never a naked
  number**). Trend = line/area. Comparison = bar. Multi-step flow = **funnel**. Multi-touch path = **sankey**.
  Matrix = heatmap (red below / green above goal). Detail = table (top-N, sticky header, right-aligned nums).
  Geo = map (react-leaflet already in the app). Always recolor charts to the tenant accent + semantic palette.

### 7.5 Quality bar
- **Snappy** — optimistic UI, TanStack Query cache, skeleton **loading** states, **empty** states (illustration
  + one sentence + CTA), and **error** states (component-level retry). Stream long AI responses.
- **Mobile** — the app has `MobileNav`/`MobileDashboard`; insight cards + the assistant must work on phones
  (stacked, essential KPIs first), matching the responsive discipline already proven in salesmatch-funnel.
- **Trust UI** — every AI claim shows its data source + freshness ("as of"), and a way to see the underlying
  numbers. Confidence/uncertainty is shown honestly; unsupported asks get "I don't have that data yet,"
  never a guess.

### 7.6 Reference patterns from the market (prior research — `salesmatch-funnel/docs/ui-patterns-research.md`)
Common across Triple Whale, Northbeam, HockeyStack, Everflow, AgencyAnalytics: top KPI scorecard strip,
summary→detail drill-down with **persistent filters + comparison period**, chart-by-metric discipline,
freshness + **actionable** alerts, dark/light theming, progressive disclosure over density. The AI frontier
specifically: **conversational assistant over your data, anomaly detection, forecasting, narrative
summaries, recommendations-with-actions** — and notably **Northbeam has no AI at all**, so a genuinely good
AI layer is a real wedge.

---

## 8. Technical architecture (inherit the AI Proposal Builder precedent)

The app already has a working AI pattern to copy — do not reinvent it:
- **Model:** `gemini-2.5-flash`, `location: 'global'`, on **Vertex AI**, GCP project `arkdata-hub`.
- **Surface:** a standalone **gen2 Cloud Function** (the proposal builder uses `aiEdit`); add an analogous
  `aiInsights` / `aiAsk` callable. Region us-east1 conventions per `arkdata/CLAUDE.md`.
- **Tooling:** **function-calling tools** for structured actions (run a metric query, build an audience,
  create a segment, draft a report) with a confirm step for any write; an undo/confirm safety net for "Act".
- **Retrieval:** an **insights data service** that returns typed, tenant-scoped, **aggregated** context
  (KPIs, trends, anomalies, audience stats, reconciliation deltas) — the model reasons over summaries, not
  raw rows. Cache aggregates; recompute on a cadence (hourly+); pre-compute anomalies in a worker.
- **Two new ingestion connectors (the §3b dependency):** Meta Marketing API (system-user token per the
  destinations-service model, *not* per-user OAuth where possible) and GA4 Data API (OAuth) → normalized
  Postgres tables → scheduled sync workers (mirror the existing klaviyo/hubspot worker pattern on
  `arkdata-workers-vm`, with the heartbeat/self-healing supervisor already in place).
- **Anomaly/forecast compute:** start rules + simple statistical baselines (z-score / WoW deltas) in a
  worker; layer ML later. The model *explains* anomalies; it doesn't have to *detect* them statistically.
- **Data store:** PostgreSQL `public` schema only (never Firestore for data; Firebase = auth only).

### Safety / isolation (non-negotiable — copy the proposal builder's posture)
- The AI function receives **only data the viewer is already entitled to**, **tenant-scoped by the token's
  tenant claim**, and **aggregated/de-identified** wherever possible — never raw PII rows in a prompt unless
  the user already has row-level access to them in the UI.
- **Vertex prompt logging OFF.** No training on customer data.
- Partner/sub-partner **shadow-view** scoping must carry into the AI context (a partner viewing a tenant
  gets that tenant's scope, nothing broader).
- Prompt-injection, CSS-injection, "delete everything", and PII-leak tests must pass — reuse/extend the
  existing **AI eval suite** (`audience-builder-mockup/ai-eval/`) with insights-specific cases.

---

## 9. Trust, safety & guardrails (expanded)

1. **No fabrication.** Every number is real or labeled/omitted. The AI must say "I don't have Meta data
   connected yet" rather than estimate. (Shaw is emphatic; org-wide.)
2. **Cite + timestamp** every claim (source + "as of").
3. **PII isolation** per §8 — the biggest risk in an AI-over-customer-data feature.
4. **Tenant/role isolation** — strict; verified by eval.
5. **Vendor-name suppression** — never "DataMoon"/"RetargetIQ" in any output.
6. **Internal-only data** (margins, COGS, DataMoon rates) never surfaced to tenants/partners — the AI must
   refuse and must not have it in tenant-scoped context.
7. **Human-in-the-loop for actions** — "Act" proposes; the user confirms; everything is undoable/logged.
8. **Honest uncertainty** — show confidence; degrade gracefully when data is thin.

---

## 10. Goals & success criteria (what "done well" means)

**Product goals**
- G1 — **Make every user's next action obvious.** The primary metric of success is *actions taken from
  insights* (audiences built, budgets shifted, segments pushed, proposals sent) — not time-in-app.
- G2 — **One unified intelligence layer** across identity + intent + audiences + CRM + Meta + GA, so users
  stop stitching dashboards together.
- G3 — **The reconciliation moat** — be the one place that tells the truth about platform-claimed vs
  pixel-verified performance and the in-market ICP gap.
- G4 — **Native, premium, fast, white-label** — indistinguishable from the rest of app.arkdata.io, branded
  per tenant, snappy on desktop and mobile.
- G5 — **Trustworthy** — zero fabrication, zero PII leaks, full citations; users believe the numbers.
- G6 — **Tier-aware** — the right insight for ArkData vs SuperPartner vs agency vs tenant.
- G7 — **An MRR lever** — drives the audience-subscription upsell (the in-market ICP gap → one-click build)
  and is itself a packageable plan capability (§12).

**Experience goals (Shaw's words):** intuitive, snappy, insightful; helpful visualizations of data,
campaigns, and tools; empowers actionable business decisions.

**Concrete success criteria (for the build agent to design toward)**
- A user can ask a plain-language question about their data and get a correct, cited answer with a chart in
  < ~5s perceived (streamed).
- The proactive feed surfaces ≥1 genuinely useful, correct, actionable item per active workspace per week.
- Every insight has a working one-click action or drill-down.
- 100% of eval safety cases pass (PII, injection, isolation, no-fabrication).
- Renders correctly under any tenant's branding and on mobile.

---

## 11. Phasing / roadmap (suggested)

- **Phase 0 — Foundations:** the insights data service (typed, tenant-scoped aggregates over *existing*
  data) + the `aiAsk` gen2 function + eval harness extension. Ships value over identity/intent/audience/CRM
  data alone (no Meta/GA yet): "ask about your visitors/audiences," narrative headers, basic anomalies.
- **Phase 1 — Meta ingestion** (the §3b unlock for ad insights): Meta Marketing API connector + schema +
  sync worker → ad-performance Q&A, CPL/ROAS anomalies, **pixel-verified vs Meta-claimed reconciliation**.
- **Phase 2 — GA ingestion:** GA4 connector → traffic/channel insights, third reconciliation source.
- **Phase 3 — Proactive feed + recommendations-with-actions** (in-market ICP gap, scale/cut, what-to-pitch)
  + alerts (email/Slack) + scheduled white-label AI reports.
- **Phase 4 — Forecasting + pacing + deeper full-funnel attribution narration** (pairs with the platform's
  Phase-5 attribution build).
- **Phase 5 — "Act" mode** maturity (one-click executes), workflow/automation tie-in.

*(Phase 0 deliberately ships before the Meta/GA dependency so the feature isn't blocked — but ad-performance
insights, the headline, need Phases 1–2.)*

---

## 12. Packaging, gating & white-label

- **Gate as a subscription/plan capability**, configured **per-tenant** like everything else (the platform
  already has mandatory per-tenant display config at onboarding: price show/hide, enabled tracks,
  subscription-only mode, caps). AI Insights becomes one of those toggles + a plan tier.
- **Tier-differentiated depth:** tenants get results-level narrative; agencies/partners get the full
  analyst + recommendations + client-report generation; SuperPartners/ArkData get portfolio roll-ups.
- **White-label end-to-end:** AI-written client reports carry the agency's brand; the assistant and cards
  inherit the tenant accent; no ArkData/vendor names leak.
- **MRR flywheel:** the in-market ICP gap insight is the built-in upsell to the audience subscription
  (one-click "build an audience of these") — design the CTA to route into the existing deploy-moment
  upgrade modal.

---

## 13. Open decisions for Shaw / fable (resolve before/early in build)

1. **Meta/GA ingestion ownership & timeline** — this is net-new and gates the headline value. Build it as
   part of this feature, or as a prerequisite owned by the integrations/destinations track? Meta auth:
   system-user token (preferred, matches destinations service) vs per-client OAuth? GA4: per-client OAuth.
2. **Scope of "Act" in v1** — read-only analyst first, or include one-click actions (build audience / push
   segment) from day one?
3. **Where AI Insights lives** — a dedicated nav surface, embedded cards, or both (recommended: both) — and
   the exact nav label ("Insights" vs "Intelligence" vs "Copilot").
4. **Model choice** — stick with Gemini 2.5 Flash on Vertex (matches proposal builder + GCP-native + data
   residency) — confirm, vs evaluating Claude/other for the analyst reasoning.
5. **Tenant default-on vs opt-in**, and which plan tier unlocks it.
6. **Terminology** — "SuperPartner" (not "meta-partner"); confirm customer-facing labels for the tiers.
7. **How much the AI may *write*** (segments, audiences, automations) vs only advise, given the
   "no-AI-in-the-build-path" rule (AI proposing a deterministic build spec for human confirm is likely OK).

---

## 14. Sources mined (for fable to go deeper)

**ArkData app (design system / IA / components):** `/home/shaw/repos/arkdata/apps/web/` —
`tailwind.config.js`, `src/index.css`, `src/globals.css`, `src/App.jsx`, `src/pages.config.js`,
`src/lib/BrandingContext.jsx`, `src/components/layout/Sidebar.jsx`,
`src/components/shared/MetricCard.jsx`, `src/components/charts/` (Funnel/Sankey/Heatmap/KPICard/ChartBase),
`src/pages/{Home,Analytics,AdvancedAnalytics,Dashboards,DashboardBuilder}.jsx`, `arkdata/CLAUDE.md`.

**Data model / schema:** `infra/postgresql/migrations/001_initial.sql`, `002_normalized_schema.sql`;
`infra/functions/migrations/2026-05-22-datamoon-enrichment-schema.sql`, `2026-05-25-audiences.sql`,
`2026-05-22-iab-taxonomy.sql`; `infra/sql/2026-04-26-icp-rules.sql`;
`infra/workers/{hubspot_sync,klaviyo_sync,ghl_push}/`; `datamoon-integration/docs/02-v2-enrichment-api.md`,
`AGENT_AUDIENCE_PULL_GUIDE.md`. **(Confirmed: no Meta/GA code anywhere.)**

**Flow / personas / pricing / existing AI:** agent prompts
`~/scripts/agent-orchestra/prompts/{audience-explorer-scale,audience-pricing,datamoon-audience-api-5,datamoon-pixel-api,datamoon-integrations,arkdata-brand-designer}.md`;
architecture `~/scripts/agent-orchestra/docs/audience-explorer-scale-architecture.md`;
agent-orchestra memory `/home/shaw/.claude/projects/-home-shaw-scripts-agent-orchestra/memory/`
(`project_audience_pricing_model.md`, `project_arkdata_marketing_enablement_positioning.md`,
`project_superpartner_terminology.md`, `reference_datamoon_filter_catalog.md`, `reference_audiencelab_sync_model.md`);
**AI Proposal Builder** (the precedent to inherit): `~/repos/audience-builder-mockup/proposal-builder.html`,
`docs/superpowers/specs/2026-06-11-ai-proposal-builder-sp1-design.md`,
`2026-06-13-proposal-builder-ux-vision.md`, `ai-eval/README.md`; live builder
`~/repos/audience-builder-mockup/index.html`; pixel hierarchy `arkdata/docs/HANDOFF_2026-06-08_arkdata-dev18.md`.

**Attribution prototype (this feature's narration target):** `~/repos/salesmatch-funnel/` (sm-funnel.netlify.app)
— `docs/full-funnel-attribution-analysis.md`, `docs/competitive-landscape-research.md`,
`docs/ui-patterns-research.md`, and the live People/Marketing funnels + reconciliation explainer + attribution models.
