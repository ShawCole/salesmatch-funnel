import { useMemo } from 'react';
import { buildReconciliation, type ReconciliationData } from '../data/reconciliationMock';
import { Waterfall } from '../components/Waterfall';
import { fmt } from '../data/funnelMock';

interface ReconciliationViewProps {
  /** combined pipeline × tenant scale */
  scale?: number;
}

export function ReconciliationView({ scale = 1 }: ReconciliationViewProps) {
  const data: ReconciliationData = useMemo(() => buildReconciliation(scale), [scale]);
  const { pixelVerified, platformClaimedTotal, overClaimPct, sources, reasons, narrative, asOf } = data;
  const pixelOnly = reasons.find((r) => r.tone === 'add')?.delta ?? 0;

  const kpis = [
    { label: 'Platform-claimed', value: fmt(platformClaimedTotal), tint: '#6366f1' },
    { label: '◆ Pixel-verified', value: fmt(pixelVerified), tint: '#a855f7', hero: true },
    { label: 'Over-claim', value: `${overClaimPct}%`, tint: '#fb7185' },
    { label: 'Pixel-only found', value: fmt(pixelOnly), tint: '#10b981' },
  ];

  return (
    <div>
      {/* KPI STRIP */}
      <div className="mb-[18px] grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label}
            className={`glass rounded-2xl px-3.5 py-[13px] ${k.hero ? '!border-purple-500/30' : ''}`}
            style={k.hero ? { background: 'linear-gradient(135deg,rgba(168,85,247,.14),rgba(124,58,237,.05))' } : undefined}>
            <div className={`mb-[7px] text-[9.5px] font-semibold uppercase tracking-[0.07em] ${k.hero ? 'text-[#c8a8f0]' : 'text-[#9aa0ad]'}`}>{k.label}</div>
            <div className="text-[19px] font-extrabold tabular-nums tracking-tight">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* LEFT — hero waterfall + reasons */}
        <div className="flex flex-col gap-4">
          <section className="glass rounded-2xl px-5 py-[18px]">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-bold">Why the numbers don't match</h3>
              <div className="text-[10.5px] text-[#5b626f]">platform-claimed → pixel-verified · {asOf}</div>
            </div>
            <p className="mb-4 text-[10.5px] leading-snug text-[#5b626f]">
              The pixel is the deterministic, person-level truth. This bridge shows exactly where the
              platforms' claimed conversions go.
            </p>
            <Waterfall
              start={{ label: 'Meta + Google claim', value: platformClaimedTotal }}
              steps={reasons.map((r) => ({ label: r.label, delta: r.delta, description: r.description }))}
              end={{ label: 'Pixel-verified', value: pixelVerified }}
            />
            {/* templated narrative */}
            <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] px-3.5 py-3 text-[11px] leading-relaxed text-[#c8b8e8]">
              {narrative.join(' ')}
            </div>
          </section>

          {/* REASONS breakdown */}
          <section className="glass rounded-2xl px-5 py-[18px]">
            <h3 className="mb-3 text-[13px] font-bold">The reasons, explained</h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {reasons.map((r) => (
                <div key={r.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11.5px] font-bold text-[#e8e8ec]">{r.label}</div>
                    <div className={`text-[13px] font-extrabold tabular-nums ${r.tone === 'add' ? 'text-emerald-400' : 'text-[#fb7185]'}`}>
                      {r.delta > 0 ? '+' : ''}{r.delta}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] leading-snug text-[#5b626f]">{r.description}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT — source comparison */}
        <aside className="flex flex-col gap-4">
          <div className="glass rounded-2xl px-[17px] py-4">
            <div className="mb-0.5 text-[12px] font-bold">Every source disagrees</div>
            <p className="mb-3 text-[10px] leading-snug text-[#5b626f]">
              What each platform reports vs the pixel truth. CRM is downstream (closed-won), shown for context.
            </p>
            <div className="flex flex-col gap-2.5">
              {sources.map((src) => {
                const variance = src.claimed - pixelVerified;
                const max = Math.max(...sources.map((x) => x.claimed), 1);
                return (
                  <div key={src.source} className="flex items-center gap-2.5">
                    <div className="flex w-[96px] flex-shrink-0 items-center gap-1.5">
                      <span className="h-[9px] w-[9px] flex-shrink-0 rounded-[2px]" style={{ background: src.color }} />
                      <span className="text-[11px] font-semibold">{src.isTruth ? '◆ ' : ''}{src.label}</span>
                    </div>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-white/[0.06]">
                      <span className="block h-full rounded-[3px]" style={{ width: `${src.claimed / max * 100}%`, background: src.color }} />
                    </div>
                    <div className="w-[78px] flex-shrink-0 text-right">
                      <span className="text-[11.5px] font-extrabold tabular-nums text-[#e8e8ec]">{fmt(src.claimed)}</span>
                      {src.isTruth ? (
                        <span className="ml-1 text-[9px] font-semibold text-[#a855f7]">truth</span>
                      ) : src.isDownstream ? (
                        <span className="ml-1 text-[9px] text-[#5b626f]">downstr.</span>
                      ) : (
                        <span className={`ml-1 text-[9px] font-semibold ${variance >= 0 ? 'text-[#fb7185]' : 'text-emerald-400'}`}>
                          {variance >= 0 ? `+${variance}` : variance}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-[11px] rounded-lg border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-2 text-[10px] leading-snug text-[#fbbf24]">
              ⚠ If three dashboards show three numbers, none of them is wrong — they're measuring different
              things. The pixel reconciles them to one deterministic truth.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
