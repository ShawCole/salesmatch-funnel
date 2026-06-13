import { useMemo, useState } from 'react';
import { Users, Building2 } from 'lucide-react';
import { Card, CardHeader, CardBody, Segmented, Badge } from '../ui/primitives';
import { TrendChart } from '../ui/charts';
import { useDashboard } from '../state/dashboard';
import { getNode, ROLE_ROOT, rollup } from '../data/orgMock';
import { buildSeries } from '../data/seriesMock';
import {
  PEOPLE_BASE, MARKETING_BASE, PLATFORM_ORDER, PLATFORMS, ATTRIBUTION_PRESETS,
  splitAbs, fmt, WHO_GROUPS, type Stage, type PlatformKey, type FunnelMode,
} from '../data/funnelMock';

export function FunnelView({ mode }: { mode: FunnelMode }) {
  const { role, drillIds, channel, model, days, compare } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const scale = scope.kind === 'tenant' ? (scope.scale ?? 1) : rollup(scope).converted / 420;

  const [drill, setDrill] = useState<'who' | 'source'>(mode === 'people' ? 'who' : 'source');
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const base = mode === 'people' ? PEOPLE_BASE : MARKETING_BASE;
  const convKey = mode === 'people' ? 'converted' : 'form';
  const stages: Stage[] = useMemo(() => base.map((s) => ({
    ...s,
    count: Math.max(1, Math.round(s.count * scale)),
    split: mode === 'marketing' && s.key === convKey ? ATTRIBUTION_PRESETS[model] : s.split,
  })), [base, scale, mode, model, convKey]);

  const defaultStage = stages.find((s) => s.key === convKey) ?? stages[stages.length - 1];
  const sel = activeStage ? stages.find((s) => s.key === activeStage) ?? defaultStage : defaultStage;
  const trend = useMemo(() => buildSeries(`funnel:${mode}:${sel.key}`, days, sel.count / days, 0.16, scope.id), [mode, sel.key, sel.count, days, scope.id]);
  const showCompare = compare !== 'none';

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* header row */}
      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          {mode === 'people'
            ? <><Users size={15} style={{ color: 'var(--accent)' }} /> Deterministic, person-level — every stage resolved by the ArkData pixel.</>
            : <><Building2 size={15} style={{ color: 'var(--accent)' }} /> Aggregate, platform-reported — credit split by the <b className="text-foreground">{model}</b> model.</>}
        </div>
        {mode === 'people' && (
          <Segmented<'who' | 'source'> size="sm" value={drill} onChange={setDrill} options={[{ key: 'who', label: 'Who' }, { key: 'source', label: 'Source' }]} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* funnel */}
        <Card className="rise lg:col-span-2" accentTop style={{ animationDelay: '60ms' }}>
          <CardHeader title={mode === 'people' ? 'People funnel' : 'Marketing funnel'} sub="Click a stage to inspect" />
          <CardBody className="space-y-2">
            {stages.map((s, i) => {
              const prev = i > 0 ? stages[i - 1].count : s.count;
              const conv = i > 0 ? ((s.count / prev) * 100) : 100;
              const active = sel.key === s.key;
              return (
                <button key={s.key} onClick={() => setActiveStage(s.key)} className="block w-full text-left">
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>{s.icon}</span>{s.name}
                      {s.pixel && <Badge tone="accent">pixel</Badge>}
                      {s.firstParty && <Badge tone="muted">1st-party</Badge>}
                    </span>
                    <span className="tnum text-muted-foreground">{i > 0 && <span className="mr-2">{conv.toFixed(1)}%</span>}<b className="text-foreground">{fmt(s.count)}</b></span>
                  </div>
                  <div className={`relative h-9 overflow-hidden rounded-lg bg-muted transition-all ${active ? 'ring-2' : ''}`} style={active ? { boxShadow: `0 0 0 2px var(--accent)` } : undefined}>
                    <StageSplit stage={s} />
                  </div>
                </button>
              );
            })}
          </CardBody>
        </Card>

        {/* drill panel */}
        <Card className="rise" style={{ animationDelay: '120ms' }}>
          <CardHeader title={sel.name} sub={sel.desc} />
          <CardBody className="space-y-4">
            <div>
              <div className="tnum text-[30px] font-semibold leading-none">{fmt(sel.count)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">in this stage · last {days} days</div>
            </div>
            <TrendChart points={trend.points} showCompare={showCompare} height={120} />
            <div className="border-t border-border pt-3">
              {mode === 'people' && drill === 'who'
                ? <WhoBreakdown />
                : <SourceBreakdown stage={sel} channel={channel} />}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StageSplit({ stage }: { stage: Stage }) {
  const abs = splitAbs(stage);
  const total = PLATFORM_ORDER.reduce((a, p) => a + abs[p], 0);
  if (stage.firstParty || total === 0) {
    return <div className="h-full rounded-lg" style={{ width: `${Math.max(stage.barWidth, 6)}%`, background: `linear-gradient(90deg, ${stage.tint}cc, ${stage.tint})` }} />;
  }
  return (
    <div className="flex h-full rounded-lg" style={{ width: `${Math.max(stage.barWidth, 6)}%` }}>
      {PLATFORM_ORDER.filter((p) => abs[p] > 0).map((p) => (
        <div key={p} className="h-full first:rounded-l-lg last:rounded-r-lg" style={{ width: `${(abs[p] / total) * 100}%`, background: PLATFORMS[p].color }} title={`${PLATFORMS[p].name}: ${fmt(abs[p])}`} />
      ))}
    </div>
  );
}

function SourceBreakdown({ stage, channel }: { stage: Stage; channel: PlatformKey | 'all' }) {
  const abs = splitAbs(stage);
  const total = PLATFORM_ORDER.reduce((a, p) => a + abs[p], 0);
  const rows = PLATFORM_ORDER.filter((p) => abs[p] > 0 && (channel === 'all' || channel === p)).sort((a, b) => abs[b] - abs[a]);
  if (total === 0) return <p className="text-[12px] text-muted-foreground">First-party list — no ad-platform source.</p>;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">By source</div>
      {rows.map((p) => (
        <div key={p} className="flex items-center gap-2">
          <span className="w-16 text-[12px] text-muted-foreground">{PLATFORMS[p].name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(abs[p] / total) * 100}%`, background: PLATFORMS[p].color }} /></div>
          <span className="tnum w-12 text-right text-[12px] font-medium">{fmt(abs[p])}</span>
        </div>
      ))}
    </div>
  );
}

function WhoBreakdown() {
  return (
    <div className="space-y-3">
      {WHO_GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</div>
          <div className="space-y-1.5">
            {g.items.map((it) => (
              <div key={it.label} className="flex items-center gap-2">
                <span className="w-20 truncate text-[12px] text-muted-foreground">{it.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${it.pct}%`, background: 'var(--accent)' }} /></div>
                <span className="tnum w-9 text-right text-[12px] font-medium">{it.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
