# UI Patterns Research — Attribution / Analytics / Affiliate Dashboards

**Date:** 2026-06-13 · **For:** SalesMatch / ArkData full-funnel attribution UI
**Method:** Targeted research across dashboard-design pattern guides, marketing-attribution
dashboard examples, and competitor UX teardowns (Triple Whale, Northbeam, HockeyStack,
Everflow, Impact.com). Sources at bottom.

## Common themes (the answer)

**1. Persistent left sidebar is the de-facto nav.** 256px expanded / 64px collapsed (icon + tooltip),
section headers in 12px uppercase, active item = tinted bg + 3px left accent. The Linear/Vercel/Notion
lineage. *(We use a top toggle + persona bar instead — a real divergence.)*

**2. Top KPI "scorecard" strip — 4–6 cards (max 8).** Each = one primary number (28–32px) + one
comparison (vs prior period / goal / benchmark) + ONE micro-viz (sparkline OR mini-bar OR trend arrow —
not all three). The repeated rule: **"never show a naked number."** Placed top-left (F-pattern).

**3. Summary → detail drill-down IA**, with **filters that persist across every drill level.**

**4. Role/persona-specific layouts.** Exec/CMO (6–8 outcome metrics, minimal), Channel-manager (12–15
per-channel metrics + optimization levers), Analyst (raw/SQL/ad-hoc). Adaptive depth: newcomers see
summary, analysts drill.

**5. Chart-type-by-metric discipline.** Trend → line; comparison → bar; single value → scorecard;
detail → table (capped ~top-20, sticky header, 48–52px rows, right-align numbers); geo → map; multi-step
flow → **funnel**; multi-touch journeys → **sankey**; composition → stacked bar; outliers → scatter
(e.g. CPA × volume); matrices → **heatmap** (channel × week, red=below / green=above goal).

**6. Attribution-specific staples.** Multi-stage funnel with per-stage conversion %; **sankey for
multi-touch paths** ("which sequences convert, how often"); **attribution model as a first-class filter**
(first/last/linear/time-decay); channel/source breakdown; top/bottom-5 performer tables.

**7. A persistent filter hierarchy.** Date range (MTD/QTD/YTD/custom) **+ comparison period**, channel,
campaign, geography, audience segment, attribution model — visible and sticky across views.

**8. Freshness + proactive alerts.** "Last updated" timestamps everywhere; live/real-time indicators;
alerts that carry a **recommended action** (route to Slack/email), not passive notifications.

**9. Visual style.** Dark mode is common but the standard is **ship both light + dark** (CSS custom
props, respect `prefers-color-scheme`); a brand accent + **semantic red/green** (below/above goal);
card/elevated surfaces. Always override chart colors with the design-system palette (WCAG).

**10. Three required states + anti-overload.** Loading (skeleton/shimmer), empty (illustration + one
sentence + CTA), error (component-level boundary + retry). And the loudest principle across every
source: **don't cram — progressive disclosure beats density.**

**11. Affiliate/partner platforms add two things:** a **unified single view** of all partners/channels
(Everflow's edge over Impact's module-switching), and a separate **partner portal** (the affiliate logs
in to grab tracking links, see their performance, and view payouts). Plus customizable dashboards and
full mobile parity.

## Competitor "personality" poles (UI as positioning)
- **Triple Whale** — operator *command-center*: real-time, profit/MER up-front, simple enough for a
  founder; no-code dashboard builder + SQL for analysts.
- **Northbeam** — the *explainer*: built around media-buying workflow, modeled paths, "why not just what."
- **HockeyStack** — *no-code pre-built* dashboards for non-SQL teams.
- **Everflow** — *clean unified* single view + partner portal + customizable + mobile parity.
- **Impact.com** — more powerful but heavier/module-switching (complexity as the trade-off).

## How we stack up

**Already on-pattern (good):**
- Summary→detail drill-down (portfolio → tenant → funnel → map; stage → drill panel). ✓
- Role-based views (admin/meta-partner/partner/tenant) ≈ the persona-layout pattern. ✓
- KPI strips with value + trend; reconciliation/attribution cards have sublabels (≈ "no naked number"). ✓
- Funnels, segmented/stacked bars, sparklines (portfolio), a heatmap-style attribution matrix, map,
  waterfall, live feed, and a Notices/Suggestions panel (= "alerts with recommended action"). ✓
- Dark glass theme + purple accent + emerald/rose semantic; mobile-responsive. ✓
- Attribution model as a first-class control. ✓

**Gaps worth considering (most→least impactful):**
1. **No time-series line charts.** Sparklines aren't enough — trend-over-time is the single most common
   chart and we don't have a real one. (KPI cards should also get sparklines + a comparison period.)
2. **No sankey / path view** for multi-touch journeys — a recognized attribution staple.
3. **No persistent unified filter bar.** Filters (date/comparison/channel/campaign/geo/model) are
   per-view, not sticky across drill levels; we also lack a comparison period ("vs prior 30d").
4. **Navigation is a top toggle, not a sidebar.** As surfaces grow (People/Marketing/Reconciliation/Map
   + attribution + future payouts), a 256px collapsible sidebar is the proven scale pattern.
5. **No loading / empty / error states.** Fine for a mock, required for the real-data build.
6. **Dark-only.** A light theme matters for white-label (partners' brands aren't all dark).
7. **No partner portal** (affiliate-facing: links, performance, payouts) — ties to the payouts roadmap.
8. **Widget customization scaffolded but unused** — "customizable dashboard" is a common expectation;
   our widget system isn't wired into the live views yet.

## Recommended next UI moves (grounded in the above)
- **P0:** add real time-series line charts (trend KPIs) + sparklines-in-KPI-cards + a comparison period.
- **P0:** a persistent top filter bar (date+compare / channel / campaign / model), sticky across views.
- **P1:** evaluate sidebar nav as surface count grows; add loading/empty/error states with the real data.
- **P1:** a sankey path view for multi-touch journeys (pairs naturally with attribution models).
- **P2:** light theme for white-label; partner portal; wire up widget customization.

## Sources
- [Dashboard Design Patterns for Modern Web Apps (artofstyleframe)](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/) — concrete specs (sidebar dims, KPI card, 12-col grid, table specs, states).
- [12 Best Marketing Dashboard Examples (Improvado)](https://improvado.io/blog/12-best-marketing-dashboard-examples-and-templates) — marketing/attribution-specific layout + chart conventions.
- [20 Dashboard UI/UX Principles 2025 (Medium)](https://medium.com/@allclonescript/20-best-dashboard-ui-ux-design-principles-you-need-in-2025-30b661f2f795) — sidebar/KPI-strip/grid pattern.
- [Dashboard Design Best Practices (resolution)](https://www.resolution.de/post/dashboard-design-best-practices/) and [UXPin Dashboard Principles](https://www.uxpin.com/studio/blog/dashboard-design-principles/) — hierarchy, anti-overload, adaptive depth.
- [Triple Whale vs Northbeam (commonthreadco)](https://commonthreadco.com/blogs/coachs-corner/prophit-engine-vs-triple-whale-vs-northbeam-whats-actually-different) — UX personality poles.
- [Everflow Review (thedigitalmerchant)](https://thedigitalmerchant.com/everflow-review/) + [Everflow Partner Portal UI](https://www.everflow.io/webinars/navigating-partner-portal-ui) — affiliate unified-view + partner portal.
