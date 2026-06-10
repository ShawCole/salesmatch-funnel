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
  const { perPlatform, overlap, pixelVerified, truth, otherSources, narrative, methodology, asOf } = data;
  const meta = perPlatform[0];
  const google = perPlatform[1];

  const kpis = [
    { label: '◆ Meta verified', value: fmt(meta.verified), sub: `of ${fmt(meta.claimed)} claimed · −${meta.overClaimPct}%`, tint: meta.color },
    { label: '◆ Google verified', value: fmt(google.verified), sub: `of ${fmt(google.claimed)} claimed · −${google.overClaimPct}%`, tint: google.color },
    { label: '◆ Pixel-verified (unique)', value: fmt(pixelVerified), sub: 'single source of truth', tint: '#a855f7', hero: true },
    { label: 'Overlap resolved', value: fmt(overlap), sub: 'claimed by BOTH', tint: '#a855f7' },
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
            <div className="mt-0.5 text-[9.5px] text-[#5b626f]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* LEFT — per-platform bridges + truth composition */}
        <div className="flex flex-col gap-4">

          {/* Each platform reconciled on its own */}
          <section className="glass rounded-2xl px-5 py-[18px]">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-bold">Each platform, reconciled on its own</h3>
              <div className="text-[10.5px] text-[#5b626f]">never summed · {asOf}</div>
            </div>
            <p className="mb-4 text-[10.5px] leading-snug text-[#5b626f]">
              The platforms can't see each other, so we reconcile each one separately against the pixel —
              dropping the impression-only and unmatched conversions it could never verify.
            </p>
            <div className="flex flex-col gap-5">
              {perPlatform.map((p) => (
                <div key={p.platform}>
                  <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold">
                    <span className="h-[10px] w-[10px] rounded-[2px]" style={{ background: p.color }} />
                    {p.label}<span className="font-normal text-[#5b626f]"> · over-claims {p.overClaimPct}%</span>
                  </div>
                  <Waterfall
                    start={{ label: `${p.label} claims`, value: p.claimed, color: p.color }}
                    steps={p.reasons.map((r) => ({ label: r.label, delta: r.delta, description: r.description }))}
                    end={{ label: `Pixel-verified (${p.label})`, value: p.verified }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Resolve to one truth — composition, not a sum */}
          <section className="glass rounded-2xl px-5 py-[18px]">
            <h3 className="mb-1 text-[13px] font-bold">…then resolved to one truth</h3>
            <p className="mb-3 text-[10.5px] leading-snug text-[#5b626f]">
              Even the verified numbers can't be added — <b className="text-[#c8b8e8]">{fmt(meta.verified)} + {fmt(google.verified)} would double-count
              the {fmt(overlap)} people claimed by both.</b> The pixel deduplicates to the unique union:
            </p>
            {/* composition bar of the verified truth */}
            <div className="flex h-[34px] w-full overflow-hidden rounded-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,.1)]">
              {truth.map((seg) => (
                <div key={seg.key} className="h-full" title={`${seg.label}: ${seg.value}`}
                  style={{ width: `${seg.value / pixelVerified * 100}%`, background: seg.color }} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {truth.map((seg) => (
                <div key={seg.key} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-[8px] w-[8px] rounded-[2px]" style={{ background: seg.color }} />
                    <span className="text-[10px] font-semibold text-[#9aa0ad]">{seg.label}</span>
                  </div>
                  <div className="mt-0.5 text-[15px] font-extrabold tabular-nums">{fmt(seg.value)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] px-3.5 py-3 text-[11px] leading-relaxed text-[#c8b8e8]">
              {narrative.join(' ')}
            </div>
          </section>
        </div>

        {/* RIGHT — methodology + other sources */}
        <aside className="flex flex-col gap-4">
          <div className="glass rounded-2xl px-[17px] py-4">
            <div className="mb-2 text-[12px] font-bold">How the pixel can challenge them</div>
            <ul className="flex flex-col gap-2">
              {methodology.map((m, i) => (
                <li key={i} className="flex gap-2 text-[10px] leading-snug text-[#9aa0ad]">
                  <span className="mt-[2px] text-[#a855f7]">◆</span><span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl px-[17px] py-4">
            <div className="mb-0.5 text-[12px] font-bold">Other sources</div>
            <p className="mb-3 text-[10px] leading-snug text-[#5b626f]">
              Shown <b className="text-[#9aa0ad]">separately</b> — they each measure differently and can't be
              added to the verified truth either.
            </p>
            <div className="flex flex-col gap-2.5">
              {otherSources.map((src) => (
                <div key={src.key}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                      <span className="h-[9px] w-[9px] rounded-[2px]" style={{ background: src.color }} />{src.label}
                    </span>
                    <span className="text-[11.5px] font-extrabold tabular-nums text-[#e8e8ec]">{fmt(src.claimed)}</span>
                  </div>
                  <div className="mt-0.5 text-[9.5px] leading-snug text-[#5b626f]">{src.note}</div>
                </div>
              ))}
            </div>
            <div className="mt-[11px] rounded-lg border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-2 text-[10px] leading-snug text-[#fbbf24]">
              ⚠ Five sources, five numbers — none is "wrong," they measure different things. Only the
              person-level pixel reconciles them to one deterministic truth.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
