import { useEffect, useMemo, useState } from 'react';
import {
  PLATFORMS, PLATFORM_ORDER, ATTRIBUTION_MODELS, ATTRIBUTION_PRESETS,
  PIPELINES, DATE_RANGES, TAM,
  fmt, fmtMoney, splitAbs, scaledStages,
  FEED_NAMES, FEED_ROLES, FEED_COMPANIES, FEED_CITIES, pickFeedPlatform, rand,
  type Stage, type StageKey, type PlatformKey,
} from '../data/funnelMock';

interface FeedEvent {
  id: number;
  platform: PlatformKey;
  isConv: boolean;
  who: string;
  city: string;
  ageSec: number;
}

interface FullFunnelViewProps {
  /** Called when the user drills a pixel-owned stage into the geographic explorer. */
  onDrillToMap?: (stage: StageKey) => void;
}

let feedSeq = 0;

export function FullFunnelView({ onDrillToMap }: FullFunnelViewProps) {
  const [pipeline, setPipeline] = useState<string>('all');
  const [model, setModel] = useState<string>('last');
  const [rangeIdx, setRangeIdx] = useState(2); // Last 30 days
  const [selected, setSelected] = useState<StageKey>('visit');
  const [stages, setStages] = useState<Stage[]>(() => scaledStages(1, ATTRIBUTION_PRESETS.last));
  const [feed, setFeed] = useState<FeedEvent[]>([]);

  // Reset funnel when the pipeline or attribution model changes.
  useEffect(() => {
    const scale = PIPELINES.find((p) => p.key === pipeline)?.scale ?? 1;
    setStages(scaledStages(scale, ATTRIBUTION_PRESETS[model]));
  }, [pipeline, model]);

  // Live ticking — gentle jitter on delivery stages so the board feels alive.
  useEffect(() => {
    const jitter = setInterval(() => {
      setStages((prev) =>
        prev.map((s) => {
          if (s.key === 'impr') return { ...s, count: s.count + Math.floor(Math.random() * 180) };
          if (s.key === 'click' && Math.random() < 0.6) return { ...s, count: s.count + Math.floor(Math.random() * 4) };
          if (s.key === 'visit' && Math.random() < 0.4) return { ...s, count: s.count + 1 };
          if (s.key === 'retarget' && Math.random() < 0.1) return { ...s, count: s.count + 1 };
          return s;
        }),
      );
    }, 1600);
    return () => clearInterval(jitter);
  }, []);

  // Live pixel feed — new person-level events stream in; some convert.
  useEffect(() => {
    const seedN = 5;
    const seedEvents: FeedEvent[] = Array.from({ length: seedN }, (_, i) => makeEvent(i * 8));
    setFeed(seedEvents);

    const emit = setInterval(() => {
      const ev = makeEvent(0);
      setFeed((prev) => {
        const aged = prev.map((e) => ({ ...e, ageSec: e.ageSec + 7 + Math.floor(Math.random() * 5) }));
        return [ev, ...aged].slice(0, 6);
      });
      if (ev.isConv) {
        setStages((prev) => prev.map((s) => (s.key === 'conv' ? { ...s, count: s.count + 1 } : s)));
      }
    }, 2400);
    return () => clearInterval(emit);
  }, []);

  const stageByKey = useMemo(() => Object.fromEntries(stages.map((s) => [s.key, s])) as Record<StageKey, Stage>, [stages]);
  const selectedStage = stageByKey[selected] ?? stages[3];

  const impr = stageByKey.impr?.count ?? 0;
  const clicks = stageByKey.click?.count ?? 0;
  const visit = stageByKey.visit?.count ?? 0;
  const conv = stageByKey.conv?.count ?? 0;

  const cpcCents = 85;
  const kpis = [
    { label: 'Total Spend',     value: fmtMoney(clicks * cpcCents), trend: '+8.2%',  up: true },
    { label: 'Impressions',     value: fmt(impr),                   trend: '-2.1%',  up: false },
    { label: 'Clicks',          value: fmt(clicks),                 trend: '+12.3%', up: true },
    { label: 'Avg CTR',         value: impr ? (clicks / impr * 100).toFixed(2) + '%' : '—', trend: '+14.7%', up: true },
    { label: 'Avg CPC',         value: '$0.85',                     trend: '+5.3%',  up: true },
    { label: 'Influenced Acct', value: fmt(Math.round(visit * 1.36)), trend: '+8.2%', up: true },
    { label: '◆ Verified Conv', value: fmt(conv),                   trend: '+22.0%', up: true, hero: true },
  ];

  const metaClaims = Math.max(conv, Math.round(conv * 1.605));
  const gap = metaClaims - conv;
  const gapPct = metaClaims ? Math.round(gap / metaClaims * 100) : 0;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#030712] text-[#e8e8ec]"
         style={{ backgroundImage: 'radial-gradient(1200px 600px at 80% -10%,rgba(124,58,237,.10),transparent),radial-gradient(900px 500px at 0% 100%,rgba(20,184,166,.06),transparent)' }}>
      <div className="mx-auto max-w-[1340px] px-5 pt-5 pb-20">

        {/* HEADER */}
        <header className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              <span className="text-[#a855f7]">Sales Match</span> — Full-Funnel Attribution
            </h1>
            <p className="mt-0.5 text-[11px] text-[#9aa0ad]">
              Intent → Ad Audience → Impressions → Clicks → LP Visit (pixel) → Retarget → Convert · multi-platform, multi-touch
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
            <div className="inline-flex gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-[3px]">
              {ATTRIBUTION_MODELS.map((m) => (
                <button key={m.key} onClick={() => setModel(m.key)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${model === m.key ? 'bg-purple-500/25 text-white' : 'text-[#9aa0ad] hover:text-white'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <select value={rangeIdx} onChange={(e) => setRangeIdx(Number(e.target.value))}
              className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[12px] font-medium text-[#9aa0ad] outline-none hover:border-white/20">
              {DATE_RANGES.map((r, i) => <option key={r} value={i} className="bg-gray-900">📅 {r}</option>)}
            </select>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[12px] font-medium text-[#9aa0ad]">🏢 All tenants ▾</span>
            <button onClick={() => onDrillToMap?.('visit')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[12px] font-medium text-[#9aa0ad] transition hover:border-white/20 hover:text-white">
              🗺 Map
            </button>
          </div>
        </header>

        {/* PIPELINE TABS */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {PIPELINES.map((p) => (
            <button key={p.key} onClick={() => setPipeline(p.key)}
              className={`inline-flex items-center gap-2 rounded-[10px] border px-[11px] py-[7px] text-[12px] font-medium transition ${pipeline === p.key ? 'border-purple-500/40 bg-purple-500/[0.18] text-white' : 'border-white/[0.08] bg-white/[0.03] text-[#9aa0ad] hover:border-white/20 hover:text-white'}`}>
              {p.key !== 'all' && <span className="h-[7px] w-[7px] rounded-full" style={{ background: p.color }} />}
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI ROW */}
        <div className="mb-[18px] grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {kpis.map((k) => (
            <div key={k.label}
              className={`glass rounded-2xl px-3.5 py-[13px] ${k.hero ? '!border-purple-500/30' : ''}`}
              style={k.hero ? { background: 'linear-gradient(135deg,rgba(168,85,247,.14),rgba(124,58,237,.05))' } : undefined}>
              <div className={`mb-[7px] text-[9.5px] font-semibold uppercase tracking-[0.07em] ${k.hero ? 'text-[#c8a8f0]' : 'text-[#9aa0ad]'}`}>{k.label}</div>
              <div className="text-[19px] font-extrabold tabular-nums tracking-tight">{k.value}</div>
              <div className={`mt-0.5 flex items-center gap-0.5 text-[10.5px] font-bold ${k.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {k.up ? '▲' : '▼'} {k.trend.replace(/[+-]/, '')}
              </div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">

          {/* FUNNEL */}
          <section className="glass rounded-2xl px-5 py-[18px]">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-bold">Pipeline Overview</h3>
              <div className="text-[10.5px] text-[#5b626f]">
                TAM {TAM.toLocaleString()} · ~3% in-market · <span className="text-[#9aa0ad]">spend live · pixel live</span>
              </div>
            </div>

            {/* legend */}
            <div className="my-2.5 mb-[18px] flex flex-wrap gap-[13px]">
              {PLATFORM_ORDER.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[#9aa0ad]">
                  <i className="inline-block h-[9px] w-[9px] rounded-[2px]" style={{ background: PLATFORMS[p].color }} />
                  {PLATFORMS[p].name}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[#9aa0ad]">
                <i className="inline-block h-[9px] w-[9px] rounded-[2px] bg-[#a855f7]" />◆ Pixel-owned stage
              </span>
            </div>

            {/* stages */}
            <div>
              {stages.map((st, i) => {
                const prev = i > 0 ? stages[i - 1].count : null;
                const rate = prev ? (st.count / prev * 100) : null;
                const abs = splitAbs(st);
                const goodRate = rate != null && rate >= 80;
                const isSel = st.key === selected;
                return (
                  <div key={st.key} onClick={() => setSelected(st.key)}
                    className={`mb-[7px] flex cursor-pointer items-center gap-3.5 rounded-xl p-2 transition ${isSel ? 'bg-purple-500/[0.08] shadow-[inset_0_0_0_1px_rgba(168,85,247,.25)]' : 'hover:bg-white/[0.025]'}`}>
                    {/* meta */}
                    <div className="w-[140px] flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                        <span className="text-[13px]">{st.icon}</span>{st.name}
                        {st.pixel && <span className="text-[10px] text-[#a855f7]">◆</span>}
                      </div>
                      <div className="mt-px text-[9px] text-[#5b626f]">{st.desc}</div>
                    </div>
                    {/* bar */}
                    <div className="flex flex-1 justify-center">
                      <div className="flex h-[38px] overflow-hidden rounded-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition-[width] duration-700"
                        style={{ width: `${st.barWidth}%` }}>
                        {st.seed ? (
                          <div className="h-full w-full" style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }} />
                        ) : (
                          PLATFORM_ORDER.map((p) => {
                            const v = abs[p];
                            if (!v) return null;
                            const pc = st.count ? (v / st.count * 100) : 0;
                            return <div key={p} className="relative h-full" style={{ flexBasis: `${pc}%`, background: PLATFORMS[p].color }} />;
                          })
                        )}
                      </div>
                    </div>
                    {/* nums */}
                    <div className="w-[118px] flex-shrink-0 text-right">
                      <div className="text-[15px] font-extrabold tabular-nums">{fmt(st.count)}</div>
                      {rate != null ? (
                        <div className={`text-[9.5px] tabular-nums ${goodRate ? 'text-[#14b8a6]' : 'text-[#5b626f]'}`}>{rate.toFixed(1)}% from above</div>
                      ) : (
                        <div className="text-[9.5px] tabular-nums text-[#a855f7]">seed audience</div>
                      )}
                      {i === 0 && <div className="text-[9px] font-semibold text-[#fbbf24]">{(st.count / TAM * 100).toFixed(1)}% of TAM in-market</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SIDE PANEL */}
          <aside className="flex flex-col gap-4">

            {/* DRILL DOWN */}
            <div className="glass rounded-2xl px-[17px] py-4">
              <div className="mb-0.5 flex items-center gap-1.5 text-[12px] font-bold">
                <span className="text-[14px]">{selectedStage.icon}</span>{selectedStage.name}
              </div>
              <div className="mb-3.5 text-[10px] text-[#5b626f]">
                {selectedStage.pixel ? 'ArkData pixel · person-level · drill into the map explorer'
                  : selectedStage.seed ? 'Intent-vendor seed audience · the in-market core'
                  : selectedStage.key === 'conv' ? 'Deterministic, pixel-verified conversions, attributed by the current model'
                  : 'Platform-reported delivery · attributed by current model'}
              </div>
              <StageBreakdown stage={selectedStage} />
              {selectedStage.pixel && (
                <button onClick={() => onDrillToMap?.(selectedStage.key)}
                  className="mt-3 w-full rounded-lg border border-purple-500/30 bg-purple-500/10 py-2 text-[11px] font-semibold text-purple-200 transition hover:bg-purple-500/20">
                  ◆ Drill into geographic explorer →
                </button>
              )}
            </div>

            {/* PIXEL-VERIFIED VS CLAIMED */}
            <div className="glass rounded-2xl px-[17px] py-[15px]">
              <div className="mb-[3px] text-[12px] font-bold">◆ Pixel-verified vs platform-claimed</div>
              <p className="mb-3 text-[10px] leading-snug text-[#5b626f]">First-party truth. The gap is over-attribution the ad platforms can't see past.</p>
              <div className="flex flex-col gap-[9px]">
                <VerifyRow label="Meta claims" value={metaClaims} width={100} color={PLATFORMS.meta.color} />
                <VerifyRow label="◆ Pixel verified" value={conv} width={metaClaims ? conv / metaClaims * 100 : 0} color="#a855f7" />
              </div>
              <div className="mt-[11px] rounded-lg border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-2 text-[10px] leading-snug text-[#fbbf24]">
                ⚠ {gap} conversions ({gapPct}%) claimed by Meta were never seen by the pixel — likely view-through or modeled.
              </div>
            </div>

            {/* LIVE FEED */}
            <div className="glass flex min-h-[280px] flex-col rounded-2xl px-[17px] py-4">
              <div className="mb-3 flex items-center justify-between text-[12px] font-bold">
                <span>◉ Live pixel feed</span>
                <span className="font-mono text-[9px] text-[#5b626f]">~2.5/min</span>
              </div>
              <div className="flex flex-1 flex-col gap-[7px]">
                {feed.map((e) => (
                  <div key={e.id}
                    className={`flex items-center gap-[9px] rounded-[10px] border px-2.5 py-2 ${e.isConv ? 'border-emerald-500/[0.22] bg-emerald-500/[0.08]' : 'border-white/[0.08] bg-white/[0.05]'}`}>
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: e.isConv ? '#10b981' : PLATFORMS[e.platform].color }} />
                    <span className="flex-1 text-[11px] leading-[1.25]">
                      <b className="font-semibold">{e.isConv ? '✓ Converted' : 'LP visit'}</b>{' '}
                      <span className="text-[#9aa0ad]">{e.who}</span><br />
                      <span className="text-[9.5px] text-[#5b626f]">{e.city} · via {PLATFORMS[e.platform].name}{e.isConv ? ' · pixel-verified' : ''}</span>
                    </span>
                    <span className="text-[9px] text-[#5b626f]">{e.ageSec === 0 ? 'now' : `${e.ageSec}s`}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-[22px] text-center text-[10px] leading-relaxed text-[#5b626f]">
          Live demo — numbers are simulated and tick to illustrate the product. Stage breakdowns, attribution-model selector,
          freshness, the live pixel feed, and pixel-verified-vs-claimed are the new surfaces over the existing prototype.
        </footer>
      </div>
    </div>
  );
}

function StageBreakdown({ stage }: { stage: Stage }) {
  if (stage.seed) {
    return (
      <div className="text-[11px] leading-relaxed text-[#5b626f]">
        No platform split — this is the upstream intent audience before any ad delivery.{' '}
        {fmt(stage.count)} in-market accounts seeded into platform Custom Audiences downstream.
      </div>
    );
  }
  const abs = splitAbs(stage);
  const max = Math.max(...PLATFORM_ORDER.map((p) => abs[p]), 1);
  const rows = PLATFORM_ORDER.filter((p) => abs[p] > 0);
  return (
    <div>
      {rows.map((p) => {
        const v = abs[p];
        const pc = stage.count ? (v / stage.count * 100) : 0;
        return (
          <div key={p} className="mb-2.5 flex items-center gap-[9px]">
            <span className="h-[9px] w-[9px] flex-shrink-0 rounded-[2px]" style={{ background: PLATFORMS[p].color }} />
            <span className="w-16 flex-shrink-0 text-[11px] font-semibold">{PLATFORMS[p].name}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-white/[0.06]">
              <span className="block h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${v / max * 100}%`, background: PLATFORMS[p].color }} />
            </span>
            <span className="w-16 text-right text-[10.5px] font-bold text-[#9aa0ad]"><b className="text-[#e8e8ec]">{fmt(v)}</b> · {pc.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function VerifyRow({ label, value, width, color }: { label: string; value: number; width: number; color: string }) {
  return (
    <div className="flex items-center gap-[9px]">
      <span className="w-24 text-[10.5px] text-[#9aa0ad]">{label}</span>
      <span className="h-[9px] flex-1 overflow-hidden rounded-[5px] bg-white/[0.06]">
        <span className="block h-full rounded-[5px] transition-[width] duration-500" style={{ width: `${width}%`, background: color }} />
      </span>
      <span className="w-[46px] text-right text-[11px] font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function makeEvent(ageSec: number): FeedEvent {
  const isConv = Math.random() < 0.13;
  return {
    id: feedSeq++,
    platform: pickFeedPlatform(),
    isConv,
    who: `${rand(FEED_NAMES)} · ${rand(FEED_ROLES)} @ ${rand(FEED_COMPANIES)}`,
    city: rand(FEED_CITIES),
    ageSec,
  };
}
