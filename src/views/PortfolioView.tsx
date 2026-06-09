import {
  rollup, rollupSpark, alertsFor, leafTenants,
  CHILD_KIND_LABEL, ROLE_LABEL, type OrgNode,
} from '../data/orgMock';
import { fmt, fmtMoney } from '../data/funnelMock';
import { Sparkline } from '../components/Sparkline';

interface PortfolioViewProps {
  node: OrgNode;
  onDrill: (id: string) => void;
}

export function PortfolioView({ node, onDrill }: PortfolioViewProps) {
  const agg = rollup(node);
  const spark = rollupSpark(node);
  const alerts = alertsFor(node);
  const children = node.children ?? [];
  const tenantCount = leafTenants(node).length;

  const sparkFirst = (spark[0] + spark[1] + spark[2]) / 3;
  const sparkLast = (spark[11] + spark[12] + spark[13]) / 3;
  const aggTrend = Math.round((sparkLast - sparkFirst) / (sparkFirst || 1) * 100);

  const kpis = [
    { label: 'Total Spend', value: fmtMoney(agg.spendCents) },
    { label: 'Impressions', value: fmt(agg.impressions) },
    { label: 'Visitors', value: fmt(agg.visitors) },
    { label: 'Converted', value: fmt(agg.converted) },
    { label: 'Booked', value: fmt(agg.booked) },
    { label: 'Closed', value: fmt(agg.closed) },
  ];

  return (
    <div className="min-h-full bg-[#030712] text-[#e8e8ec]"
      style={{ backgroundImage: 'radial-gradient(1200px 600px at 80% -10%,rgba(124,58,237,.10),transparent),radial-gradient(900px 500px at 0% 100%,rgba(20,184,166,.06),transparent)' }}>
      <div className="mx-auto max-w-[1340px] px-5 pt-5 pb-20">

        {/* HEADER */}
        <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#5b626f]">
              <span className="rounded bg-white/[0.06] px-2 py-0.5" style={{ color: node.color }}>{ROLE_LABEL[node.kind]}</span>
              portfolio roll-up
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">{node.name}</h1>
            <p className="mt-0.5 text-[11px] text-[#9aa0ad]">
              {children.length} {CHILD_KIND_LABEL[node.kind].toLowerCase()} · {tenantCount} client{tenantCount === 1 ? '' : 's'} · blended performance below, drill into any row
            </p>
          </div>
          <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5">
            <Sparkline data={spark} width={140} height={36} color={aggTrend >= 0 ? '#10b981' : '#fb7185'} />
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#5b626f]">Conv. trend 14d</div>
              <div className={`text-[13px] font-extrabold ${aggTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{aggTrend >= 0 ? '▲' : '▼'} {Math.abs(aggTrend)}%</div>
            </div>
          </div>
        </header>

        {/* AGGREGATE KPIs */}
        <div className="mb-[18px] grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="glass rounded-2xl px-3.5 py-[13px]">
              <div className="mb-[7px] text-[9.5px] font-semibold uppercase tracking-[0.07em] text-[#9aa0ad]">{k.label}</div>
              <div className="text-[19px] font-extrabold tabular-nums tracking-tight">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          {/* CHILD CARDS */}
          <div>
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#9aa0ad]">{CHILD_KIND_LABEL[node.kind]}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {children.map((c) => {
                const m = rollup(c);
                const cs = rollupSpark(c);
                const tc = leafTenants(c).length;
                const trend = c.trendPct ?? aggForTrend(cs);
                return (
                  <button key={c.id} onClick={() => onDrill(c.id)}
                    className="glass group rounded-2xl p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[13px] font-bold">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[#5b626f]">
                          {ROLE_LABEL[c.kind]}{c.kind !== 'tenant' ? ` · ${tc} client${tc === 1 ? '' : 's'}` : ''}
                        </div>
                      </div>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                      </span>
                    </div>

                    <div className="mb-3 flex items-end justify-between gap-2">
                      <div className="grid grid-cols-3 gap-3">
                        <Metric label="Spend" value={fmtMoney(m.spendCents)} />
                        <Metric label="Converted" value={fmt(m.converted)} />
                        <Metric label="Closed" value={fmt(m.closed)} />
                      </div>
                      <Sparkline data={cs} width={96} height={30} color={c.color} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#5b626f]">
                      <span>{fmt(m.impressions)} impressions · {fmt(m.visitors)} visitors</span>
                      <span className="font-semibold text-purple-300 opacity-0 transition group-hover:opacity-100">Open →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ALERTS / NOTICES */}
          <aside>
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#9aa0ad]">Notices &amp; suggestions</div>
            <div className="glass flex flex-col gap-2 rounded-2xl p-3">
              {alerts.length === 0 && <div className="px-1 py-4 text-center text-[11px] text-[#5b626f]">All clear — no flags.</div>}
              {alerts.map((a, i) => (
                <div key={i} className={`rounded-xl border px-3 py-2.5 ${
                  a.severity === 'good' ? 'border-emerald-500/20 bg-emerald-500/[0.07]'
                  : a.severity === 'bad' ? 'border-rose-500/20 bg-rose-500/[0.07]'
                  : 'border-amber-400/20 bg-amber-400/[0.07]'}`}>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold">
                    <span>{a.severity === 'good' ? '▲' : a.severity === 'bad' ? '▼' : '⚠'}</span>
                    {a.tenant}
                  </div>
                  <div className="mt-0.5 text-[10.5px] leading-snug text-[#9aa0ad]">{a.text}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-[#5b626f]">{label}</div>
      <div className="text-[14px] font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function aggForTrend(spark: number[]): number {
  const f = (spark[0] + spark[1] + spark[2]) / 3;
  const l = (spark[11] + spark[12] + spark[13]) / 3;
  return Math.round((l - f) / (f || 1) * 100);
}
