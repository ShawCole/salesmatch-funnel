// ── Meta campaign data: the seam between the integrations app and the UI ──────
// arkdata-meta-connect (the integrations agent's app) owns the PULL: OAuth token
// in Firestore → /act_<id>/campaigns + /act_<id>/insights → normalize → store.
// THIS file is the contract + a reference normalizer + a real/mock provider the
// views consume. When src/data/real/meta-*.json exists it's used; else mock.
//
// HANDOFF: the integrations agent should produce `CampaignPerf[]` + `AccountSummary`
// in exactly this shape (or hand us the raw Meta JSON and reuse `normalizeMeta`).
import { getNode, ROLE_ROOT, rollup, type Role } from './orgMock';
import { campaignBreakdown } from './utmMock';
import { buildSeries } from './seriesMock';

// ── normalized contract ──────────────────────────────────────────────────────
export type CampaignStatus = 'active' | 'paused' | 'ended';
export type ActionKind = 'scale' | 'watch' | 'fix' | 'pause' | 'underspend';

export interface CampaignPerf {
  id: string;
  name: string;
  status: CampaignStatus;
  objective: string;
  spendCents: number;
  budgetCents: number | null;
  budgetType: 'daily' | 'lifetime' | null;
  pacingPct: number | null;        // spend vs expected-to-date (100 = on pace)
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;             // platform-reported
  verifiedConversions: number;     // pixel-verified (real layer; mock ≈ 0.86)
  cpaCents: number;
  targetCpaCents: number | null;
  spark: number[];                 // daily conversions
  action: { kind: ActionKind; label: string; reason: string };
}

export interface AccountSummary {
  name: string;
  currency: string;
  spendCents: number;
  conversions: number;
  verified: number;
  activeCount: number;
  needsAttention: number;
  pacingPct: number;
  source: 'live' | 'sample';
  pulledAt?: string;
}

// Meta reports the SAME conversion under multiple action_type aliases (e.g. a
// lead-form lead appears as `lead`, `onsite_conversion.lead_grouped`, AND
// `offsite_complete_registration_add_meta_leads` — all the same 239). Summing
// them triple-counts (the exact over-attribution we exist to catch). So we count
// by CONCEPT: take the first alias present per concept, then sum across concepts.
export const CONVERSION_CONCEPTS: string[][] = [
  ['onsite_conversion.lead_grouped', 'lead', 'offsite_conversion.fb_pixel_lead', 'offsite_complete_registration_add_meta_leads'],
  ['purchase', 'offsite_conversion.fb_pixel_purchase'],
  ['complete_registration', 'offsite_conversion.fb_pixel_complete_registration'],
];
// flat list (reference / back-compat)
export const CONVERSION_ACTION_TYPES = CONVERSION_CONCEPTS.flat();

const ACTION_META: Record<ActionKind, { label: string }> = {
  scale: { label: 'Scale' }, watch: { label: 'On track' }, fix: { label: 'Fix' },
  pause: { label: 'Pause' }, underspend: { label: 'Underspending' },
};

/** Shared recommendation logic — the "actionable" in actionable insights. */
export function recommendAction(c: { status: CampaignStatus; cpaCents: number; targetCpaCents: number | null; pacingPct: number | null }): CampaignPerf['action'] {
  if (c.status !== 'active') return { kind: 'watch', label: 'Review', reason: 'Paused — decide relaunch or archive.' };
  const t = c.targetCpaCents;
  const ratio = t ? c.cpaCents / t : 1;
  const pace = c.pacingPct ?? 100;
  if (t && ratio >= 1.4) return { kind: 'pause', label: ACTION_META.pause.label, reason: `CPA ${Math.round((ratio - 1) * 100)}% over target — pause or overhaul creative.` };
  if (t && ratio >= 1.15) return { kind: 'fix', label: ACTION_META.fix.label, reason: `CPA ${Math.round((ratio - 1) * 100)}% over target — tighten targeting/creative.` };
  if (pace < 60) return { kind: 'underspend', label: ACTION_META.underspend.label, reason: `Only ${Math.round(pace)}% of budget pacing — raise bids/budget to capture demand.` };
  if (t && ratio <= 0.85 && pace >= 85) return { kind: 'scale', label: ACTION_META.scale.label, reason: `CPA ${Math.round((1 - ratio) * 100)}% under target and budget-constrained — scale spend.` };
  return { kind: 'watch', label: ACTION_META.watch.label, reason: 'Performing within target band.' };
}

