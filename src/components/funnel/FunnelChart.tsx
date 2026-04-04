import type { PipelineConfig, PipelineNodes } from './types';
import { NODE_ORDER, NODE_META } from './types';

const STAGE_COLORS = ['#6366f1', '#818cf8', '#3b82f6', '#14b8a6', '#10b981'];
const STAGE_WIDTHS = [100, 68, 42, 24, 12];

function fmtCount(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface FunnelChartProps {
  config: PipelineConfig;
  overrides: Record<string, number | null>;
}

export function FunnelChart({ config, overrides }: FunnelChartProps) {
  // Aggregate counts across all pipelines
  const getCount = (pipelineId: string, nodeId: string): number | null => {
    const key = `${pipelineId}.${nodeId}`;
    if (key in overrides) return overrides[key];
    const p = config.pipelines.find(p => p.id === pipelineId);
    if (!p) return null;
    return p.nodes[nodeId as keyof PipelineNodes]?.count ?? null;
  };

  const aggregates = NODE_ORDER.map(nodeId => {
    let sum: number | null = null;
    for (const p of config.pipelines) {
      const c = getCount(p.id, nodeId);
      if (c != null) sum = (sum ?? 0) + c;
    }
    return { nodeId, count: sum };
  });

  return (
    <div className="glass rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Pipeline Overview</h3>
        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md">{config.timeframe}</span>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {aggregates.map(({ nodeId, count }, i) => {
          const meta = NODE_META[nodeId];
          const barWidth = STAGE_WIDTHS[i];
          const color = STAGE_COLORS[i];
          const prevCount = i > 0 ? aggregates[i - 1].count : null;
          const convRate = prevCount != null && prevCount > 0 && count != null
            ? ((count / prevCount) * 100).toFixed(1)
            : null;

          return (
            <div key={nodeId} className="flex items-center gap-2 md:gap-3 group">
              {/* Label */}
              <div className="w-[80px] md:w-[120px] shrink-0">
                <div className="text-[10px] md:text-[11px] text-gray-200 font-medium">{meta.label}</div>
                <div className="text-[8px] text-gray-500 hidden md:block">{meta.description}</div>
              </div>

              {/* Bar */}
              <div className="flex-1 flex justify-center">
                <div
                  className="h-8 md:h-10 rounded-md transition-all duration-500 hover:brightness-125 relative overflow-hidden"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                    borderRadius: i === 0 ? '8px 8px 4px 4px' : i === aggregates.length - 1 ? '4px 4px 8px 8px' : '4px',
                  }}
                >
                  {/* Subtle inner shine */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" style={{ height: '40%' }} />
                </div>
              </div>

              {/* Count + rate */}
              <div className="w-[70px] md:w-[90px] text-right shrink-0">
                <div className="text-[11px] md:text-sm font-bold text-white tabular-nums">{fmtCount(count)}</div>
                {convRate && (
                  <div className="text-[8px] text-gray-500 tabular-nums">{convRate}% from above</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-pipeline breakdown */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {config.pipelines.map(p => {
            const ic = getCount(p.id, 'intentCore');
            const meta = getCount(p.id, 'metaAudience');
            const matchRate = ic != null && meta != null && ic > 0 ? ((meta / ic) * 100).toFixed(1) : null;

            return (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-gray-200 truncate">{p.name}</div>
                  <div className="text-[8px] text-gray-500 truncate">{p.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-white tabular-nums">{fmtCount(ic)}</div>
                  {matchRate && (
                    <div className="text-[8px] text-gray-500 tabular-nums">{matchRate}% matched</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
