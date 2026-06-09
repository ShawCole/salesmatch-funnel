// Mock multi-tenant org hierarchy for the role-based views.
// admin (ArkData) > meta_partner > partner > tenant
// Each tenant carries metrics + a sparkline; parents roll up their descendants.

export type Role = 'admin' | 'meta_partner' | 'partner' | 'tenant';

export interface Metrics {
  spendCents: number;
  impressions: number;
  clicks: number;
  visitors: number;
  converted: number;
  booked: number;
  closed: number;
}

export interface OrgNode {
  id: string;
  name: string;
  kind: Role;
  color: string;
  children?: OrgNode[];
  /** leaf (tenant) only */
  scale?: number;
  metrics?: Metrics;
  spark?: number[];     // 14-pt conversions trend
  trendPct?: number;    // WoW % derived from spark
}

// deterministic PRNG so sparklines are stable across renders
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function metricsFor(scale: number): Metrics {
  const clicks = Math.round(12400 * scale);
  return {
    spendCents: clicks * 85,
    impressions: Math.round(892000 * scale),
    clicks,
    visitors: Math.round(3180 * scale),
    converted: Math.round(420 * scale),
    booked: Math.round(96 * scale),
    closed: Math.round(38 * scale),
  };
}

function sparkFor(seed: number, dir: number): { spark: number[]; trendPct: number } {
  const rnd = mulberry32(seed);
  const pts: number[] = [];
  let v = 40 + rnd() * 30;
  for (let i = 0; i < 14; i++) {
    v = Math.max(8, v + dir * (rnd() * 6 - 1.5) + (rnd() * 8 - 4));
    pts.push(Math.round(v));
  }
  const firstAvg = (pts[0] + pts[1] + pts[2]) / 3;
  const lastAvg = (pts[11] + pts[12] + pts[13]) / 3;
  const trendPct = Math.round((lastAvg - firstAvg) / firstAvg * 100);
  return { spark: pts, trendPct };
}

let seedCounter = 1;
function tenant(id: string, name: string, color: string, scale: number, dir: number): OrgNode {
  const { spark, trendPct } = sparkFor(seedCounter++ * 97, dir);
  return { id, name, kind: 'tenant', color, scale, metrics: metricsFor(scale), spark, trendPct };
}

// ---- the tree ----
export const ORG: OrgNode = {
  id: 'arkdata', name: 'ArkData', kind: 'admin', color: '#a855f7',
  children: [
    {
      id: 'apex', name: 'Apex Agency Network', kind: 'meta_partner', color: '#8b5cf6',
      children: [
        {
          id: 'fastfund', name: 'Fast Fund Leads', kind: 'partner', color: '#6366f1',
          children: [
            tenant('sales-match', 'Sales Match', '#6366f1', 1.0, 1.2),
            tenant('hirewell', 'HireWell', '#10b981', 0.6, 0.6),
            tenant('talentforge', 'TalentForge', '#f59e0b', 0.45, -0.8),
          ],
        },
        {
          id: 'growthlab', name: 'GrowthLab', kind: 'partner', color: '#0ea5e9',
          children: [
            tenant('northwind', 'Northwind', '#3b82f6', 0.8, 0.9),
            tenant('brightpath', 'BrightPath', '#ec4899', 0.5, -0.4),
          ],
        },
      ],
    },
    {
      id: 'meridian', name: 'Meridian Holdings', kind: 'meta_partner', color: '#14b8a6',
      children: [
        {
          id: 'vertex', name: 'Vertex Media', kind: 'partner', color: '#ef4444',
          children: [
            tenant('acme', 'Acme Growth', '#22d3ee', 0.7, 1.5),
            tenant('cobalt', 'Cobalt Co', '#a3e635', 0.55, 0.2),
          ],
        },
      ],
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin', meta_partner: 'Meta-Partner', partner: 'Partner', tenant: 'Tenant',
};

export const ROLE_ROOT: Record<Role, string> = {
  admin: 'arkdata', meta_partner: 'apex', partner: 'fastfund', tenant: 'sales-match',
};

export const CHILD_KIND_LABEL: Record<Role, string> = {
  admin: 'Meta-Partners', meta_partner: 'Partners', partner: 'Clients', tenant: 'Pipelines',
};

// ---- lookups + rollups ----
const INDEX = new Map<string, OrgNode>();
const PARENT = new Map<string, OrgNode | null>();
(function index(node: OrgNode, parent: OrgNode | null) {
  INDEX.set(node.id, node);
  PARENT.set(node.id, parent);
  node.children?.forEach((c) => index(c, node));
})(ORG, null);

export function getNode(id: string): OrgNode | undefined {
  return INDEX.get(id);
}

export function pathTo(id: string): OrgNode[] {
  const out: OrgNode[] = [];
  let cur: OrgNode | undefined = INDEX.get(id);
  while (cur) {
    out.unshift(cur);
    cur = PARENT.get(cur.id) ?? undefined;
  }
  return out;
}

export function leafTenants(node: OrgNode): OrgNode[] {
  if (node.kind === 'tenant') return [node];
  return (node.children ?? []).flatMap(leafTenants);
}

export function rollup(node: OrgNode): Metrics {
  if (node.metrics) return node.metrics;
  const acc: Metrics = { spendCents: 0, impressions: 0, clicks: 0, visitors: 0, converted: 0, booked: 0, closed: 0 };
  for (const t of leafTenants(node)) {
    const m = t.metrics!;
    acc.spendCents += m.spendCents; acc.impressions += m.impressions; acc.clicks += m.clicks;
    acc.visitors += m.visitors; acc.converted += m.converted; acc.booked += m.booked; acc.closed += m.closed;
  }
  return acc;
}

/** aggregate sparkline for a node (sum of descendant tenant sparks) */
export function rollupSpark(node: OrgNode): number[] {
  const tenants = leafTenants(node);
  return Array.from({ length: 14 }, (_, i) => tenants.reduce((s, t) => s + (t.spark?.[i] ?? 0), 0));
}

export interface Alert {
  severity: 'good' | 'warn' | 'bad';
  tenant: string;
  text: string;
}

/** notices derived from descendant tenant performance */
export function alertsFor(node: OrgNode): Alert[] {
  const out: Alert[] = [];
  for (const t of leafTenants(node)) {
    const tp = t.trendPct ?? 0;
    if (tp >= 15) out.push({ severity: 'good', tenant: t.name, text: `conversions up ${tp}% WoW — scale spend` });
    else if (tp <= -10) out.push({ severity: 'bad', tenant: t.name, text: `conversions down ${Math.abs(tp)}% WoW — review creative` });
    const m = t.metrics!;
    const ctr = m.clicks / m.impressions * 100;
    if (ctr < 1.3) out.push({ severity: 'warn', tenant: t.name, text: `CTR ${ctr.toFixed(2)}% below 1.3% benchmark` });
  }
  return out.slice(0, 5);
}
