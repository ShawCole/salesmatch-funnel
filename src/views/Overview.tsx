import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody, Delta, Badge } from '../ui/primitives';
import { KpiCard } from '../ui/KpiCard';
import { TrendChart, MiniSpark } from '../ui/charts';
import { useDashboard } from '../state/dashboard';
import {
  getNode, ROLE_ROOT, rollup, leafTenants, alertsFor, CHILD_KIND_LABEL, type OrgNode,
} from '../data/orgMock';
import { buildSeries } from '../data/seriesMock';
import {
  PEOPLE_BASE, PLATFORM_ORDER, PLATFORMS, fmt, fmtMoney,
  FEED_NAMES, FEED_ROLES, FEED_COMPANIES, FEED_CITIES, rand,
} from '../data/funnelMock';
import { pickCampaign, type CampaignRow } from '../data/utmMock';
import { Link2Off } from 'lucide-react';

export function Overview({ onNavigate, onDrill }: { onNavigate: (v: 'people' | 'marketing' | 'reconciliation') => void; onDrill: (id: string) => void }) {
  const { role, drillIds, days, compare } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const isPortfolio = scope.kind !== 'tenant';
  const m = rollup(scope);
  const showCompare = compare !== 'none';

  // KPI series (seeded, stable). trend shapes drift + delta sign.
  const series = useMemo(() => ({
    spend: buildSeries('spend', days, m.spendCents / 100 / days, 0.08, scope.id),
    conv: buildSeries('conv', days, m.converted / days, 0.18, scope.id),
    verified: buildSeries('verified', days, (m.converted * 0.86) / days, 0.21, scope.id),
    booked: buildSeries('booked', days, m.booked / days, 0.12, scope.id),
    closed: buildSeries('closed', days, m.closed / days, 0.15, scope.id),
    cpa: buildSeries('cpa', days, 85, -0.06, scope.id),
  }), [m, days, scope.id]);

  const accentColor = 'var(--accent)';
  const kpis = [
    { label: 'Ad Spend', value: fmtMoney(m.spendCents), s: series.spend },
    { label: 'Conversions', value: fmt(m.converted), s: series.conv },
    { label: 'Verified (pixel)', value: fmt(Math.round(m.converted * 0.86)), s: series.verified },
    { label: 'Meetings Booked', value: fmt(m.booked), s: series.booked },
    { label: 'Closed-Won', value: fmt(m.closed), s: series.closed },
    { label: 'Cost / Conversion', value: fmtMoney(Math.round((m.spendCents) / Math.max(1, m.converted))), s: series.cpa, invert: true },
  ];

  // narrative
  const tenants = leafTenants(scope);
  const best = [...tenants].sort((a, b) => (b.trendPct ?? 0) - (a.trendPct ?? 0))[0];
  const worst = [...tenants].sort((a, b) => (a.trendPct ?? 0) - (b.trendPct ?? 0))[0];
  const topChannel = PLATFORMS[PLATFORM_ORDER[0]];
  const narrative = isPortfolio
    ? `Across ${tenants.length} ${CHILD_KIND_LABEL[scope.kind].toLowerCase()}, conversions are ${series.conv.deltaPct >= 0 ? 'up' : 'down'} ${Math.abs(series.conv.deltaPct)}% vs. the prior ${days} days. ${best?.name} is pacing fastest (${best?.trendPct! >= 0 ? '+' : ''}${best?.trendPct}% WoW); ${worst?.name} slipped ${Math.abs(worst?.trendPct ?? 0)}% — worth a creative review.`
    : `Conversions are ${series.conv.deltaPct >= 0 ? 'up' : 'down'} ${Math.abs(series.conv.deltaPct)}% vs. the prior ${days} days, with ${topChannel.name} driving the largest share. ${Math.round(m.converted * 0.86)} of ${m.converted} are pixel-verified — the rest is over-attribution to reconcile.`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* AI narrative header */}
      <div className="rise flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3" style={{ animationDelay: '0ms' }}>
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: accentColor }}>
          <Sparkles size={15} />
        </div>
        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accentColor }}>AI summary</span>
            <Badge tone="accent">beta</Badge>
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/90">{narrative}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <div key={k.label} className="rise" style={{ animationDelay: `${40 + i * 30}ms` }}>
            <KpiCard label={k.label} value={k.value} deltaPct={showCompare ? k.s.deltaPct : undefined} invertDelta={k.invert} spark={k.s.spark} sparkColor={accentColor} compareLabel={showCompare ? `vs ${fmt(k.s.prevTotal)} prior` : undefined} />
          </div>
        ))}
      </div>

      {/* main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* trend */}
        <Card className="rise lg:col-span-2" style={{ animationDelay: '220ms' }} accentTop>
          <CardHeader
            title="Conversions over time"
            sub={`Daily, last ${days} days${showCompare ? ' · dashed = prior period' : ''}`}
            right={<Delta pct={series.conv.deltaPct} />}
          />
          <CardBody><TrendChart points={series.conv.points} showCompare={showCompare} height={260} /></CardBody>
        </Card>

        {/* channels */}
        <Card className="rise" style={{ animationDelay: '260ms' }}>
          <CardHeader title="Channel contribution" sub="Share of conversions" />
          <CardBody><ChannelBars total={m.converted} /></CardBody>
        </Card>
      </div>

      {/* secondary grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {isPortfolio ? (
          <TenantTable scope={scope} onDrill={onDrill} />
        ) : (
          <Card className="rise lg:col-span-2" style={{ animationDelay: '300ms' }}>
            <CardHeader
              title="People funnel snapshot"
              sub="Person-level, pixel-verified"
              right={<button onClick={() => onNavigate('people')} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground">Open <ArrowRight size={13} /></button>}
            />
            <CardBody><FunnelMini scale={scope.scale ?? 1} /></CardBody>
          </Card>
        )}

        <NoticesAndFeed scope={scope} />
      </div>
    </div>
  );
}

/* ---------- channel contribution bars ---------- */
function ChannelBars({ total }: { total: number }) {
  const weights: Record<string, number> = { meta: 44, google: 29, linkedin: 19, email: 4, dsp: 2, tiktok: 2 };
  const sum = PLATFORM_ORDER.reduce((a, p) => a + (weights[p] || 0), 0);
  const rows = PLATFORM_ORDER.filter((p) => weights[p]).map((p) => ({ p, pct: (weights[p] / sum) * 100 })).sort((a, b) => b.pct - a.pct);
  return (
    <div className="space-y-2.5 pt-1">
      {rows.map(({ p, pct }) => (
        <div key={p} className="flex items-center gap-2">
          <span className="w-16 flex-shrink-0 text-[12px] text-muted-foreground">{PLATFORMS[p].name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PLATFORMS[p].color }} />
          </div>
          <span className="tnum w-14 flex-shrink-0 text-right text-[12px] font-medium">{fmt(Math.round((total * pct) / 100))}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- compact funnel ---------- */
function FunnelMini({ scale }: { scale: number }) {
  const stages = PEOPLE_BASE;
  return (
    <div className="space-y-1.5 pt-1">
      {stages.map((s, i) => {
        const count = Math.max(1, Math.round(s.count * scale));
        const prev = i > 0 ? Math.max(1, Math.round(stages[i - 1].count * scale)) : count;
        const conv = i > 0 ? Math.round((count / prev) * 100) : 100;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-28 flex-shrink-0 truncate text-[12px] text-muted-foreground">{s.name}</span>
            <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted">
              <div className="flex h-full items-center justify-end rounded-md px-2" style={{ width: `${Math.max(s.barWidth, 8)}%`, background: `linear-gradient(90deg, ${s.tint}cc, ${s.tint})` }}>
                <span className="tnum text-[11px] font-semibold text-white">{fmt(count)}</span>
              </div>
            </div>
            <span className="tnum w-9 flex-shrink-0 text-right text-[11px] text-muted-foreground">{i ? `${conv}%` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- portfolio tenant table ---------- */
function TenantTable({ scope, onDrill }: { scope: OrgNode; onDrill: (id: string) => void }) {
  const children = scope.children ?? [];
  return (
    <Card className="rise lg:col-span-2" style={{ animationDelay: '300ms' }}>
      <CardHeader title={CHILD_KIND_LABEL[scope.kind]} sub={`${leafTenants(scope).length} client${leafTenants(scope).length === 1 ? '' : 's'} in scope`} />
      <CardBody className="px-0">
        <div className="divide-y divide-border">
          {children.map((ch) => {
            const cm = rollup(ch);
            const spark = (leafTenants(ch)[0]?.spark) ?? [];
            const trend = leafTenants(ch).reduce((a, t) => a + (t.trendPct ?? 0), 0) / Math.max(1, leafTenants(ch).length);
            return (
              <button key={ch.id} onClick={() => onDrill(ch.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ch.color }} />
                <span className="w-36 flex-shrink-0 truncate text-[13px] font-medium">{ch.name}</span>
                <div className="hidden flex-1 sm:block"><MiniSpark data={spark} color={ch.color} width={120} height={26} /></div>
                <span className="tnum hidden w-20 text-right text-[12px] text-muted-foreground md:block">{fmt(cm.converted)} conv</span>
                <span className="tnum w-16 flex-shrink-0 text-right"><Delta pct={Math.round(trend)} /></span>
                <ArrowRight size={14} className="flex-shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------- notices + live feed ---------- */
interface FeedItem { id: number; name: string; role: string; company: string; city: string; campaign: CampaignRow; }
function NoticesAndFeed({ scope }: { scope: OrgNode }) {
  const alerts = alertsFor(scope);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const mk = (): FeedItem => ({ id: idRef.current++, name: rand(FEED_NAMES), role: rand(FEED_ROLES), company: rand(FEED_COMPANIES), city: rand(FEED_CITIES), campaign: pickCampaign() });
    setFeed(Array.from({ length: 4 }, mk));
    const t = setInterval(() => setFeed((f) => [mk(), ...f].slice(0, 6)), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <Card className="rise" style={{ animationDelay: '340ms' }}>
      <CardHeader title="Live activity" sub="Pixel-verified, real-time" right={<span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success))] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" /></span>} />
      <CardBody className="space-y-3">
        {alerts.length > 0 && (
          <div className="space-y-1.5">
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: a.severity === 'good' ? 'hsl(var(--success))' : a.severity === 'bad' ? 'hsl(var(--destructive))' : '#f59e0b' }} />
                <span className="text-muted-foreground"><b className="text-foreground">{a.tenant}</b> — {a.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-border pt-2">
          {feed.map((f, i) => (
            <div key={f.id} className={`py-1.5 ${i === 0 ? 'rise' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: f.campaign.source.color }} />
                <span className="min-w-0 flex-1 truncate text-[12px]"><b>{f.name}</b> <span className="text-muted-foreground">· {f.role} @ {f.company}</span></span>
                {!f.campaign.clickId && <Link2Off size={11} className="flex-shrink-0 text-muted-foreground" />}
              </div>
              <div className="ml-3.5 truncate font-mono text-[10px] text-muted-foreground">utm: {f.campaign.source.source}/{f.campaign.source.medium}/{f.campaign.name}</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
