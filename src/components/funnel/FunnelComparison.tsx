import { Trophy } from 'lucide-react';
import type { Campaign, StageDefinition } from './types';
import { STAGE_ORDER, STAGE_COLORS } from './types';

export function FunnelComparison({ campaigns, stages }: { campaigns: Campaign[]; stages: StageDefinition[] }) {
  if (campaigns.length < 2) return null;

  const stageMap = new Map(stages.map(s => [s.id, s]));

  const rates = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
    rate: c.funnel.searching > 0 ? (c.funnel.converted / c.funnel.searching) * 100 : 0,
  }));
  const winner = rates.reduce((best, r) => r.rate > best.rate ? r : best, rates[0]);

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-4">Campaign Comparison</h3>

      <div className="flex gap-3 overflow-x-auto">
        {campaigns.map(c => {
          const maxCount = c.funnel.searching;
          const isWinner = c.id === winner.id;

          return (
            <div key={c.id} className={`flex-1 min-w-[200px] rounded-xl p-3 border ${isWinner ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-[11px] font-bold text-white">{c.name}</span>
                {isWinner && <Trophy size={11} className="text-amber-400" />}
              </div>

              <div className="space-y-1.5">
                {STAGE_ORDER.map((stageId, i) => {
                  const count = c.funnel[stageId];
                  const prevCount = i > 0 ? c.funnel[STAGE_ORDER[i - 1]] : count;
                  const stageRate = prevCount > 0 ? ((count / prevCount) * 100).toFixed(0) : '—';
                  const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={stageId} className="flex items-center gap-1.5">
                      <div className="w-[55px] shrink-0 text-[9px] text-gray-400 truncate">{stageMap.get(stageId)?.label || stageId}</div>
                      <div className="flex-1 h-4 bg-white/[0.03] rounded-sm overflow-hidden">
                        <div className="h-full rounded-sm" style={{ width: `${Math.max(widthPct, 2)}%`, background: STAGE_COLORS[stageId] }} />
                      </div>
                      <div className="w-[40px] text-right text-[9px] font-bold text-gray-300 tabular-nums">
                        {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
                      </div>
                      {i > 0 && (
                        <div className="w-[28px] text-right text-[8px] text-gray-500 tabular-nums">{stageRate}%</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-white/5 space-y-0.5">
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-400">Booked</span>
                  <span className="font-bold text-emerald-400">{c.funnel.converted}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-400">Conv Rate</span>
                  <span className="font-bold text-white">{maxCount > 0 ? ((c.funnel.converted / maxCount) * 100).toFixed(2) : 0}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Trophy size={12} className="text-amber-400" />
          <span className="text-[11px] font-bold text-white">{winner.name}</span>
          <span className="text-[10px] text-emerald-300">{winner.rate.toFixed(2)}% overall conversion</span>
        </div>
      </div>
    </div>
  );
}