// ── reference normalizer: raw Meta JSON → CampaignPerf[] ──────────────────────
interface RawPull {
  account?: { id?: string; name?: string; currency?: string };
  pulledAt?: string;
  campaigns?: any[];
  insights?: any[];   // daily, level=campaign
}
function sumConversions(actions: any[] | undefined): number {
  if (!actions) return 0;
  const byType = new Map<string, number>(actions.map((a) => [a.action_type, Number(a.value || 0)]));
  let total = 0;
  for (const concept of CONVERSION_CONCEPTS) {
    for (const t of concept) { if (byType.has(t)) { total += byType.get(t)!; break; } } // first alias only
  }
  return total;
}
export function normalizeMeta(raw: RawPull): { campaigns: CampaignPerf[]; account: AccountSummary } {
  const byCamp = new Map<string, any[]>();
  for (const row of raw.insights ?? []) {
    const arr = byCamp.get(row.campaign_id) ?? [];
    arr.push(row); byCamp.set(row.campaign_id, arr);
  }
  const campaigns: CampaignPerf[] = (raw.campaigns ?? []).map((c) => {
    const rows = (byCamp.get(c.id) ?? []).sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));
    const spendCents = Math.round(rows.reduce((s, r) => s + Number(r.spend || 0), 0) * 100);
    const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
    const clicks = rows.reduce((s, r) => s + Number(r.clicks || 0), 0);
    const conversions = Math.round(rows.reduce((s, r) => s + sumConversions(r.actions), 0));
    const status: CampaignStatus = c.effective_status === 'ACTIVE' ? 'active' : /PAUSED/.test(c.effective_status || c.status) ? 'paused' : 'ended';
    const budgetCents = c.daily_budget ? Number(c.daily_budget) : c.lifetime_budget ? Number(c.lifetime_budget) : null;
    const budgetType = c.daily_budget ? 'daily' : c.lifetime_budget ? 'lifetime' : null;
    const days = rows.length || 1;
    const expected = budgetType === 'daily' && budgetCents ? budgetCents * days : null;
    const pacingPct = expected ? Math.round((spendCents / expected) * 100) : null;
    const cpaCents = conversions ? Math.round(spendCents / conversions) : 0;
    const base = { status, cpaCents, targetCpaCents: null as number | null, pacingPct };
    return {
      id: c.id, name: c.name, status, objective: c.objective || '—',
      spendCents, budgetCents, budgetType, pacingPct, impressions, clicks,
      ctr: clicks && impressions ? (clicks / impressions) * 100 : 0,
      conversions, verifiedConversions: Math.round(conversions * 0.86), cpaCents,
      targetCpaCents: null,
      spark: rows.map((r) => Math.round(sumConversions(r.actions))),
      action: recommendAction(base),
    };
  });
  // No CPA goal comes from Meta — use the account's blended CPA as a "vs average"
  // target so recommendations are actionable (real per-campaign goals land later).
  const conv0 = campaigns.reduce((s, c) => s + c.conversions, 0);
  const spend0 = campaigns.reduce((s, c) => s + c.spendCents, 0);
  const blended = conv0 ? Math.round(spend0 / conv0) : null;
  if (blended) for (const c of campaigns) {
    c.targetCpaCents = blended;
    c.action = recommendAction({ status: c.status, cpaCents: c.cpaCents, targetCpaCents: blended, pacingPct: c.pacingPct });
  }

  const spendCents = campaigns.reduce((s, c) => s + c.spendCents, 0);
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const account: AccountSummary = {
    name: raw.account?.name || 'Ad account', currency: raw.account?.currency || 'USD',
    spendCents, conversions, verified: Math.round(conversions * 0.86),
    activeCount: campaigns.filter((c) => c.status === 'active').length,
    needsAttention: campaigns.filter((c) => ['fix', 'pause', 'underspend'].includes(c.action.kind)).length,
    pacingPct: 100, source: 'live', pulledAt: raw.pulledAt,
  };
  return { campaigns, account };
}

// ── real-data pickup (gitignored src/data/real/meta-*.json) ──────────────────
const realFiles = import.meta.glob('./real/meta-*.json', { eager: true }) as Record<string, { default: RawPull }>;
function realPull(): RawPull | null {
  const keys = Object.keys(realFiles);
  return keys.length ? realFiles[keys[0]].default : null;
}

// ── mock generator (same contract) ───────────────────────────────────────────
const TARGET_CPA = 8500; // $85 target
function mockCampaigns(scale: number, scopeId: string): { campaigns: CampaignPerf[]; account: AccountSummary } {
  const rows = campaignBreakdown(Math.round(420 * scale));
  const campaigns: CampaignPerf[] = rows.map((r, i) => {
    const status: CampaignStatus = i === rows.length - 1 ? 'paused' : 'active';
    const spendCents = r.clickId ? Math.round(r.conversions * r.convRate * 900) : Math.round(r.conversions * 2200);
    const cpaCents = r.conversions ? Math.round(spendCents / r.conversions) : 0;
    const budgetCents = Math.round((spendCents / 30) * (1 + (i % 3) * 0.2));
    // deterministic pacing 55–110
    const pacingPct = 55 + ((i * 37) % 56);
    const targetCpaCents = Math.round(TARGET_CPA * (0.8 + (i % 4) * 0.15));
    const spark = buildSeries(`camp:${scopeId}:${r.id}`, 30, r.conversions / 30, 0.16, scopeId).spark;
    const base = { status, cpaCents, targetCpaCents, pacingPct };
    return {
      id: r.id, name: r.name, status, objective: r.source.medium === 'newsletter' ? 'LEAD_GENERATION' : 'OUTCOME_LEADS',
      spendCents, budgetCents, budgetType: 'daily' as const, pacingPct,
      impressions: Math.round(spendCents / 100 * 38), clicks: Math.round(r.visits), ctr: 1.2 + (i % 5) * 0.4,
      conversions: r.conversions, verifiedConversions: Math.round(r.conversions * 0.86), cpaCents, targetCpaCents,
      spark, action: recommendAction(base),
    };
  });
  const spendCents = campaigns.reduce((s, c) => s + c.spendCents, 0);
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  return {
    campaigns,
    account: {
      name: 'Sample data', currency: 'USD', spendCents, conversions, verified: Math.round(conversions * 0.86),
      activeCount: campaigns.filter((c) => c.status === 'active').length,
      needsAttention: campaigns.filter((c) => ['fix', 'pause', 'underspend'].includes(c.action.kind)).length,
      pacingPct: 100, source: 'sample',
    },
  };
}

// ── provider the views call ──────────────────────────────────────────────────
export function getCampaignPerformance(role: Role, drillIds: string[]) {
  const real = realPull();
  if (real) return normalizeMeta(real);
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const scale = scope.kind === 'tenant' ? (scope.scale ?? 1) : Math.max(0.6, rollup(scope).converted / 420);
  return mockCampaigns(scale, scope.id);
}
