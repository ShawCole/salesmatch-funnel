// Partner payouts — the wedge. Commissions are tied to PIXEL-VERIFIED conversions
// (not platform-claimed), so partners are paid on real, deduped outcomes. No
// attribution incumbent does this; the affiliate networks do payouts but lack the
// person-level verification. Derived from the org tree.
import { ORG, getNode, rollup, leafTenants, type OrgNode } from './orgMock';

export type PayoutStatus = 'paid' | 'pending' | 'processing';
const VERIFIED_RATIO = 0.86;        // pixel-verified share of conversions
const DEAL_VALUE_CENTS = 480000;    // avg closed-won value ($4,800)

export interface PartnerTier { key: string; label: string; ratePct: number; color: string; }
export const TIERS: Record<string, PartnerTier> = {
  platinum: { key: 'platinum', label: 'Platinum', ratePct: 18, color: '#a855f7' },
  gold:     { key: 'gold',     label: 'Gold',     ratePct: 15, color: '#f59e0b' },
  silver:   { key: 'silver',   label: 'Silver',   ratePct: 12, color: '#94a3b8' },
};

// deterministic per-partner assignment
const TIER_BY_ID: Record<string, keyof typeof TIERS> = {
  fastfund: 'platinum', growthlab: 'gold', vertex: 'gold', apex: 'platinum', meridian: 'silver',
};
const STATUS_BY_ID: Record<string, PayoutStatus> = {
  fastfund: 'pending', growthlab: 'paid', vertex: 'processing', apex: 'pending', meridian: 'paid',
};

export interface PartnerPayout {
  id: string;
  name: string;
  color: string;
  kind: OrgNode['kind'];
  tier: PartnerTier;
  clients: number;
  verifiedConv: number;
  claimedConv: number;       // what platforms would have claimed (inflated)
  revenueCents: number;
  earnedCents: number;
  status: PayoutStatus;
  link: string;
  lastPayoutCents: number;
}

function slug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function toPayout(node: OrgNode): PartnerPayout {
  const m = rollup(node);
  const verifiedConv = Math.round(m.converted * VERIFIED_RATIO);
  const claimedConv = Math.round(m.converted * 1.27); // platforms over-claim
  const revenueCents = m.closed * DEAL_VALUE_CENTS;
  const tier = TIERS[TIER_BY_ID[node.id] ?? 'silver'];
  const earnedCents = Math.round(revenueCents * tier.ratePct / 100);
  const status = STATUS_BY_ID[node.id] ?? 'pending';
  return {
    id: node.id, name: node.name, color: node.color, kind: node.kind, tier,
    clients: leafTenants(node).length, verifiedConv, claimedConv, revenueCents,
    earnedCents, status,
    link: `go.arkdata.io/p/${slug(node.name)}`,
    lastPayoutCents: Math.round(earnedCents * 0.82),
  };
}

/** All partner-tier (and meta-partner) nodes under a scope. */
export function partnersInScope(scopeId: string): PartnerPayout[] {
  const scope = getNode(scopeId) ?? ORG;
  const out: PartnerPayout[] = [];
  const want: OrgNode['kind'][] = scope.kind === 'admin' ? ['meta_partner'] : scope.kind === 'meta_partner' ? ['partner'] : ['partner'];
  const walk = (n: OrgNode) => {
    if (want.includes(n.kind)) out.push(toPayout(n));
    else n.children?.forEach(walk);
  };
  if (scope.kind === 'partner') return [toPayout(scope)];
  (scope.children ?? [ORG]).forEach(walk);
  return out.sort((a, b) => b.earnedCents - a.earnedCents);
}

export interface PayoutSummary { pendingCents: number; paidCents: number; processingCents: number; activePartners: number; avgRate: number; verifiedConv: number; }
export function payoutSummary(partners: PartnerPayout[]): PayoutSummary {
  const sum = (s: PayoutStatus) => partners.filter((p) => p.status === s).reduce((a, p) => a + p.earnedCents, 0);
  return {
    pendingCents: sum('pending'),
    paidCents: sum('paid'),
    processingCents: sum('processing'),
    activePartners: partners.length,
    avgRate: partners.length ? Math.round((partners.reduce((a, p) => a + p.tier.ratePct, 0) / partners.length) * 10) / 10 : 0,
    verifiedConv: partners.reduce((a, p) => a + p.verifiedConv, 0),
  };
}

export interface LedgerEntry { id: string; partner: string; color: string; period: string; amountCents: number; status: PayoutStatus; }
export function payoutLedger(partners: PartnerPayout[]): LedgerEntry[] {
  const periods = ['May 2026', 'Apr 2026', 'Mar 2026'];
  const out: LedgerEntry[] = [];
  partners.forEach((p) => {
    periods.forEach((period, i) => {
      out.push({
        id: `${p.id}-${i}`, partner: p.name, color: p.color, period,
        amountCents: Math.round(p.earnedCents * (i === 0 ? 1 : 0.85 - i * 0.08)),
        status: i === 0 ? p.status : 'paid',
      });
    });
  });
  return out;
}
