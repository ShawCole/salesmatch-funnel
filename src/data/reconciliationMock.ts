// Reconciliation data contract + mock provider.
// The UI reads ONLY `ReconciliationData`; swap `buildReconciliation` for a real
// backend-fed provider later without touching the views.
//
// Methodology note (why this is honest): you CANNOT sum platform-reported
// conversions — Meta and Google measure in isolation and can't see each other,
// so the true count of unique people is unknowable from the counts alone
// (it lies between max(meta,google) and meta+google). Only a person-level
// identity layer (the pixel, via captured click IDs) can deduplicate across
// platforms. So the "naive stacked total" is shown as the trap, and the
// pixel-verified number is the single source of truth.

import { PLATFORMS } from './funnelMock';

export type SourceKey = 'meta' | 'google' | 'ga4' | 'pixel' | 'crm';

export interface SourceClaim {
  source: SourceKey;
  label: string;
  claimed: number;
  color: string;
  isTruth?: boolean;       // the pixel = deterministic truth baseline
  isDownstream?: boolean;  // CRM = downstream-confirmed, not a competing claim
}

export interface ReconReason {
  key: string;
  label: string;
  delta: number;           // negative = removed from the naive total, positive = pixel-only add
  description: string;
  tone: 'subtract' | 'add';
}

export interface ReconciliationData {
  pixelVerified: number;        // the single source of truth (deduplicated, person-level)
  naiveStackedTotal: number;    // Meta + Google ADDED — the trap, not a real metric
  uniqueLow: number;            // max(meta, google) — if one fully overlaps the other
  uniqueHigh: number;           // meta + google — if zero overlap (= the naive sum)
  overClaimPct: number;         // naive total over the verified truth
  asOf: string;
  sources: SourceClaim[];
  reasons: ReconReason[];       // waterfall steps; reconcile naive total -> verified exactly
  narrative: string[];
  methodology: string[];
}

/**
 * Build a reconciliation summary. `unmatched` is computed as the residual so the
 * waterfall always closes exactly:
 *   naive - overlap - viewThrough - unmatched - bot + pixelOnly === pixelVerified
 */
export function buildReconciliation(scaleFactor = 1): ReconciliationData {
  const s = (n: number) => Math.max(0, Math.round(n * scaleFactor));

  const meta = s(96);
  const google = s(58);
  const ga4 = s(112);
  const crm = s(72);
  const pixelVerified = s(89);

  const naiveStackedTotal = meta + google;
  const uniqueLow = Math.max(meta, google);   // if Google's people ⊆ Meta's
  const uniqueHigh = meta + google;           // if zero overlap (= the naive sum)

  const overlap = s(28);       // people BOTH platforms counted — pixel-revealed, not count-derived
  const viewThrough = s(24);
  const botInvalid = s(4);
  const pixelOnly = s(6);
  // residual so the bridge reconciles exactly:
  const unmatched = Math.max(
    0,
    naiveStackedTotal + pixelOnly - pixelVerified - overlap - viewThrough - botInvalid,
  );

  const reasons: ReconReason[] = [
    { key: 'overlap', label: 'Overlap only the pixel can resolve', delta: -overlap, tone: 'subtract',
      description: 'The same people, counted by BOTH Meta and Google — invisible to either platform. Only the person-level pixel sees it is one human.' },
    { key: 'view_through', label: 'View-through / modeled', delta: -viewThrough, tone: 'subtract',
      description: 'Impression-only conversions: no click, no site visit, so the pixel never saw them. Unverifiable — not provably real.' },
    { key: 'unmatched', label: 'Unmatched / unresolved', delta: -unmatched, tone: 'subtract',
      description: 'Clicked, but could not be deterministically resolved to a real person.' },
    { key: 'bot', label: 'Bot / invalid', delta: -botInvalid, tone: 'subtract',
      description: 'Filtered as non-human or invalid traffic.' },
    { key: 'pixel_only', label: 'Pixel-only (platforms missed)', delta: pixelOnly, tone: 'add',
      description: 'Real conversions the pixel caught that no platform claimed.' },
  ];

  const overClaimPct = pixelVerified
    ? Math.round((naiveStackedTotal - pixelVerified) / naiveStackedTotal * 100)
    : 0;

  const sources: SourceClaim[] = [
    { source: 'meta', label: 'Meta', claimed: meta, color: PLATFORMS.meta.color },
    { source: 'google', label: 'Google', claimed: google, color: PLATFORMS.google.color },
    { source: 'ga4', label: 'GA4', claimed: ga4, color: '#f9ab00' },
    { source: 'pixel', label: 'ArkData pixel', claimed: pixelVerified, color: '#a855f7', isTruth: true },
    { source: 'crm', label: 'CRM (closed)', claimed: crm, color: '#10b981', isDownstream: true },
  ];

  const narrative = [
    `Add each platform's claim and you get ${naiveStackedTotal} — but that's the trap. Meta and Google can't see each other, so the true number of unique people is unknowable from the counts alone (somewhere between ${uniqueLow} and ${uniqueHigh}).`,
    `Only the person-level pixel sees the actual humans: it resolves ${overlap} that both platforms counted, drops ${viewThrough} view-through it never saw on-site and ${unmatched} it couldn't match, and adds ${pixelOnly} the platforms missed entirely.`,
    `Deterministic truth: ${pixelVerified} verified people — the single source of truth. The platforms collectively over-claim by ${overClaimPct}%.`,
  ];

  const methodology = [
    'The pixel captures each visitor plus their ad click IDs (gclid / gbraid for Google, fbclid / _fbc for Meta, etc.), tying ad click → site visit → conversion to one real person.',
    'That lets it deterministically verify click-driven conversions, flag impression-only (view-through) ones it never saw as unverified, and detect the same human claimed by multiple platforms.',
    'Platforms cannot deduplicate each other — only a person-level layer can. CRM (closed-won) is the downstream revenue ground truth.',
  ];

  return { pixelVerified, naiveStackedTotal, uniqueLow, uniqueHigh, overClaimPct,
    asOf: 'last run 14:05 · hourly', sources, reasons, narrative, methodology };
}
