// Reconciliation data contract + mock provider.
// The UI reads ONLY `ReconciliationData`; swap `buildReconciliation` for a real
// backend-fed provider later without touching the views.

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
  delta: number;           // negative = removed from platform claims, positive = pixel-only add
  description: string;
  tone: 'subtract' | 'add';
}

export interface ReconciliationData {
  pixelVerified: number;        // truth
  platformClaimedTotal: number; // Meta + Google headline claims
  overClaimPct: number;         // how much platforms over-claim vs the pixel
  asOf: string;
  sources: SourceClaim[];
  reasons: ReconReason[];       // waterfall steps; reconcile claimed -> verified exactly
  narrative: string[];
}

/**
 * Build a reconciliation summary. `unmatched` is computed as the residual so the
 * books always close exactly:
 *   claimed - doubleCounted - viewThrough - unmatched - bot + pixelOnly === pixelVerified
 */
export function buildReconciliation(scaleFactor = 1): ReconciliationData {
  const s = (n: number) => Math.max(0, Math.round(n * scaleFactor));

  const meta = s(96);
  const google = s(58);
  const ga4 = s(112);
  const crm = s(72);
  const pixelVerified = s(89);

  const platformClaimedTotal = meta + google;

  const doubleCounted = s(28);
  const viewThrough = s(24);
  const botInvalid = s(4);
  const pixelOnly = s(6);
  // residual so the waterfall reconciles exactly:
  const unmatched = Math.max(
    0,
    platformClaimedTotal + pixelOnly - pixelVerified - doubleCounted - viewThrough - botInvalid,
  );

  const reasons: ReconReason[] = [
    { key: 'double_counted', label: 'Cross-platform double-counts', delta: -doubleCounted, tone: 'subtract',
      description: 'Meta and Google both took credit for the same person.' },
    { key: 'view_through', label: 'View-through / modeled', delta: -viewThrough, tone: 'subtract',
      description: 'Impression-only conversions the pixel never saw on-site.' },
    { key: 'unmatched', label: 'Unmatched / unresolved', delta: -unmatched, tone: 'subtract',
      description: 'Clicked, but could not be resolved to a real person.' },
    { key: 'bot', label: 'Bot / invalid', delta: -botInvalid, tone: 'subtract',
      description: 'Filtered as non-human or invalid traffic.' },
    { key: 'pixel_only', label: 'Pixel-only (platforms missed)', delta: pixelOnly, tone: 'add',
      description: 'Real conversions the pixel caught that no platform claimed.' },
  ];

  const overClaimPct = platformClaimedTotal
    ? Math.round((platformClaimedTotal - pixelVerified) / platformClaimedTotal * 100)
    : 0;

  const sources: SourceClaim[] = [
    { source: 'meta', label: 'Meta', claimed: meta, color: PLATFORMS.meta.color },
    { source: 'google', label: 'Google', claimed: google, color: PLATFORMS.google.color },
    { source: 'ga4', label: 'GA4', claimed: ga4, color: '#f9ab00' },
    { source: 'pixel', label: 'ArkData pixel', claimed: pixelVerified, color: '#a855f7', isTruth: true },
    { source: 'crm', label: 'CRM (closed)', claimed: crm, color: '#10b981', isDownstream: true },
  ];

  const narrative = [
    `Meta and Google together claim ${platformClaimedTotal} conversions.`,
    `${doubleCounted} are double-counted (both took credit for the same person), ` +
      `${viewThrough} are view-through Meta never saw on-site, and ${unmatched} couldn't be matched to a real person.`,
    `The pixel independently verified ${pixelVerified} — plus ${pixelOnly} the platforms missed entirely.`,
    `Net: platforms over-claim by ${overClaimPct}%.`,
  ];

  return { pixelVerified, platformClaimedTotal, overClaimPct, asOf: 'last run 14:05 · hourly',
    sources, reasons, narrative };
}
