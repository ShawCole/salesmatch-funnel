# Reconciliation Explainer — Design Spec

**Date:** 2026-06-10 · **Status:** approved, building
**Why:** #1 practitioner pain from the competitive research (`docs/competitive-landscape-research.md`)
is *"Meta, Google, GA4 and my CRM all disagree."* Tools show a gap; nobody **explains** it. This is our
loudest differentiator and we already have the seed (the "pixel-verified vs platform-claimed" card).

## Decisions (locked with Shaw)
- **Data:** mock-first behind a clean **data-contract seam** so real Meta/Google/GA4/pixel/CRM feeds
  drop in later with no UI rework.
- **Hero viz:** **waterfall / bridge** — platform-claimed → subtract reasons → pixel-verified truth.
- **Placement:** new **top-level mode** in the funnel toggle: People · Marketing · **Reconciliation** · Map.
- **CRM:** shown as **downstream context** in the source strip, NOT a row in the waterfall (closed-won is
  a later funnel stage, not a competing claim of the same conversion event).

## Architecture

```
src/data/reconciliationMock.ts   # data contract + buildReconciliation(scale) (pure, testable)
src/components/Waterfall.tsx      # generic bridge chart (start → steps → end), responsive
src/views/ReconciliationView.tsx  # the mode: KPI strip + hero waterfall + sources + reasons + narrative
src/views/FullFunnelView.tsx      # add 'reconciliation' to the mode toggle; render the view; teaser link
```

### The data-contract seam
The UI reads ONE typed shape; the provider is swappable (mock now, backend later):
```ts
interface SourceClaim { source:'meta'|'google'|'ga4'|'pixel'|'crm'; label; claimed; color; isTruth?; isDownstream? }
interface ReconReason { key; label; delta /* −sub, +add */; description; tone:'subtract'|'add' }
interface ReconciliationData {
  pixelVerified; platformClaimedTotal; overClaimPct; asOf;
  sources: SourceClaim[]; reasons: ReconReason[]; narrative: string[];
}
buildReconciliation(scaleFactor): ReconciliationData   // MVP
// later: fetchReconciliation(scope) hitting the backend — same return type
```

### Reconciliation model (truth = ArkData pixel)
Waterfall from `platformClaimedTotal` (Meta + Google headline claims) → `pixelVerified` via reasons:
- − **Cross-platform double-counts** (Meta *and* Google both credit the same person)
- − **View-through / modeled** (impression-only conversion the pixel never saw on-site)
- − **Unmatched / unresolved** (clicked, no deterministic person match) — *balancing term so the books close exactly*
- − **Bot / invalid**
- + **Pixel-only** (real conversions the platforms missed entirely)

**Invariant:** `claimed − doubleCounted − viewThrough − unmatched − bot + pixelOnly === pixelVerified`,
enforced by computing `unmatched` as the residual. (At scale 1: 154 − 28 − 24 − 15 − 4 + 6 = 89.)

### Components
- **KPI strip:** Platform-claimed · ◆ Pixel-verified · Over-claim % · Pixel-only found.
- **Hero `Waterfall`:** running-total bars that taper from claimed → verified, each step labelled with its
  signed delta; subtract = rose, add = emerald, end (truth) = purple. Responsive (stacks on mobile).
- **Source-comparison strip:** Meta / Google / GA4 / Pixel(◆truth) / CRM(downstream) with variance vs pixel.
- **Reasons breakdown:** one card per waterfall step (count + plain-language description).
- **Templated narrative:** rule-based sentence built from the reasons (no LLM in MVP).
- **Teaser:** the existing Marketing "pixel-verified vs platform-claimed" card gets a "See full
  reconciliation →" button that switches to this mode.

### Scaling & state
Tenant-scoped: `scale = pipelineScale × tenantScaleFactor` (same as the funnel), so each client shows
proportional numbers. Reconciliation is a period summary → static with an "as of" freshness line (no live
tick, which would break the exact-reconciliation invariant).

## Out of scope (YAGNI → real-data seam later)
Real Meta CAPI / Google / GA4 / CRM wiring · server-side ingestion · real identity-graph matching ·
LLM-written narratives · the per-conversion ledger view. All slot behind the same contract.

## Verification
- Pure `buildReconciliation()` math: reasons reconcile exactly to `pixelVerified` (assert in dev).
- Browser screenshots at desktop (1440) and mobile (390), per project convention.
- `npm run build` green; deploy to sm-funnel.netlify.app.
