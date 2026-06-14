import { useMemo, useState } from 'react';
import { FlaskConical, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, Button } from '../ui/primitives';
import { KpiCard } from '../ui/KpiCard';
import { DataTable, type Column } from '../ui/DataTable';
import { ChannelLines } from '../ui/charts';
import { EXPERIMENTS, EXP_TYPE_LABEL, expSummary, liftSeries, PLATFORMS, type Experiment, type ExpStatus } from '../data/experimentsMock';
import { fmt } from '../data/funnelMock';

const STATUS_TONE: Record<ExpStatus, 'success' | 'accent' | 'muted'> = { complete: 'success', running: 'accent', paused: 'muted' };

export function Experiments() {
  const sum = useMemo(() => expSummary(), []);
  const [featuredId, setFeaturedId] = useState('e1');
  const featured = EXPERIMENTS.find((e) => e.id === featuredId) ?? EXPERIMENTS[0];
  const series = useMemo(() => liftSeries(featured), [featured]);

  const columns: Column<Experiment>[] = [
    { key: 'name', header: 'Experiment', sortVal: (r) => r.name, className: 'whitespace-nowrap', render: (r) => (
      <button onClick={() => setFeaturedId(r.id)} className="flex items-center gap-2 text-left hover:underline">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: PLATFORMS[r.channel].color }} />
        <span className="font-medium">{r.name}</span>
      </button>
    ) },
    { key: 'type', header: 'Method', sortVal: (r) => r.type, render: (r) => <Badge tone="muted">{EXP_TYPE_LABEL[r.type]}</Badge> },
    { key: 'lift', header: 'Incr. lift', align: 'right', sortVal: (r) => r.liftPct, render: (r) => <b style={{ color: 'hsl(var(--success))' }}>+{r.liftPct}%</b> },
    { key: 'incr', header: 'Incr. conv.', align: 'right', sortVal: (r) => r.incrementalConv, render: (r) => fmt(r.incrementalConv) },
    { key: 'iroas', header: 'iROAS', align: 'right', sortVal: (r) => r.iroas, render: (r) => `${r.iroas.toFixed(1)}×` },
    { key: 'sig', header: 'Significance', align: 'right', sortVal: (r) => r.significance, render: (r) => (
      <span className={r.significance >= 90 ? 'font-semibold' : ''} style={{ color: r.significance >= 90 ? 'hsl(var(--success))' : undefined }}>{r.significance}%</span>
    ) },
    { key: 'status', header: 'Status', align: 'right', sortVal: (r) => r.status, render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
  ];

  const incrPct = featured.observedConv ? Math.round((featured.incrementalConv / featured.observedConv) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="rise flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}><FlaskConical size={15} /></div>
        <p className="text-[13px] leading-relaxed text-foreground/90">
          Attribution says <i>who gets credit</i>; incrementality says <i>what would have happened anyway</i>. Holdout tests isolate true causal lift — across these tests, <b>{sum.wasteShare}%</b> of observed conversions were <b>non-incremental</b> (they'd have converted without the ad). Stop paying for them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rise" style={{ animationDelay: '40ms' }}><KpiCard label="Avg incremental lift" value={`+${sum.avgLift}%`} /></div>
        <div className="rise" style={{ animationDelay: '70ms' }}><KpiCard label="Incremental conv." value={fmt(sum.incremental)} compareLabel={`of ${fmt(sum.observed)} observed`} /></div>
        <div className="rise" style={{ animationDelay: '100ms' }}><KpiCard label="Non-incremental" value={`${sum.wasteShare}%`} /></div>
        <div className="rise" style={{ animationDelay: '130ms' }}><KpiCard label="Tests running" value={fmt(sum.running)} /></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rise lg:col-span-2" accentTop style={{ animationDelay: '160ms' }}>
          <CardHeader title={featured.name} sub="Treatment vs. holdout control — the gap is incremental" right={<Badge tone="accent">+{featured.liftPct}% lift · {featured.significance}% sig</Badge>} />
          <CardBody>
            <ChannelLines series={series} height={240} />
            <div className="mt-2 grid grid-cols-3 gap-3 border-t border-border pt-3 text-center">
              <div><div className="tnum text-[20px] font-semibold">{fmt(featured.observedConv)}</div><div className="text-[10.5px] text-muted-foreground">Observed</div></div>
              <div><div className="tnum text-[20px] font-semibold" style={{ color: 'hsl(var(--success))' }}>{fmt(featured.incrementalConv)}</div><div className="text-[10.5px] text-muted-foreground">Incremental ({incrPct}%)</div></div>
              <div><div className="tnum text-[20px] font-semibold">{featured.iroas.toFixed(1)}×</div><div className="text-[10.5px] text-muted-foreground">iROAS</div></div>
            </div>
          </CardBody>
        </Card>

        <Card className="rise" style={{ animationDelay: '200ms' }}>
          <CardHeader title="What incrementality catches" />
          <CardBody className="space-y-2.5 text-[12px] text-muted-foreground">
            <p><b className="text-foreground">Brand search</b> often shows low lift — those users were already converting. iROAS {EXPERIMENTS[1].iroas.toFixed(1)}×.</p>
            <p><b className="text-foreground">Retargeting</b> can look great in last-touch but holds out at +{EXPERIMENTS[0].liftPct}% true lift.</p>
            <p><b className="text-foreground">Owned (email)</b> winback shows the highest causal lift (+{EXPERIMENTS[4].liftPct}%) — under-invested.</p>
            <p className="border-t border-border pt-2 text-[11px]">Pairs with reconciliation (real people) and attribution (credit split) for the full causal picture.</p>
          </CardBody>
        </Card>
      </div>

      <Card className="rise" style={{ animationDelay: '240ms' }}>
        <CardHeader title="All experiments" sub="Click an experiment to chart it" right={<Button variant="outline"><Plus size={13} /> New test</Button>} />
        <CardBody className="px-0">
          <DataTable columns={columns} rows={EXPERIMENTS} initialSort="lift" getKey={(r) => r.id} />
        </CardBody>
      </Card>
    </div>
  );
}
