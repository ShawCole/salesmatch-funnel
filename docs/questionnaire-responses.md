# Full-Funnel Attribution UI — Questionnaire Responses
Submitted: 2026-06-08T15:49:51.596Z

## Q1: Who is the primary user of the attribution dashboard?
**Answer:** Both equally — multi-tenant from day 1, each persona gets tailored views

## Q2: How is this monetized?
**Answer:** Bundled with ArkData pixel — included when clients buy ArkData's intent data

## Q3: What pricing tier structure, if any?
**Answer:** Defer — build first, price later

## Q4: Does this dashboard replace the existing sm-funnel prototype or live alongside it?
**Answer:** Replace — evolve the existing codebase into the live product

## Q5: Which ad platforms for MVP? (select all)
**Selected:**
- Meta Ads — graph.instagram.com/v20.0, 200 calls/hr insights, ~24hr freshness
- Google Ads — googleads.googleapis.com/v17, 10K req/day, ~2hr conversion delay

## Q6: Do we already have API credentials / ad accounts authorized for any platforms?
**Response:** Meta Business Manager for Fast Fund Leads account

## Q7: What DSP / programmatic partners do we want to support?
**Answer:** No DSP in scope

## Q8: Email platform integrations?
**Answer:** Multiple ESPs — describe below

## Q9: Primary attribution model for MVP?
**Answer:** Last-Touch — credit goes to last platform/campaign before conversion. Simplest, best for performance marketing

## Q10: Default lookback window?
**Answer:** Configurable per tenant — 7/14/30/60 selectable in settings

## Q11: How should cross-platform deduplication work?
**Answer:** Unified attribution — build our own cross-platform identity graph and attribute independently

## Q12: What counts as a "conversion" in the funnel?
**Answer:** Multiple conversion events — micro-conversions (form view, start) + macro (submitted, booked)

## Q13: What metrics need live updates (<5 min)?
**Selected:**
- Pixel fires (LP visitors) — ArkData pixel, 5-15 min aggregation
- Audience sync status — retarget audience build progress

## Q14: Acceptable data latency for the dashboard?
**Answer:** Hourly refresh — cron-based aggregation, moderate infra

## Q15: Should the dashboard show a live activity feed?
**Answer:** Yes — real-time event ticker showing impressions, clicks, pixel fires as they happen

## Q16: Partner (agency) view: blended or per-tenant?
**Answer:** Both — roll-up summary + drill-down per tenant (recommended)

## Q17: Should the multi-pipeline concept carry over from the prototype?
**Answer:** Hierarchical — tenant > pipeline > campaign > ad set > creative

## Q18: White-labeling: should tenants/partners be able to rebrand the dashboard?
**Answer:** Full white-label — partners can completely rebrand for their clients (custom domain, logo, colors)

## Q19: How does ArkData pixel data flow into the attribution dashboard?
**Answer:** API polling — dashboard calls existing ArkData API for pixel counts on interval

## Q20: Should the dashboard visualize the pixel-to-retarget audience sync?
**Answer:** Yes — show sync status, last sync time, audience build progress, match rate

## Q21: Should the dashboard show audience eligibility breakdown?
**Answer:** Yes — match rate, reasons for exclusion, audience quality score

## Q22: Most important view to nail first?
**Answer:** Funnel overview — evolve existing TAM → Intent → ... → Converted view with live data

## Q23: Should the demographics/map explorer integrate with attribution?
**Answer:** Integrated — map shows funnel stage by geography (e.g., conversions per ZIP/county), clickable to drill into attribution

## Q24: Mobile support requirements?
**Answer:** Responsive — works on mobile but desktop is primary (like current prototype)

## Q25: Export / reporting capabilities for MVP?
**Answer:** CSV + PDF + scheduled reports — daily/weekly email with attribution summary

## Q26: Where should the backend run?
**Answer:** GCP (existing) — Cloud Run + Cloud SQL (Postgres) + Redis Memorystore + Pub/Sub

## Q27: Budget ceiling for this build?
**Answer:** Open — budget follows justified scope

## Q28: Timeline target for MVP?
**Answer:** ASAP — ship a minimal version in 4-6 weeks
