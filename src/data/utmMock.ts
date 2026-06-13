// UTM layer. The pixel captures utm_* from the PRE-REDIRECT (previous) URL on
// every visit — so campaign/source/medium survive even when a redirect strips
// the query string. This gives a layer BELOW the ad platform (campaign → creative)
// and, crucially, resolves visits that carry NO click-ID (gclid/fbclid) at all —
// email, partner/referral, organic/dark-social — which the ad platforms can't see.
import { PLATFORMS, PLATFORM_ORDER, type PlatformKey } from './funnelMock';

export interface UtmSource {
  key: string;
  source: string;          // utm_source
  medium: string;          // utm_medium
  platform: PlatformKey | null;  // mapped ad platform (null = no ad platform)
  clickId: boolean;        // does this source carry gclid/fbclid?
  color: string;
}

// click-ID-bearing (ad platforms) + UTM-only sources the platforms can't claim
export const UTM_SOURCES: Record<string, UtmSource> = {
  google_cpc:   { key: 'google_cpc',   source: 'google',   medium: 'cpc',         platform: 'google',   clickId: true,  color: PLATFORMS.google.color },
  fb_paid:      { key: 'fb_paid',      source: 'facebook', medium: 'paid-social', platform: 'meta',     clickId: true,  color: PLATFORMS.meta.color },
  li_paid:      { key: 'li_paid',      source: 'linkedin', medium: 'paid-social', platform: 'linkedin', clickId: true,  color: PLATFORMS.linkedin.color },
  tt_paid:      { key: 'tt_paid',      source: 'tiktok',   medium: 'paid-social', platform: 'tiktok',   clickId: true,  color: PLATFORMS.tiktok.color },
  email_nl:     { key: 'email_nl',     source: 'email',    medium: 'newsletter',  platform: 'email',    clickId: false, color: PLATFORMS.email.color },
  partner_ref:  { key: 'partner_ref',  source: 'partner',  medium: 'referral',    platform: null,       clickId: false, color: '#a855f7' },
  organic_soc:  { key: 'organic_soc',  source: 'organic',  medium: 'social',      platform: null,       clickId: false, color: '#64748b' },
};

export const UTM_ORDER = ['google_cpc', 'fb_paid', 'li_paid', 'tt_paid', 'email_nl', 'partner_ref', 'organic_soc'] as const;

export interface Campaign {
  id: string;
  name: string;       // utm_campaign
  content?: string;   // utm_content (creative/variant)
  src: keyof typeof UTM_SOURCES;
  weight: number;     // relative conversion weight
}

// realistic campaign set across sources
export const CAMPAIGNS: Campaign[] = [
  { id: 'c1', name: 'q2-brand-search',     content: 'rsa-exact',     src: 'google_cpc',  weight: 22 },
  { id: 'c2', name: 'retargeting-warm',    content: 'carousel-v3',   src: 'fb_paid',     weight: 19 },
  { id: 'c3', name: 'lookalike-prospecting', content: 'video-15s',   src: 'fb_paid',     weight: 11 },
  { id: 'c4', name: 'nonbrand-intent',     content: 'rsa-broad',     src: 'google_cpc',  weight: 13 },
  { id: 'c5', name: 'abm-decision-makers', content: 'single-image',  src: 'li_paid',     weight: 12 },
  { id: 'c6', name: 'may-digest',          content: 'cta-demo',      src: 'email_nl',    weight: 8 },
  { id: 'c7', name: 'agency-coop',         content: 'partner-lp',    src: 'partner_ref', weight: 9 },
  { id: 'c8', name: 'founder-thread',      content: 'organic-post',  src: 'organic_soc', weight: 4 },
  { id: 'c9', name: 'creator-spark',       content: 'ugc-9x16',      src: 'tt_paid',     weight: 2 },
];

export interface CampaignRow extends Campaign {
  source: UtmSource;
  visits: number;
  conversions: number;
  convRate: number;
  clickId: boolean;
}

/** Campaign breakdown scaled to a tenant/portfolio scope (by total conversions). */
export function campaignBreakdown(totalConversions: number): CampaignRow[] {
  const sum = CAMPAIGNS.reduce((a, c) => a + c.weight, 0);
  return CAMPAIGNS.map((c) => {
    const source = UTM_SOURCES[c.src];
    const conversions = Math.round((totalConversions * c.weight) / sum);
    // click-ID-less sources convert a touch better (warm/owned audiences)
    const cr = source.clickId ? 2.4 + (c.weight % 5) * 0.3 : 4.1 + (c.weight % 4) * 0.4;
    const visits = Math.max(conversions, Math.round((conversions / cr) * 100));
    return { ...c, source, conversions, visits, convRate: cr, clickId: source.clickId };
  }).sort((a, b) => b.conversions - a.conversions);
}

export interface SourceAgg { key: string; source: UtmSource; conversions: number; visits: number; clickId: boolean; }
export function bySource(rows: CampaignRow[]): SourceAgg[] {
  const map = new Map<string, SourceAgg>();
  for (const r of rows) {
    const ex = map.get(r.src) ?? { key: r.src, source: r.source, conversions: 0, visits: 0, clickId: r.clickId };
    ex.conversions += r.conversions; ex.visits += r.visits;
    map.set(r.src, ex);
  }
  return [...map.values()].sort((a, b) => b.conversions - a.conversions);
}

/** Conversions resolved by UTM only — no click-ID. Invisible to the ad platforms. */
export function utmResolvedOnly(rows: CampaignRow[]): { total: number; sources: SourceAgg[] } {
  const sources = bySource(rows).filter((s) => !s.clickId);
  return { total: sources.reduce((a, s) => a + s.conversions, 0), sources };
}

// platform key → does a click-ID exist for it (for cross-referencing reconciliation)
export const PLATFORM_HAS_CLICKID: Record<PlatformKey, boolean> = {
  meta: true, google: true, linkedin: true, tiktok: true, dsp: false, email: false,
};

export function campaignFilterOptions(totalConversions = 420): { key: string; label: string }[] {
  return [{ key: 'all', label: 'All campaigns' }, ...campaignBreakdown(totalConversions).map((c) => ({ key: c.id, label: c.name }))];
}

/** weighted pick for the live feed */
export function pickCampaign(): CampaignRow {
  const rows = campaignBreakdown(420);
  const total = rows.reduce((a, r) => a + r.conversions, 0);
  let r = Math.random() * total;
  for (const row of rows) { r -= row.conversions; if (r <= 0) return row; }
  return rows[0];
}

export { PLATFORM_ORDER };
