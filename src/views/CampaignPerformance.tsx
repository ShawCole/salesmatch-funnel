import { useMemo } from 'react';
import { Sparkles, Zap, AlertTriangle, Pause, TrendingDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge } from '../ui/primitives';
import { KpiCard } from '../ui/KpiCard';
import { DataTable, type Column } from '../ui/DataTable';
import { MiniSpark } from '../ui/charts';
import { useDashboard } from '../state/dashboard';
import { getCampaignPerformance, type CampaignPerf, type ActionKind } from '../data/meta';
import { fmt, fmtMoney } from '../data/funnelMock';

const ACTION_STYLE: Record<ActionKind, { tone: 'success' | 'muted' | 'danger' | 'accent'; icon: typeof Zap }> = {
  scale: { tone: 'success', icon: Zap },
  watch: { tone: 'muted', icon: Minus },
  fix: { tone: 'accent', icon: AlertTriangle },
  pause: { tone: 'danger', icon: Pause },
  underspend: { tone: 'accent', icon: TrendingDown },
};
const STATUS_TONE = { active: 'success', paused: 'muted', ended: 'muted' } as const;

export function CampaignPerformance() {
  const { role, drillIds } = useDashboard();
  const { campaigns, account } = useMemo(() => getCampaignPerformance(role, drillIds), [role, drillIds]);

  const columns: Column<CampaignPerf>[] = [
    { key: 'name', header: 'Campaign', sortVal: (c) => c.name, className: 'whitespace-nowrap', render: (c) => (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: c.status === 'active' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }} />
        <div><div className="font-medium">{c.name}</div><div className="text-[10px] text-muted-foreground">{c.objective.replace(/_/g, ' ').toLowerCase()}</div></div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortVal: (c) => c.status, render: (c) => <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge> },
    { key: 'spend', header: 'Spend', align: 'right', sortVal: (c) => c.spendCents, render: (c) => fmtMoney(c.spendCents) },
    { key: 'pacing', header: 'Budget pacing', align: 'right', sortVal: (c) => c.pacingPct ?? -1, render: (c) => c.pacingPct == null ? <span className="text-muted-foreground">—</span> : (
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, c.pacingPct)}%`, background: c.pacingPct < 60 ? 'var(--accent)' : c.pacingPct > 105 ? 'hsl(var(--destructive))' : 'hsl(var(--success))' }} /></div>
        <span className="tnum w-9 text-right text-[12px]">{c.pacingPct}%</span>
      </div>
    ) },
    { key: 'conv', header: 'Conv. (verified)', align: 'right', sortVal: (c) => c.conversions, render: (c) => (
      <span><b className="tnum">{fmt(c.conversions)}</b> <span className="text-[11px] text-muted-foreground">/ {fmt(c.verifiedConversions)}</span></span>
    ) },
    { key: 'cpa', header: 'CPA vs target', align: 'right', sortVal: (c) => c.cpaCents, render: (c) => {
      const over = c.targetCpaCents != null && c.cpaCents > c.targetCpaCents;
      return (
        <div>
          <span className="tnum font-medium" style={{ color: c.targetCpaCents == null ? undefined : over ? 'hsl(var(--destructive))' : 'hsl(var(--success))' }}>{fmtMoney(c.cpaCents)}</span>
          {c.targetCpaCents != null && <span className="ml-1 text-[10px] text-muted-foreground">/ {fmtMoney(c.targetCpaCents)}</span>}
        </div>
      );
    } },
    { key: 'trend', header: 'Trend', align: 'right', render: (c) => <div className="flex justify-end"><MiniSpark data={c.spark} width={72} height={24} /></div> },
    { key: 'action', header: 'Recommended', sortVal: (c) => c.action.kind, render: (c) => {
      const s = ACTION_STYLE[c.action.kind]; const Icon = s.icon;
      return <span title={c.action.reason}><Badge tone={s.tone}><Icon size={10} /> {c.action.label}</Badge></span>;
    } },
  ];

  const topAction = campaigns.find((c) => c.action.kind === 'scale') || campaigns.find((c) => c.action.kind === 'pause' || c.action.kind === 'fix');
  const blendedCpa = account.conversions ? Math.round(account.spendCents / account.conversions) : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* narrative + source */}
      <div className="rise flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}><Sparkles size={15} /></div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Campaign performance</span>
            <Badge tone={account.source === 'live' ? 'success' : 'muted'}>{account.source === 'live' ? `live · ${account.name}` : 'sample data'}</Badge>
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/90">
            {account.activeCount} active campaigns, {fmtMoney(account.spendCents)} spent (last 30d), blended CPA {fmtMoney(blendedCpa)}. <b>{account.needsAttention}</b> need attention.
            {topAction && <> Biggest move: <b>{topAction.action.label.toLowerCase()} {topAction.name}</b> — {topAction.action.reason.toLowerCase()}</>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rise" style={{ animationDelay: '40ms' }}><KpiCard label="Spend (30d)" value={fmtMoney(account.spendCents)} /></div>
        <div className="rise" style={{ animationDelay: '70ms' }}><KpiCard label="Conversions" value={fmt(account.conversions)} compareLabel={`${fmt(account.verified)} pixel-verified`} /></div>
        <div className="rise" style={{ animationDelay: '100ms' }}><KpiCard label="Active campaigns" value={fmt(account.activeCount)} /></div>
        <div className="rise" style={{ animationDelay: '130ms' }}><KpiCard label="Need attention" value={fmt(account.needsAttention)} /></div>
      </div>

      <Card className="rise" accentTop style={{ animationDelay: '160ms' }}>
        <CardHeader title="Active campaigns" sub="Pacing, CPA vs target, and the recommended next move · click a header to sort" />
        <CardBody className="px-0">
          <DataTable columns={columns} rows={campaigns} initialSort="spend" getKey={(c) => c.id} />
        </CardBody>
      </Card>
    </div>
  );
}
