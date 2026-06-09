# Full-Funnel Attribution — Competitive Landscape & Feature-Demand Research

**Date:** 2026-06-09 · **For:** SalesMatch / ArkData full-funnel attribution product
**Method:** Multi-agent deep-research (103 agents, 21 sources fetched, 98 claims extracted,
25 adversarially verified → 16 confirmed / 9 refuted) + a manual practitioner-demand pass.
**Confidence:** Prongs 1–2 are source-verified. Prong 3 (Reddit) could **not** be mined directly —
Reddit now hard-blocks automated access (crawler, headless browser, and JSON API all returned block
pages), so the practitioner-demand section is grounded in media-buyer / agency-reporting sources that
capture the same voice, **not** verbatim Reddit threads. Flagged inline.

---

## TL;DR — the strategic read

The market splits into **two adjacent industries that don't overlap**, and our product sits in the gap:

1. **Marketing-attribution platforms** (Triple Whale, Northbeam, Rockerbox, HockeyStack, Dreamdata,
   Wicked Reports) have rigorous multi-touch measurement and first-party pixels — but **almost none do
   partner-hierarchy reporting, partner payouts, or true white-label.**
2. **Affiliate / partnership-network platforms** (Impact.com, Everflow, etc.) have multi-tenant,
   white-label, cross-device identity, and managed payouts nailed — but **lack rigorous multi-touch /
   incrementality / MMM measurement** (they're built around last-click commissioning).

**Our white-space = deterministic, pixel-verified, person-level attribution *married to*
partner-hierarchy roll-ups and payouts.** That's exactly the intersection we're building toward
(People funnel + Marketing funnel + admin→meta-partner→partner→client views). No single incumbent
owns it.

**Two hard truths from the research:**
- **Last-touch-only is below table stakes.** Every serious attribution tool ships the full model
  suite (first / last / linear / time-decay / data-driven). We need at least first/linear/time-decay
  on the roadmap, not just last-touch.
- **"Pixel-verified vs platform-claimed" is no longer unique on its own.** Northbeam shipped
  "Clicks + Deterministic Views" (Oct 2025) — clean-room matching of verified impressions against
  first-party pixel/order data, built *with* Meta/TikTok/Snap/Pinterest. Our edge has to be the
  **person-level determinism + the partner-network framing**, not merely "we catch over-attribution."

---

## Prong 1 — Standalone full-funnel / multi-touch attribution products

| Product | Positioning | Segment | First-party pixel | Attribution models | Pricing (approx) | Notes |
|---|---|---|---|---|---|---|
| **Triple Whale** | Shopify-native ecommerce analytics + Moby AI | DTC / ecommerce | **Yes** — "Triple Pixel," sold as the post-iOS-14 first-party solution | Full suite + "Total Impact" data-driven; **Compass** unifies MTA+MMM+incrementality | ~**$129–$179/mo** start, GMV-tiered | 45k+ (claims 60k+) brands; strong Meta/Google/TikTok; **weak on CTV/programmatic/offline** |
| **Northbeam** | ML multi-touch for big-spend DTC | DTC, seven-figure ad spend | Yes (pixel + API) | 7 models incl. **Clicks + Deterministic Views** (clean-room, built w/ Meta/TikTok/Snap/Pinterest/MNTN, Oct 2025); **Incrementality** (2026) | ~**$999–$2,500+/mo**, custom enterprise | The deterministic-measurement frontier; enterprise price floor |
| **Rockerbox** | MTA specialist for hard-to-measure channels (direct mail, podcast, linear/OTT) | Mid-market/enterprise omnichannel | Yes | Custom logistic-regression MTA, model transparency | Custom | **Acquired by DoubleVerify for $85M, Mar 2025** — no longer independent (consolidation signal) |
| **HockeyStack** | "AI GTM — B2B revenue intelligence" | **B2B / SaaS** enterprise | Cookieless **fingerprinting** (server-side sha256, account-level, no PII) | (specific model list unverified — a claimed list was refuted) | Custom | 8x8/RingCentral/MasterCard; account-based, not DTC |
| **Dreamdata** | Warehouse-first B2B pipeline attribution | B2B, data-eng teams | Pixel + warehouse | Standard models, **batch** (BigQuery-native, SQL) | (pricing unverified) | Powerful but needs data-engineering muscle; not real-time |
| **Wicked Reports** | **Multi-client attribution for agencies/consultants** | Agencies, info-marketers | Yes | Cohort/LTV + multi-touch | ~**$400–$999+/mo** tiers, custom multi-account | **Closest analog to our multi-tenant angle** — multi-client dashboards + partner program, but **lacks partner payouts & deep white-label** |

**Not deeply verified** (named in brief, low/refuted coverage — treat as TODO): Funnel.io, Ruler
Analytics, Attribution.app, Hyros, Adinton. ⚠️ A claim that *Attribution App is $79/mo* was **refuted** —
don't cite it.

---

## Prong 2 — Affiliate / partnership-network attribution platforms

| Product | What it nails | Multi-tenant / white-label | Identity / tracking | Payouts | Pricing |
|---|---|---|---|---|---|
| **Impact.com** | Partnerships at scale + 90k-partner marketplace (a moat) | Yes | **Cookie-free** universal tag (ITP-compliant) + **cross-device identity graph** linking a user's devices across web/app | Managed | **$30** Starter / **$500** Essentials (marketplace) / **$2,500** Pro + custom; **2.5% transaction fee** on partner-driven sales |
| **Everflow** | White-label affiliate/ad-network ops | **Yes — explicit white-label** | Precise multi-vertical tracking | **Everflow Pay** native managed payouts, multi-currency; CPA/CPC/CPM + **recurring revenue** | Custom |

**Not deeply verified** (named, low coverage — TODO): Partnerize, PartnerStack, TUNE/HasOffers, Affise,
Refersion, Awin, CJ Affiliate, Trackonomics, Tapfiliate, Rewardful. ⚠️ A claim about *TUNE/HasOffers
positioning* was **refuted** — don't cite it.

**Takeaway:** the affiliate side already ships the multi-tenant + white-label + cross-device identity +
managed-payout stack. If we want to be sold *through* partner/agency networks, these are the
capabilities we're measured against on the "network ops" axis — and they're table stakes there.

---

## Feature matrix — table stakes vs differentiators

**Table stakes (must-have to be credible):**
- First-party pixel (we have it ✅)
- **Full attribution-model suite** — first / last / linear / time-decay / data-driven (we have last-touch only ⚠️)
- Meta + Google + (ideally) TikTok integrations (Meta+Google MVP ✅)
- Cross-platform reconciliation — explain why platform/GA4/CRM numbers diverge (we have the seed: pixel-verified-vs-claimed ✅, needs depth)
- White-label client reporting — custom subdomain, agency-branded scheduled PDF/email, client self-serve login (partial ⚠️)
- Cross-device identity (we have person-level pixel ✅; needs an explicit identity graph)

**Differentiators (the 2025–26 frontier):**
- **MMM** (marketing-mix modeling)
- **Incrementality / holdout testing**
- **Clean-room deterministic views** (Northbeam already here)
- **AI plain-language insights** ("what changed and why")
- **Partner-hierarchy roll-ups + partner payouts tied to verified conversions** ← *almost no attribution tool has this; this is our wedge*

---

## Prong 3 — Practitioner feature demand & pain points

> ⚠️ **Sourcing caveat:** Reddit blocked all automated access during this pass. The items below are
> drawn from media-buyer guides and agency-reporting sources (adleaks, ecdigitalstrategy, easyinsights,
> cometly, almcorp) that summarize the same practitioner complaints — but they are **not verbatim
> Reddit quotes.** A manual Reddit pass (logged-in) is still worth doing if you want raw threads.

Recurring pain points (the emotional core — "I don't trust my numbers"):
- **Conversions don't match across Meta / Google / GA4 / CRM** — the #1 complaint. Platforms act as
  "judge and jury," crediting themselves with generous view-through windows.
- **Double-counting & view-through inflation** — multiple platforms claim the same conversion;
  Meta "takes credit for conversions actually driven by email or SMS," especially in remarketing.
- **iOS / cookie loss / cross-device blindness** — measurement gaps since iOS 14.5.
- **Reports disagree by settings** — "if you and a client are on different attribution settings,
  you're not even looking at the same data."

Concrete features practitioners ask for:
1. **Cross-platform reconciliation reporting** — *explain* why Meta/GA4/CRM diverge (not just show a gap)
2. **Server-side tracking** — Meta CAPI, Google Enhanced Conversions
3. **Incrementality / holdout testing** to validate true lift
4. **Unified dashboard** combining ad platforms + GA4 + CRM **without duplication**
5. **MMM** for statistical channel contribution
6. **Creative-level attribution** — which specific ad/creative actually converts
7. **Business-level KPIs** — CAC, LTV, payback — over platform-native vanity metrics; **cohort LTV by acquisition source**

Agency / white-label reporting wants (directly relevant to our partner angle):
- **Live dashboards on a custom subdomain** clients can self-serve any time (reduces check-in calls)
- **Scheduled PDF/email** reports on the **agency's own brand/domain** (a platform-domained report
  "breaks the white-label illusion")
