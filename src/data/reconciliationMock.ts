// Reconciliation data contract + mock provider — FULLY PER-PLATFORM.
// We never sum platform claims. Each platform is reconciled on its own against the
// pixel; the unique truth is then composed from the pixel's person-level ledger,
// with the cross-platform overlap shown explicitly (the pixel is the only thing
// that can resolve who was claimed by both).
//
// The UI reads ONLY `ReconciliationData`; swap `buildReconciliation` for a real
// backend-fed provider later without touching the views.

import { PLATFORMS } from './funnelMock';

export interface ReconReason {
  key: string;
  label: string;
  delta: number;          // negative — removed from this platform's own claim
  description: string;
}

export interface PlatformRecon {
  platform: 'meta' | 'google';
  label: string;
  color: string;
  claimed: number;
  verified: number;       // claimed + sum(reasons) — what the pixel confirms for this platform
  overClaimPct: number;
  reasons: ReconReason[]; // view-through, unmatched, bot (all subtract)
}

export interface TruthSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  description: string;
}

export interface OtherSource {
  key: string;
  label: string;
  claimed: number;
  color: string;
  note: string;
}

export interface ReconciliationData {
  perPlatform: PlatformRecon[];
  overlap: number;          // people claimed by BOTH (pixel-resolved to one human)
  pixelOnly: number;        // real conversions no platform claimed
  uniqueFromAds: number;    // metaOnly + googleOnly + overlap
  pixelVerified: number;    // the single source of truth (unique union)
  truth: TruthSegment[];    // composition of pixelVerified (no summing of claims)
  otherSources: OtherSource[];
  narrative: string[];
  methodology: string[];
  asOf: string;
}

export function buildReconciliation(scaleFactor = 1): ReconciliationData {
  const s = (n: number) => Math.max(0, Math.round(n * scaleFactor));

  const metaClaimed = s(96);
  const googleClaimed = s(58);

  // person-level provenance of the verified people (from the pixel's click-ID ledger)
  const metaOnly = s(33);     // only an fbclid in their journey
  const googleOnly = s(22);   // only a gclid
  const overlap = s(28);      // both fbclid AND gclid — both platforms claim them
  const pixelOnly = s(6);     // no ad click (dark social etc.) — platforms missed

  const metaVerified = metaOnly + overlap;     // Meta legitimately touched the overlap too
  const googleVerified = googleOnly + overlap;
  const pixelVerified = metaOnly + googleOnly + overlap + pixelOnly;
  const uniqueFromAds = metaOnly + googleOnly + overlap;

  const platformRecon = (
    platform: 'meta' | 'google', label: string, color: string,
    claimed: number, verified: number, bot: number, unmatched: number,
  ): PlatformRecon => {
    const viewThrough = Math.max(0, claimed - verified - bot - unmatched);
    const reasons: ReconReason[] = [
      { key: 'view_through', label: 'View-through / modeled', delta: -viewThrough,
        description: 'Impression-only — no click, no site visit, so the pixel never saw them. Unverifiable.' },
      { key: 'unmatched', label: 'Unmatched / unresolved', delta: -unmatched,
        description: 'Clicked, but could not be deterministically resolved to a real person.' },
      { key: 'bot', label: 'Bot / invalid', delta: -bot,
        description: 'Filtered as non-human or invalid traffic.' },
    ];
    return { platform, label, color, claimed, verified,
      overClaimPct: claimed ? Math.round((claimed - verified) / claimed * 100) : 0, reasons };
  };

  const perPlatform = [
    platformRecon('meta', 'Meta', PLATFORMS.meta.color, metaClaimed, metaVerified, s(3), s(8)),
    platformRecon('google', 'Google', PLATFORMS.google.color, googleClaimed, googleVerified, s(1), s(3)),
  ];

  const truth: TruthSegment[] = [
    { key: 'meta_only', label: 'Meta-driven', value: metaOnly, color: PLATFORMS.meta.color,
      description: 'Verified people only Meta drove (fbclid only).' },
    { key: 'overlap', label: 'Both (overlap)', value: overlap, color: '#a855f7',
      description: 'Claimed by BOTH Meta and Google — the pixel resolves them to one human.' },
    { key: 'google_only', label: 'Google-driven', value: googleOnly, color: PLATFORMS.google.color,
      description: 'Verified people only Google drove (gclid only).' },
    { key: 'pixel_only', label: 'Pixel-only', value: pixelOnly, color: '#10b981',
      description: 'Real conversions the pixel caught that no platform claimed.' },
  ];

  const otherSources: OtherSource[] = [
    { key: 'ga4', label: 'GA4', claimed: s(112), color: '#f9ab00', note: 'session-based — also can\'t be added to the above' },
    { key: 'crm', label: 'CRM (closed)', claimed: s(72), color: '#10b981', note: 'downstream closed-won — the revenue ground truth' },
  ];

  const narrative = [
    `We never combine the platforms — the pixel checks each one's own claim separately.`,
    `Meta claims ${metaClaimed}; the pixel confirms ${metaVerified} are real. Google claims ${googleClaimed}; confirms ${googleVerified}.`,
    `Even those confirmed numbers can't be added: ${overlap} people are in both (only the pixel knows it's one human). The one pixel-verified truth is ${pixelVerified} unique people — ${uniqueFromAds} from ads plus ${pixelOnly} the platforms missed.`,
  ];

  const methodology = [
    'The pixel captures each visitor plus their ad click IDs (gclid / gbraid for Google, fbclid / _fbc for Meta), tying ad click → site visit → conversion to one real person.',
    'That lets it verify each platform’s click-driven conversions on its own, flag impression-only (view-through) ones it never saw as unverified, and see which people carry BOTH click IDs — the cross-platform overlap neither platform can detect.',
    'Platforms cannot deduplicate each other — only a person-level layer can. CRM (closed-won) is the downstream revenue ground truth.',
  ];

  return { perPlatform, overlap, pixelOnly, uniqueFromAds, pixelVerified, truth,
    otherSources, narrative, methodology, asOf: 'last run 14:05 · hourly' };
}
