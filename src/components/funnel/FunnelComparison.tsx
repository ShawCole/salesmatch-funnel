import { Trophy } from 'lucide-react';
import type { Campaign } from './types';
import { STAGE_LABELS } from './types';

const STAGES = ['targeted', 'awareness', 'interest', 'consideration', 'evaluation'] as const;

export function FunnelComparison({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length < 2) return null;

  // Find winner by evaluation conversion rate
  const rates = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
    rate: c.funnel.targeted > 0 ? (c.funnel.evaluation / c.funnel.targeted) * 100 : 0,
    cac: c.adSet.spend / Math.max(c.conversion.booked, 1),
  }));
  const winner = rates.reduce((best, r) => r.rate > best.rate ? r : best, rates[0]);

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-4">Campaign Comparison</h3>

      <div className="flex gap-4">
        {campaigns.map(c => {
          const maxCount = c.funnel.targeted;
          const isWinner = c.id === winner.id;
          const cac = c.adSet.spend / Math.max(c.conversion.booked, 1);
          const overallRate = maxCount > 0 ? ((c.funnel.evaluation / maxCount) * 100).toFixed(2) : '0';

          return (
            <div key={c.id} className={`flex-1 rounded-xl p-4 border ${isWinner ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                <span className="text-xs font-bold text-white">{c.name}</span>
                {isWinner && <Trophy size={12} className="text-amber-400" />}
              </div>

              <div className="space-y-2">
                {STAGES.map((stage, i) => {
                  const count = c.funnel[stage];
                  const prevCount = i > 0 ? c.funnel[STAGES[i - 1]] : count;
                  const stageRate = prevCount > 0 ? ((count / prevCount) * 100).toFixed(0) : '—';
                  const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={stage} className="flex items-center gap-2">
                      <div className="w-[80px] shrink-0 text-[10px] text-gray-400">{STAGE_LABELS[stage]}</div>
                      <div className="flex-1 h-5 bg-white/[0.03] rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-500"
                          style={{ width: `${Math.max(widthPct, 3)}%`, background: c.color }}
                        />
                      </div>
                      <div className="w-[50px] text-right text-[10px] font-bold text-gray-300 tabular-nums">
                        {count.toLocaleString()}
                      </div>
                      {i > 0 && (
                        <div className="w-[35px] text-right text-[9px] text-gray-500 tabular-nums">
                          {stageRate}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">CAC</span>
                  <span className="font-bold text-white">${cac.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">Conv Rate</span>
                  <span className="font-bold text-white">{overallRate}%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">Booked</span>
                  <span className="font-bold text-white">{c.conversion.booked}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner callout */}
      <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
        <div className="flex items-center justify-center gap-2">
          <Trophy size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-white">{winner.name}</span>
        </div>
        <div className="text-[10px] text-emerald-300 mt-1">
          Highest conversion rate at {winner.rate.toFixed(2)}% &middot; CAC ${winner.cac.toFixed(0)}
        </div>
      </div>
    </div>
  );
}
