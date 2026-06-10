import { useMemo } from 'react';
import { ATTRIBUTION_MODELS } from '../data/funnelMock';
import { creditByModel, modelMatrix, MODEL_DESC, biggestSwing } from '../data/attributionMock';
import { fmt } from '../data/funnelMock';

interface AttributionByModelProps {
  modelKey: string;
  /** total conversions to distribute credit across (fixed; model only re-splits) */
  total: number;
}

export function AttributionByModel({ modelKey, total }: AttributionByModelProps) {
  const credit = useMemo(() => creditByModel(modelKey, total), [modelKey, total]);
  const matrix = useMemo(() => modelMatrix(), []);
  const modelLabel = ATTRIBUTION_MODELS.find((m) => m.key === modelKey)?.label ?? modelKey;

  // headline insight: how this model differs from the reference (last-touch, or
  // first-touch when last-touch is itself selected)
  const compareTo = modelKey === 'last' ? 'first' : 'last';
  const compareLabel = compareTo === 'first' ? 'first-touch' : 'last-touch';
  const swing = useMemo(() => biggestSwing(compareTo, modelKey), [modelKey, compareTo]);
  const maxCredit = Math.max(...credit.map((c) => c.pct), 1);

  return (
    <section className="glass mt-4 rounded-2xl px-5 py-[18px]">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold">Attribution · {modelLabel}</h3>
        <div className="text-[10.5px] text-[#5b626f]">{fmt(total)} conversions credited · switch the model above</div>
      </div>
      <p className="mb-4 text-[10.5px] leading-snug text-[#5b626f]">{MODEL_DESC[modelKey]}</p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* credit by channel for the selected model */}
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9aa0ad]">Credit by channel</div>
          <div className="flex flex-col gap-2">
            {credit.map((c) => (
              <div key={c.platform} className="flex items-center gap-2.5">
                <div className="flex w-[78px] flex-shrink-0 items-center gap-1.5">
                  <span className="h-[9px] w-[9px] flex-shrink-0 rounded-[2px]" style={{ background: c.color }} />
                  <span className="text-[11px] font-semibold">{c.name}</span>
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-[3px] bg-white/[0.05]">
                  <span className="block h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${c.pct / maxCredit * 100}%`, background: c.color }} />
                </div>
                <div className="w-[88px] flex-shrink-0 text-right text-[11px] tabular-nums">
                  <span className="font-extrabold text-[#e8e8ec]">{fmt(c.credit)}</span>
                  <span className="ml-1 text-[#5b626f]">{c.pct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* comparison matrix — how credit shifts across models */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9aa0ad]">Compare models</div>
            {swing && (
              <div className="text-[10px] text-[#9aa0ad]">
                {modelLabel} vs {compareLabel}: <b style={{ color: swing.delta >= 0 ? '#10b981' : '#fb7185' }}>{swing.name} {swing.delta >= 0 ? '+' : ''}{swing.delta}pts</b>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr>
                  <th className="pb-1.5 pr-2 text-left font-semibold text-[#5b626f]">Channel</th>
                  {ATTRIBUTION_MODELS.map((m) => (
                    <th key={m.key} className={`px-1.5 pb-1.5 text-right font-semibold ${m.key === modelKey ? 'text-[#c8a8f0]' : 'text-[#5b626f]'}`}>
                      {m.label.replace('-touch', '').replace('Data-driven', 'Data')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.platform} className="border-t border-white/[0.05]">
                    <td className="py-1.5 pr-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-[8px] w-[8px] rounded-[2px]" style={{ background: row.color }} />
                        <span className="font-semibold text-[#e8e8ec]">{row.name}</span>
                      </span>
                    </td>
                    {ATTRIBUTION_MODELS.map((m) => {
                      const v = row.byModel[m.key];
                      const sel = m.key === modelKey;
                      return (
                        <td key={m.key} className={`px-1.5 py-1.5 text-right tabular-nums ${sel ? 'rounded bg-purple-500/[0.12] font-extrabold text-white' : 'text-[#9aa0ad]'}`}>
                          {v.toFixed(0)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[9.5px] leading-snug text-[#5b626f]">
            Same conversions, different credit. Awareness channels (Meta, TikTok) peak under first-touch;
            intent-capture (Google, Email) peak under last-touch — which is why the model you pick changes who looks best.
          </p>
        </div>
      </div>
    </section>
  );
}
