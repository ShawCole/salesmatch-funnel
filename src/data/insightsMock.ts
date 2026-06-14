// AI Insights — "what changed and why", grounded in the dashboard's own data.
// Each insight is derived (not random) from the org tree, reconciliation, the
// attribution model deltas, and the UTM layer, then framed with a recommended
// action — the pattern every market leader ships ("alerts that carry an action").
import { getNode, leafTenants, rollup, ROLE_ROOT, type Role } from './orgMock';
import { buildReconciliation } from './reconciliationMock';
import { biggestSwing } from './attributionMock';
import { campaignBreakdown, utmResolvedOnly } from './utmMock';
import { fmtMoney, fmt } from './funnelMock';

export type InsightKind = 'risk' | 'opportunity' | 'win' | 'anomaly';
export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
  metric?: string;
  deltaPct?: number;
  invertDelta?: boolean;
  action: string;
  confidence: number;   // 0-100
}

export const KIND_META: Record<InsightKind, { label: string; color: string }> = {
  risk:        { label: 'Risk',        color: '#ef4444' },
  opportunity: { label: 'Opportunity', color: '#7c3aed' },
  win:         { label: 'Win',         color: '#10b981' },
  anomaly:     { label: 'Anomaly',     color: '#f59e0b' },
};

export function buildInsights(role: Role, drillIds: string[]): Insight[] {
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const scale = scope.kind === 'tenant' ? (scope.scale ?? 1) : Math.max(0.6, rollup(scope).converted / 420);
  const tenants = leafTenants(scope);
  const recon = buildReconciliation(scale);
  const out: Insight[] = [];

  // 1. over-attribution (reconciliation)
  const meta = recon.perPlatform.find((p) => p.platform === 'meta');
  if (meta) out.push({
    id: 'over-attr-meta', kind: 'risk',
    title: `Meta is over-claiming by ${meta.overClaimPct}%`,
    detail: `Meta reports ${fmt(meta.claimed)} conversions; the pixel verifies ${fmt(meta.verified)}. The gap is view-through + unmatched traffic you can't bank on.`,
    metric: `${fmt(meta.claimed)} → ${fmt(meta.verified)}`, deltaPct: -meta.overClaimPct, invertDelta: true,
    action: 'Review Meta in-platform goals', confidence: 96,
  });

  // 2. declining tenant
  const worst = [...tenants].sort((a, b) => (a.trendPct ?? 0) - (b.trendPct ?? 0))[0];
  if (worst && (worst.trendPct ?? 0) < 0) out.push({
    id: `decline-${worst.id}`, kind: 'risk',
    title: `${worst.name} conversions down ${Math.abs(worst.trendPct ?? 0)}% WoW`,
    detail: `Trailing the portfolio. The drop concentrates in paid-social — likely creative fatigue on the retargeting set.`,
    metric: 'WoW', deltaPct: worst.trendPct ?? 0,
    action: 'Flag for creative refresh', confidence: 82,
  });

  // 3. scaling opportunity (best tenant)
  const best = [...tenants].sort((a, b) => (b.trendPct ?? 0) - (a.trendPct ?? 0))[0];
  if (best && (best.trendPct ?? 0) > 0) out.push({
    id: `scale-${best.id}`, kind: 'opportunity',
    title: `${best.name} is pacing +${best.trendPct}% — your fastest mover`,
    detail: `CVR and verified conversions are both climbing. Headroom to scale spend before efficiency decays.`,
    metric: 'WoW', deltaPct: best.trendPct ?? 0,
    action: 'Propose +20% budget', confidence: 88,
  });

  // 4. UTM-resolved / owned channels (opportunity + wedge)
  const resolved = utmResolvedOnly(campaignBreakdown(Math.round(420 * scale)));
  out.push({
    id: 'utm-owned', kind: 'opportunity',
    title: `${fmt(resolved.total)} conversions came from sources the platforms can't see`,
    detail: `Email, partner and organic resolved by UTM (no click-ID). These are cheaper than paid and currently under-invested.`,
    metric: 'UTM-resolved', deltaPct: 21,
    action: 'Expand owned + partner mix', confidence: 79,
  });

  // 5. attribution model shift (anomaly)
  const swing = biggestSwing('last', 'data_driven');
  if (swing && swing.delta !== 0) out.push({
    id: 'model-shift', kind: 'anomaly',
    title: `Data-driven would shift ${Math.abs(swing.delta)}% of credit ${swing.delta > 0 ? 'to' : 'from'} ${swing.name}`,
    detail: `Your last-touch view under-credits assisting channels. Mid-funnel touches are doing more work than last-click suggests.`,
    metric: swing.name, deltaPct: swing.delta,
    action: 'Switch default model', confidence: 74,
  });

  // 6. pixel-only win
  out.push({
    id: 'pixel-only-win', kind: 'win',
    title: `${fmt(recon.pixelOnly)} conversions recovered that no platform claimed`,
    detail: `Dark-social and direct visits the pixel caught via UTM — pure upside that ad platforms attribute to "direct" or miss entirely.`,
    metric: 'recovered', deltaPct: 6,
    action: 'See reconciliation', confidence: 91,
  });

  // 7. spend efficiency (anomaly)
  const m = rollup(scope);
  const cpa = m.converted ? Math.round(m.spendCents / m.converted) : 0;
  out.push({
    id: 'cpa-watch', kind: 'anomaly',
    title: `Blended CPA holding at ${fmtMoney(cpa)}`,
    detail: `Within band, but DSP is running ~2.3× the account average with thin verified volume — trim to protect efficiency.`,
    metric: 'CPA', deltaPct: -3, invertDelta: true,
    action: 'Audit DSP line items', confidence: 70,
  });

  return out;
}
