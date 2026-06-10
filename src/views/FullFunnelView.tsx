import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLATFORMS, PLATFORM_ORDER, ATTRIBUTION_MODELS, ATTRIBUTION_PRESETS,
  PIPELINES, DATE_RANGES, WHO_GROUPS,
  fmt, fmtMoney, splitAbs, scaledStages,
  FEED_NAMES, FEED_ROLES, FEED_COMPANIES, FEED_CITIES, pickFeedPlatform, rand,
  type Stage, type PlatformKey, type FunnelMode,
} from '../data/funnelMock';
import { ReconciliationView } from './ReconciliationView';

type ViewMode = FunnelMode | 'reconciliation';

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
  onDrillToMap?: (stageKey: string) => void;
  /** Tenant being viewed (when drilled in from a portfolio); defaults to the demo tenant. */
  tenantName?: string;
  /** Scales the funnel volumes for the specific tenant. */
  scaleFactor?: number;
}

const DEFAULT_SELECTED: Record<FunnelMode, string> = { people: 'onlp', marketing: 'visit' };
const CONV_STAGE: Record<FunnelMode, string> = { people: 'converted', marketing: 'form' };

let feedSeq = 0;

export function FullFunnelView({ onDrillToMap, tenantName, scaleFactor = 1 }: FullFunnelViewProps) {
  const [mode, setMode] = useState<ViewMode>('people');
  const [pipeline, setPipeline] = useState<string>('all');
  const [model, setModel] = useState<string>('last');
  const [rangeIdx, setRangeIdx] = useState(2); // Last 30 days
  const [selected, setSelected] = useState<string>(DEFAULT_SELECTED.people);
  const [peopleDrill, setPeopleDrill] = useState<'who' | 'source'>('who');
  const [stages, setStages] = useState<Stage[]>(() => scaledStages('people', scaleFactor, ATTRIBUTION_PRESETS.last));
  const [feed, setFeed] = useState<FeedEvent[]>([]);

  // Reset the funnel when mode / pipeline / attribution model / tenant changes.
  useEffect(() => {
    if (mode === 'reconciliation') return; // reconciliation has its own data source
    const pipeScale = PIPELINES.find((p) => p.key === pipeline)?.scale ?? 1;
    setStages(scaledStages(mode, pipeScale * scaleFactor, ATTRIBUTION_PRESETS[model]));
    setSelected(DEFAULT_SELECTED[mode]);
  }, [mode, pipeline, model, scaleFactor]);

  // Live ticking — bump the top-of-funnel stages so the board feels alive.
  useEffect(() => {
    const jitter = setInterval(() => {
      setStages((prev) =>
        prev.map((s, i) => {
          if (i === 1) return { ...s, count: s.count + Math.floor(Math.random() * (s.count > 5000 ? 160 : 6)) };
          if (i === 2 && Math.random() < 0.5) return { ...s, count: s.count + 1 };
          return s;
        }),
      );
    }, 1600);
    return () => clearInterval(jitter);
  }, []);

  // Live feed — person-level events stream in; some convert and tick the funnel.
  useEffect(() => {
    setFeed(Array.from({ length: 5 }, (_, i) => makeEvent(i * 8)));
    const emit = setInterval(() => {
      const ev = makeEvent(0);
      setFeed((prev) => [ev, ...prev.map((e) => ({ ...e, ageSec: e.ageSec + 7 + Math.floor(Math.random() * 5) }))].slice(0, 6));
      if (ev.isConv) {
        const convKey = CONV_STAGE[modeRef.current as FunnelMode];
        setStages((prev) => prev.map((s) => (s.key === convKey ? { ...s, count: s.count + 1 } : s)));
      }
    }, 2400);
    return () => clearInterval(emit);
  }, []);

  // keep a ref so the feed interval always increments the current mode's conv stage
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const stageByKey = useMemo(() => Object.fromEntries(stages.map((s) => [s.key, s])) as Record<string, Stage>, [stages]);
  const selectedStage = stageByKey[selected] ?? stages[2];

  const get = (k: string) => stageByKey[k]?.count ?? 0;

  const kpis = mode === 'people'
    ? [
        { label: 'People Uploaded', value: fmt(get('uploaded')), trend: '+6.1%', up: true },
        { label: 'In Audience',     value: fmt(get('audience')), trend: '+4.8%', up: true },
        { label: 'Match Rate',      value: get('uploaded') ? Math.round(get('audience') / get('uploaded') * 100) + '%' : '—', trend: '+2.0%', up: true },
        { label: 'On Landing Page', value: fmt(get('onlp')),     trend: '+9.4%', up: true },
        { label: 'Converted',       value: fmt(get('converted')), trend: '+12.0%', up: true },
        { label: 'Booked',          value: fmt(get('booked')),   trend: '+7.5%', up: true },
        { label: '🏆 Closed',        value: fmt(get('closed')),   trend: '+22.0%', up: true, hero: true },
      ]
    : [
        { label: 'Total Spend',     value: fmtMoney(get('click') * 85), trend: '+8.2%', up: true },
        { label: 'Impressions',     value: fmt(get('impr')),   trend: '-2.1%', up: false },
        { label: 'Clicks',          value: fmt(get('click')),  trend: '+12.3%', up: true },
        { label: 'Avg CTR',         value: get('impr') ? (get('click') / get('impr') * 100).toFixed(2) + '%' : '—', trend: '+14.7%', up: true },
        { label: 'Visitors',        value: fmt(get('visit')),  trend: '+8.6%', up: true },
        { label: 'Form Completes',  value: fmt(get('form')),   trend: '+10.1%', up: true },
        { label: '🏆 Closed',        value: fmt(get('closed')), trend: '+22.0%', up: true, hero: true },
      ];

  const closed = get('closed');
  const metaClaims = Math.max(closed, Math.round(closed * 1.605));
  const gap = metaClaims - closed;
  const gapPct = metaClaims ? Math.round(gap / metaClaims * 100) : 0;
  const matchRate = get('uploaded') ? Math.round(get('audience') / get('uploaded') * 100) : 0;

  return (
    <div className="min-h-full bg-[#030712] text-[#e8e8ec]"
         style={{ backgroundImage: 'radial-gradient(1200px 600px at 80% -10%,rgba(124,58,237,.10),transparent),radial-gradient(900px 500px at 0% 100%,rgba(20,184,166,.06),transparent)' }}>
      <div className="mx-auto max-w-[1340px] px-5 pt-5 pb-20">

        {/* HEADER */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              <span className="text-[#a855f7]">{tenantName ?? 'Sales Match'}</span> — Full-Funnel Attribution
            </h1>
            <p className="mt-0.5 text-[11px] text-[#9aa0ad]">
              {mode === 'people'
                ? 'People funnel · first-party, person-level, pixel-verified — uploaded → audience → landing page → converted → booked → closed'
                : mode === 'marketing'
                ? 'Marketing funnel · platform-reported aggregate — impressions → clicks → visitors → form completes → booked → closed'
                : 'Reconciliation · why Meta, Google, GA4 and your CRM disagree — and where the claimed conversions actually go'}
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
            <select value={rangeIdx} onChange={(e) => setRangeIdx(Number(e.target.value))}
              className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[12px] font-medium text-[#9aa0ad] outline-none hover:border-white/20">
              {DATE_RANGES.map((r, i) => <option key={r} value={i} className="bg-gray-900">📅 {r}</option>)}
            </select>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[12px] font-medium text-[#9aa0ad]">🏢 All tenants ▾</span>
          </div>
        </header>

        {/* MODE TOGGLE — the primary split */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {([
              { key: 'people', label: '👥 People Funnel', sub: 'person-level' },
              { key: 'marketing', label: '📊 Marketing', sub: 'aggregate' },
              { key: 'reconciliation', label: '🔍 Reconciliation', sub: "why #s differ" },
            ] as const).map((m) => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={`rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition ${mode === m.key ? 'bg-purple-500/25 text-white shadow-[inset_0_0_0_1px_rgba(168,85,247,.4)]' : 'text-[#9aa0ad] hover:text-white'}`}>
                {m.label} <span className="ml-1 text-[10px] font-medium opacity-60">{m.sub}</span>
              </button>
            ))}
            <button onClick={() => onDrillToMap?.('map')}
              className="rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-[#9aa0ad] transition hover:text-white">
              🗺 Map
            </button>
          </div>

          {/* attribution model — Marketing only (People is deterministic) */}
          {mode === 'marketing' && (
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5b626f]">Attribution</span>
              <div className="inline-flex gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-[3px]">
                {ATTRIBUTION_MODELS.map((m) => (
                  <button key={m.key} onClick={() => setModel(m.key)}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${model === m.key ? 'bg-purple-500/25 text-white' : 'text-[#9aa0ad] hover:text-white'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === 'people' && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/25 bg-purple-500/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-purple-200">
              ◆ Deterministic · pixel-verified
            </span>
          )}
        </div>

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

        {mode === 'reconciliation' ? (
          <ReconciliationView scale={(PIPELINES.find((p) => p.key === pipeline)?.scale ?? 1) * scaleFactor} />
        ) : (
        <>
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
              <h3 className="text-[13px] font-bold">{mode === 'people' ? 'People Funnel' : 'Marketing Funnel'}</h3>
              <div className="text-[10.5px] text-[#5b626f]">
                {mode === 'people' ? 'Each stage is real, resolved people · ' : 'Platform-reported delivery · '}
                <span className="text-[#9aa0ad]">live · pixel-tracked</span>
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
                <i className="inline-block h-[9px] w-[9px] rounded-[2px] bg-[#a855f7]" />◆ Pixel / first-party
              </span>
            </div>

            {/* stages */}
            <div>
              {stages.map((st, i) => {
                const prev = i > 0 ? stages[i - 1].count : null;
                const rate = prev ? (st.count / prev * 100) : null;
                const goodRate = rate != null && rate >= 60;
                const isSel = st.key === selected;
                const rateText = rate != null ? `${rate.toFixed(1)}% from above` : (st.firstParty ? 'first-party list' : 'top of funnel');
                const rateClass = rate != null ? (goodRate ? 'text-[#14b8a6]' : 'text-[#5b626f]') : 'text-[#a855f7]';
                return (
                  <div key={st.key} onClick={() => setSelected(st.key)}
                    className={`mb-[7px] cursor-pointer rounded-xl p-2 transition ${isSel ? 'bg-purple-500/[0.08] shadow-[inset_0_0_0_1px_rgba(168,85,247,.25)]' : 'hover:bg-white/[0.025]'}`}>

                    {/* mobile: stacked — name + count, full-width bar, rate */}
                    <div className="sm:hidden">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                          <span className="text-[13px]">{st.icon}</span>{st.name}
                          {st.pixel && <span className="text-[10px] text-[#a855f7]">◆</span>}
                        </div>
                        <div className="text-[15px] font-extrabold tabular-nums">{fmt(st.count)}</div>
                      </div>
                      <StageBar stage={st} />
                      <div className="mt-1 flex items-center justify-between text-[9.5px] tabular-nums">
                        <span className="text-[#5b626f]">{st.desc}</span>
                        <span className={rateClass}>{rateText}</span>
                      </div>
                    </div>

                    {/* desktop: meta | bar | nums */}
                    <div className="hidden items-center gap-3.5 sm:flex">
                      <div className="w-[150px] flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                          <span className="text-[13px]">{st.icon}</span>{st.name}
                          {st.pixel && <span className="text-[10px] text-[#a855f7]">◆</span>}
                        </div>
                        <div className="mt-px text-[9px] text-[#5b626f]">{st.desc}</div>
                      </div>
                      <div className="flex flex-1 justify-center"><StageBar stage={st} /></div>
                      <div className="w-[120px] flex-shrink-0 text-right">
                        <div className="text-[15px] font-extrabold tabular-nums">{fmt(st.count)}</div>
                        <div className={`text-[9.5px] tabular-nums ${rateClass}`}>{rateText}</div>
                      </div>
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
                {selectedStage.firstParty ? 'First-party uploaded list · the in-market core'
                  : selectedStage.pixel ? 'ArkData pixel · person-level · drill into the explorer'
                  : mode === 'people' ? 'Resolved people · deterministic'
                  : 'Platform-reported · attributed by current model'}
              </div>

              {/* People stages get a Who / Source toggle */}
              {mode === 'people' && (
                <div className="mb-3 inline-flex gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-[3px]">
                  {(['who', 'source'] as const).map((t) => (
                    <button key={t} onClick={() => setPeopleDrill(t)}
                      className={`rounded-md px-3 py-1 text-[10.5px] font-semibold capitalize transition ${peopleDrill === t ? 'bg-purple-500/25 text-white' : 'text-[#9aa0ad] hover:text-white'}`}>
                      {t === 'who' ? 'Who' : 'Source'}
                    </button>
                  ))}
                </div>
              )}

              {mode === 'people' && peopleDrill === 'who'
                ? <WhoPanel />
                : selectedStage.firstParty
                  ? <div className="text-[11px] leading-relaxed text-[#5b626f]">First-party list — no ad-platform source. {fmt(selectedStage.count)} accounts seeded into platform Custom Audiences downstream.</div>
                  : <StageBreakdown stage={selectedStage} />}

              {(selectedStage.pixel || (mode === 'people' && peopleDrill === 'who')) && (
                <button onClick={() => onDrillToMap?.(selectedStage.key)}
                  className="mt-3 w-full rounded-lg border border-purple-500/30 bg-purple-500/10 py-2 text-[11px] font-semibold text-purple-200 transition hover:bg-purple-500/20">
                  ◆ Drill into geographic explorer →
                </button>
              )}
            </div>

            {/* CONTEXT PANEL — differs by mode */}
            {mode === 'marketing' ? (
              <div className="glass rounded-2xl px-[17px] py-[15px]">
                <div className="mb-[3px] text-[12px] font-bold">◆ Pixel-verified vs platform-claimed</div>
                <p className="mb-3 text-[10px] leading-snug text-[#5b626f]">First-party truth. The gap is over-attribution the ad platforms can't see past.</p>
                <div className="flex flex-col gap-[9px]">
                  <MeterRow label="Meta claims" value={metaClaims} width={100} color={PLATFORMS.meta.color} />
                  <MeterRow label="◆ Pixel verified" value={closed} width={metaClaims ? closed / metaClaims * 100 : 0} color="#a855f7" />
                </div>
                <div className="mt-[11px] rounded-lg border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-2 text-[10px] leading-snug text-[#fbbf24]">
                  ⚠ {gap} conversions ({gapPct}%) claimed by Meta were never seen by the pixel — likely view-through or modeled.
                </div>
                <button onClick={() => setMode('reconciliation')}
                  className="mt-2.5 w-full rounded-lg border border-purple-500/30 bg-purple-500/10 py-2 text-[11px] font-semibold text-purple-200 transition hover:bg-purple-500/20">
                  See full reconciliation →
                </button>
              </div>
            ) : (
              <div className="glass rounded-2xl px-[17px] py-[15px]">
                <div className="mb-[3px] text-[12px] font-bold">◆ Audience match quality</div>
                <p className="mb-3 text-[10px] leading-snug text-[#5b626f]">How much of your uploaded list resolved to real, reachable people.</p>
                <div className="flex flex-col gap-[9px]">
                  <MeterRow label="Match rate" value={`${matchRate}%`} width={matchRate} color="#a855f7" />
                  <MeterRow label="Quality score" value="8.6" width={86} color="#14b8a6" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-lg bg-white/[0.04] px-2.5 py-2"><div className="font-extrabold tabular-nums text-[#e8e8ec]">{fmt(get('audience'))}</div><div className="text-[#5b626f]">synced</div></div>
                  <div className="rounded-lg bg-white/[0.04] px-2.5 py-2"><div className="font-extrabold tabular-nums text-[#e8e8ec]">{fmt(get('uploaded') - get('audience'))}</div><div className="text-[#5b626f]">unmatched</div></div>
                </div>
                <div className="mt-[11px] rounded-lg border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-2 text-[10px] leading-snug text-[#fbbf24]">
                  ⚠ {fmt(get('uploaded') - get('audience'))} unmatched — no PII match, suppressed, or opted out.
                </div>
              </div>
            )}

            {/* LIVE FEED */}
            <div className="glass flex min-h-[260px] flex-col rounded-2xl px-[17px] py-4">
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
        </>
        )}

        <footer className="mt-[22px] text-center text-[10px] leading-relaxed text-[#5b626f]">
          Live demo — numbers are simulated and tick to illustrate the product. Two funnels: a person-level People funnel
          (deterministic, pixel-verified) and an aggregate Marketing funnel (platform-reported), bridged at Visitors ↔ On Landing Page and Booked → Closed.
        </footer>
      </div>
    </div>
  );
}

function StageBar({ stage }: { stage: Stage }) {
  const abs = splitAbs(stage);
  return (
    <div className="flex h-[38px] overflow-hidden rounded-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition-[width] duration-700"
      style={{ width: `${stage.barWidth}%` }}>
      {stage.firstParty ? (
        <div className="h-full w-full" style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }} />
      ) : (
        PLATFORM_ORDER.map((p) => {
          const v = abs[p];
          if (!v) return null;
          const pc = stage.count ? (v / stage.count * 100) : 0;
          return <div key={p} className="h-full" style={{ flexBasis: `${pc}%`, background: PLATFORMS[p].color }} />;
        })
      )}
    </div>
  );
}

function StageBreakdown({ stage }: { stage: Stage }) {
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

function WhoPanel() {
  return (
    <div className="flex flex-col gap-3">
      {WHO_GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-[#5b626f]">{g.title}</div>
          <div className="flex flex-col gap-1.5">
            {g.items.map((it) => (
              <div key={it.label} className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-[10.5px] text-[#9aa0ad]">{it.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-white/[0.06]">
                  <span className="block h-full rounded-[3px] bg-purple-500/70" style={{ width: `${it.pct}%` }} />
                </span>
                <span className="w-9 text-right text-[10px] font-bold tabular-nums text-[#e8e8ec]">{it.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MeterRow({ label, value, width, color }: { label: string; value: string | number; width: number; color: string }) {
  return (
    <div className="flex items-center gap-[9px]">
      <span className="w-24 text-[10.5px] text-[#9aa0ad]">{label}</span>
      <span className="h-[9px] flex-1 overflow-hidden rounded-[5px] bg-white/[0.06]">
        <span className="block h-full rounded-[5px] transition-[width] duration-500" style={{ width: `${Math.min(width, 100)}%`, background: color }} />
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
