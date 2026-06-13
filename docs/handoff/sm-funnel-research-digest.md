# Research Digest — Full-Funnel Attribution UI (companion to the one-shot prompt)

Paste this right after the one-shot build prompt. It is the distilled product +
UI research the build should be grounded in. (Condensed from two verified
multi-agent research passes: a competitive landscape and a UI-pattern study.)

---

## A. The strategic read — what we're building and why it's different

The market splits into two adjacent industries that **don't overlap**, and this
product sits in the gap:

1. **Marketing-attribution platforms** (Triple Whale, Northbeam, Rockerbox,
   HockeyStack, Dreamdata, Wicked Reports) — rigorous multi-touch measurement +
   first-party pixels, but **almost none do partner-hierarchy reporting, partner
   payouts, or true white-label.**
2. **Affiliate / partnership-network platforms** (Impact.com, Everflow) —
   multi-tenant, white-label, cross-device identity, managed payouts nailed —
   but **lack rigorous multi-touch / incrementality measurement** (built around
   last-click commissioning).

**Our white-space (the wedge):** deterministic, **pixel-verified, person-level
attribution married to partner-hierarchy roll-ups + payouts.** That intersection
= the People funnel + Marketing funnel + admin→meta-partner→partner→tenant views.
No single incumbent owns it.

**Two hard truths:**
- **Last-touch-only is below table stakes.** Every serious tool ships the full
  model suite (first/last/linear/time-decay/data-driven). (We carry all five.)
- **"Pixel-verified vs platform-claimed" alone is no longer unique** (Northbeam
  shipped clean-room deterministic views, Oct 2025). Our edge = **person-level
  determinism + partner-network framing**, not merely catching over-attribution.

### Competitor "personality" poles (UI as positioning)
- **Triple Whale** — operator *command-center*: real-time, profit/MER up front,
  founder-simple; no-code dashboard builder + SQL for analysts.
- **Northbeam** — the *explainer*: media-buying workflow, modeled paths, "why."
- **HockeyStack** — *no-code pre-built* dashboards for non-SQL teams.
- **Everflow** — *clean unified* single view + partner portal + mobile parity.
- **Impact.com** — more powerful but heavier/module-switching.

### Table stakes vs differentiators
Table stakes: first-party pixel ✅ · full model suite ✅ · Meta+Google ✅ ·
cross-platform reconciliation ✅(seed) · white-label client reporting (partial) ·
cross-device identity (person-level ✅).
Differentiators / 2025–26 frontier: MMM · incrementality/holdout · clean-room
deterministic views · **AI plain-language insights ("what changed & why")** ·
**partner-hierarchy roll-ups + payouts tied to verified conversions ← our wedge.**

---

## B. UI patterns — the 11 common themes (what best-in-class does)

1. **Persistent left sidebar nav** (240–256 expanded / 64–68 collapsed, icon +
   tooltip; section headers 12px uppercase; active = tinted bg + accent). *The
   current app uses a top toggle instead — fix this.*
2. **Top KPI scorecard strip, 4–6 cards (max 8).** Each = one big number (28–32px)
   + one comparison (vs prior period/goal) + ONE micro-viz. **"Never show a naked
   number."** Top-left (F-pattern).
3. **Summary → detail drill-down IA**, with **filters that persist across every
   drill level.**
4. **Role/persona-specific layouts** — exec (6–8 outcome metrics), channel-manager
   (12–15 + levers), analyst (raw/ad-hoc). Adaptive depth.
5. **Chart-type-by-metric discipline:** trend→line; comparison→bar; single→
   scorecard; detail→table (top-20, sticky header, right-aligned numbers); geo→
   map; multi-step→**funnel**; journeys→**sankey**; composition→stacked bar;
   matrices→**heatmap** (channel×week, red/green vs goal).
6. **Attribution staples:** multi-stage funnel w/ per-stage conversion %; **sankey
   for multi-touch paths**; **attribution model as a first-class filter**;
   channel/source breakdown; top/bottom-5 tables.
7. **Persistent filter hierarchy:** date range (MTD/QTD/YTD/custom) **+ comparison
   period**, channel, campaign, geo, segment, model — sticky across views.
8. **Freshness + proactive alerts:** "last updated" everywhere; live indicators;
   alerts that carry a **recommended action**, not passive notifications.
9. **Visual style:** ship **both light + dark** (CSS custom props, respect
   `prefers-color-scheme`); brand accent + semantic red/green; card surfaces;
   override chart colors with the design palette (WCAG).
10. **Three required states:** loading (skeleton/shimmer), empty (illustration +
    one sentence + CTA), error (boundary + retry). Loudest principle everywhere:
    **progressive disclosure beats density — don't cram.**
11. **Affiliate/partner platforms add:** a unified single view of all
    partners/channels + a separate **partner portal** (links, performance,
    payouts) + customizable dashboards + full mobile parity.

---

## C. How the current sm-funnel app stacks up

**Already on-pattern (preserve):** summary→detail drill-down; role-based views;
KPI strips w/ value + trend + sublabels; funnels, stacked bars, sparklines, a
heatmap-style attribution matrix, map, waterfall, live feed, notices/suggestions;
dark glass theme + purple accent + emerald/rose semantics; mobile-responsive;
attribution model as a first-class control.

**Gaps to close (most → least impactful):**
1. **No real time-series line charts** (sparklines aren't enough) — the single
   most common chart. KPI cards also need sparklines + a comparison period.
2. **No sankey / path view** for multi-touch journeys.
3. **No persistent unified filter bar** (filters are per-view; no comparison period).
4. **Top toggle, not a sidebar** — doesn't scale as surfaces grow.
5. **No loading / empty / error states.**
6. **Dark-only** — needs a light theme for white-label.
7. **No partner portal** (links/performance/payouts) — ties to the payouts roadmap.
8. **Widget customization scaffolded but unused.**

**Prioritized moves:** P0 = line charts + sparkline-KPIs + comparison period, and
a persistent sticky filter bar. P1 = sidebar nav, loading/empty/error states,
sankey path view. P2 = light theme, partner portal, widget customization.