- **AI plain-language summaries** of what drove results
- **Native multi-platform integration** so teams interpret instead of assemble 6–8 sources by hand

---

## Gaps & opportunities for *our* angle (pixel-verified + multi-tenant + partner-network)

1. **Own the intersection.** Deterministic, person-level, pixel-verified attribution + partner-hierarchy
   roll-ups + payouts is genuine white-space. Lead with it.
2. **Reframe "pixel-verified vs platform-claimed" as a reconciliation *explainer*,** not just a gap bar —
   this is the single loudest practitioner pain point and few tools resolve it well.
3. **The "People funnel" (deterministic, person-level) is our most defensible differentiator** vs
   aggregate MTA tools — lean into "real, resolved people," cohort LTV by source, and "who" demographics.
4. **Partner payouts tied to verified conversions** borrows the affiliate-network playbook that
   attribution tools ignore — and we already have the hierarchy UI.
5. **White-label depth** (custom subdomain + agency-branded scheduled exports + client login) is cheap
   to add relative to its sales impact for selling *through* agencies.

---

## Prioritized feature wishlist → roadmap

**P0 — close the table-stakes gap (credibility):**
- More attribution models: first / linear / time-decay (we're last-touch only)
- Cross-platform **reconciliation view** — extend pixel-verified-vs-claimed into a "why don't these match" explainer
- Server-side ingestion (Meta CAPI / Google Enhanced Conversions)
- Creative-level breakdown in the Marketing funnel

**P1 — lean into the wedge (differentiation that fits us):**
- Partner **payouts / commissioning** tied to verified conversions
- White-label depth: custom subdomain, agency-branded scheduled PDF/email, client self-serve login
- **Cohort LTV by acquisition source** + CAC / LTV / payback KPIs
- Explicit cross-device **identity graph** surfacing

**P2 — frontier (later, where the high end is going):**
- Incrementality / holdout testing
- MMM (marketing-mix modeling)
- AI plain-language insight summaries

---

## Caveats / what to verify next

- **Reddit not directly mined** (hard-walled) — do a logged-in pass for raw threads if you want quotes.
- **Uncovered competitors** (Funnel.io, Ruler, Hyros, Adinton, Partnerize, PartnerStack, TUNE, Awin,
  CJ, Tapfiliate, Rewardful) — no surviving verified claims; pricing/positioning still open.
- **Refuted — do NOT cite:** "Attribution App $79/mo"; "TUNE longest-running since 2009" positioning;
  a specific HockeyStack model list; a "Triple Pixel = whitelabeled Snowplow" claim; a "$500K spend
  floor for Northbeam MMM."
- **Time-sensitive:** attribution pricing and model line-ups change fast (Triple Whale 45k vs 60k
  brands; $129 vs $179 start); MMM/incrementality/deterministic-views are 2025–26 launches still evolving.

**Open questions worth a follow-up pass:**
- Does anyone already market "pixel-verified vs platform-claimed" as an explicit feature (beyond
  Northbeam's clean-room views) that would erode our core differentiator?
- Do any partner-network incumbents (Partnerize, PartnerStack, TUNE, Awin, CJ) already combine rigorous
  multi-touch measurement with payouts — i.e., is the intersection still open?
