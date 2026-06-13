import { useMemo } from 'react';
import { Card, CardHeader, CardBody, Badge } from '../ui/primitives';
import { useDashboard } from '../state/dashboard';
import { getNode, ROLE_ROOT, rollup } from '../data/orgMock';
import { PLATFORMS, PLATFORM_ORDER, fmt, type PlatformKey } from '../data/funnelMock';

// multi-touch journeys: which channel sequences convert, and how often.
const PATH_SHAPES: { seq: PlatformKey[]; share: number }[] = [
  { seq: ['meta', 'google'], share: 24 },
  { seq: ['google'], share: 18 },
  { seq: ['meta', 'linkedin', 'google'], share: 15 },
  { seq: ['linkedin', 'email'], share: 12 },
  { seq: ['meta'], share: 11 },
  { seq: ['google', 'email'], share: 9 },
  { seq: ['meta', 'google', 'email'], share: 7 },
  { seq: ['dsp', 'meta'], share: 4 },
];

export function Paths() {
  const { role, drillIds } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const total = scope.kind === 'tenant' ? Math.round(420 * (scope.scale ?? 1)) : rollup(scope).converted;

  const paths = useMemo(() => PATH_SHAPES.map((p) => ({ ...p, count: Math.round((total * p.share) / 100) })), [total]);
  const maxShare = Math.max(...paths.map((p) => p.share));

  // sankey: first-touch channel → last-touch channel
  const sankey = useMemo(() => buildSankey(paths), [paths]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="rise rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground">
        <b className="text-foreground">{fmt(total)} converting journeys</b> across multi-touch paths. Most conversions take <b className="text-foreground">2+ touches</b> — single-touch attribution misses the assist.
      </div>

      <Card className="rise" accentTop style={{ animationDelay: '60ms' }}>
        <CardHeader title="First touch → last touch" sub="Flow width = converting volume" />
        <CardBody><Sankey data={sankey} /></CardBody>
      </Card>

      <Card className="rise" style={{ animationDelay: '140ms' }}>
        <CardHeader title="Top converting paths" sub="Channel sequence → conversion" />
        <CardBody className="space-y-2">
          {paths.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex w-[260px] flex-shrink-0 items-center gap-1">
                {p.seq.map((c, j) => (
                  <span key={j} className="flex items-center gap-1">
                    {j > 0 && <span className="text-muted-foreground">→</span>}
                    <span className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ background: PLATFORMS[c].color }}>{PLATFORMS[c].name}</span>
                  </span>
                ))}
                {p.seq.length === 1 && <Badge tone="muted">single-touch</Badge>}
              </div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(p.share / maxShare) * 100}%`, background: 'var(--accent)' }} /></div>
              <span className="tnum w-20 flex-shrink-0 text-right text-[12px]"><b>{fmt(p.count)}</b> <span className="text-muted-foreground">({p.share}%)</span></span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

interface SankeyData { left: { key: PlatformKey; value: number }[]; right: { key: PlatformKey; value: number }[]; links: { from: PlatformKey; to: PlatformKey; value: number }[]; total: number; }
function buildSankey(paths: { seq: PlatformKey[]; share: number }[]): SankeyData {
  const leftMap = new Map<PlatformKey, number>();
  const rightMap = new Map<PlatformKey, number>();
  const linkMap = new Map<string, number>();
  for (const p of paths) {
    const from = p.seq[0]; const to = p.seq[p.seq.length - 1];
    leftMap.set(from, (leftMap.get(from) ?? 0) + p.share);
    rightMap.set(to, (rightMap.get(to) ?? 0) + p.share);
    const k = `${from}|${to}`;
    linkMap.set(k, (linkMap.get(k) ?? 0) + p.share);
  }
  const order = (m: Map<PlatformKey, number>) => PLATFORM_ORDER.filter((p) => m.has(p)).map((key) => ({ key, value: m.get(key)! }));
  const links = [...linkMap.entries()].map(([k, value]) => { const [from, to] = k.split('|') as [PlatformKey, PlatformKey]; return { from, to, value }; });
  return { left: order(leftMap), right: order(rightMap), links, total: 100 };
}

function Sankey({ data }: { data: SankeyData }) {
  const W = 760, H = 320, pad = 18, nodeW = 12, gap = 8;
  const colX = { left: pad, right: W - pad - nodeW };
  const scale = (H - pad * 2 - gap * Math.max(data.left.length, data.right.length)) / data.total;

  const place = (nodes: { key: PlatformKey; value: number }[]) => {
    let y = pad; const pos = new Map<PlatformKey, { y0: number; y1: number; cursor: number }>();
    for (const n of nodes) { const h = Math.max(6, n.value * scale); pos.set(n.key, { y0: y, y1: y + h, cursor: y }); y += h + gap; }
    return pos;
  };
  const lp = place(data.left), rp = place(data.right);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 520 }}>
        {/* links */}
        {data.links.map((lnk, i) => {
          const l = lp.get(lnk.from)!, r = rp.get(lnk.to)!;
          const h = lnk.value * scale;
          const y0 = l.cursor, y1 = r.cursor; l.cursor += h; r.cursor += h;
          const x0 = colX.left + nodeW, x1 = colX.right;
          const xm = (x0 + x1) / 2;
          const d = `M${x0},${y0 + h / 2} C${xm},${y0 + h / 2} ${xm},${y1 + h / 2} ${x1},${y1 + h / 2}`;
          return <path key={i} d={d} fill="none" stroke={PLATFORMS[lnk.from].color} strokeOpacity={0.32} strokeWidth={Math.max(1.5, h)} />;
        })}
        {/* nodes */}
        {data.left.map((n) => { const p = lp.get(n.key)!; return (
          <g key={`l${n.key}`}>
            <rect x={colX.left} y={p.y0} width={nodeW} height={p.y1 - p.y0} rx={3} fill={PLATFORMS[n.key].color} />
            <text x={colX.left + nodeW + 6} y={(p.y0 + p.y1) / 2} dominantBaseline="middle" fontSize={11} fill="hsl(var(--foreground))">{PLATFORMS[n.key].name}</text>
          </g>
        ); })}
        {data.right.map((n) => { const p = rp.get(n.key)!; return (
          <g key={`r${n.key}`}>
            <rect x={colX.right} y={p.y0} width={nodeW} height={p.y1 - p.y0} rx={3} fill={PLATFORMS[n.key].color} />
            <text x={colX.right - 6} y={(p.y0 + p.y1) / 2} dominantBaseline="middle" textAnchor="end" fontSize={11} fill="hsl(var(--foreground))">{PLATFORMS[n.key].name}</text>
          </g>
        ); })}
        <text x={colX.left} y={10} fontSize={10} fill="hsl(var(--muted-foreground))">FIRST TOUCH</text>
        <text x={colX.right + nodeW} y={10} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">LAST TOUCH</text>
      </svg>
    </div>
  );
}
