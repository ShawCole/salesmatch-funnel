import type { PipelineConfig, PipelineNodes } from './types';
import { NODE_ORDER, NODE_META } from './types';

const STAGE_COLORS = ['#a855f7', '#6366f1', '#818cf8', '#3b82f6', '#14b8a6', '#10b981'];
const STAGE_WIDTHS = [100, 72, 50, 32, 18, 8];

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
  const getCount = (pipelineId: string, nodeId: string): number | null => {
    const key = `${pipelineId}.${nodeId}`;
    if (key in overrides) return overrides[key];
    const p = config.pipelines.find(p => p.id === pipelineId);
    if (!p) return null;
    return p.nodes[nodeId as keyof PipelineNodes]?.count ?? null;
  };

  const tamCount = config.tam?.count ?? null;

  const pipelineAggregates = NODE_ORDER.map(nodeId => {
    let sum: number | null = null;
    for (const p of config.pipelines) {
      const c = getCount(p.id, nodeId);
      if (c != null) sum = (sum ?? 0) + c;
    }
    return { nodeId, count: sum };
  });

  // Build full stage list: TAM first, then pipeline nodes
  const stages: { key: string; label: string; description: string; count: number | null }[] = [];

  if (tamCount != null) {
    stages.push({
      key: 'tam',
      label: 'Total Addressable Market',
      description: config.tam!.description,
      count: tamCount,
    });
  }

  for (const agg of pipelineAggregates) {
    const meta = NODE_META[agg.nodeId];
    stages.push({
      key: agg.nodeId,
      label: meta.label,
      description: meta.description,
      count: agg.count,
    });
  }

  // If no TAM, use the original 5-stage colors/widths
  const colors = tamCount != null ? STAGE_COLORS : STAGE_COLORS.slice(1);
  const widths = tamCount != null ? STAGE_WIDTHS : STAGE_WIDTHS.slice(1);

  return (
    <div className="glass rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Pipeline Overview</h3>
        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md">{config.timeframe}</span>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {stages.map((stage, i) => {
          const barWidth = widths[i] ?? 6;
          const color = colors[i] ?? '#10b981';
          const prevCount = i > 0 ? stages[i - 1].count : null;
          const convRate = prevCount != null && prevCount > 0 && stage.count != null
            ? ((stage.count / prevCount) * 100).toFixed(1)
            : null;

          const isTam = stage.key === 'tam';

          return (
            <div key={stage.key} className="flex items-center gap-2 md:gap-3 group">
              {/* Label */}
              <div className="w-[80px] md:w-[120px] shrink-0">
                <div className={`text-[10px] md:text-[11px] font-medium ${isTam ? 'text-purple-300' : 'text-gray-200'}`}>
                  {isTam ? 'TAM' : stage.label}
                </div>
                <div className="text-[8px] text-gray-500 hidden md:block">
                  {isTam ? 'Total Addressable Market' : stage.description}
                </div>
              </div>

              {/* Bar */}
              <div className="flex-1 flex justify-center">
                <div
                  className="h-8 md:h-10 rounded-md transition-all duration-500 hover:brightness-125 relative overflow-hidden"
                  style={{
                    width: `${barWidth}%`,
                    background: isTam
                      ? `linear-gradient(135deg, ${color}, #7c3aed)`
                      : `linear-gradient(135deg, ${color}, ${color}cc)`,
                    borderRadius: i === 0 ? '8px 8px 4px 4px' : i === stages.length - 1 ? '4px 4px 8px 8px' : '4px',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" style={{ height: '40%' }} />
                </div>
              </div>

              {/* Count + rate */}
              <div className="w-[70px] md:w-[90px] text-right shrink-0">
                <div className={`text-[11px] md:text-sm font-bold tabular-nums ${isTam ? 'text-purple-200' : 'text-white'}`}>
                  {fmtCount(stage.count)}
                </div>
                {convRate && (
                  <div className="text-[8px] text-gray-500 tabular-nums">
                    {isTam ? '' : `${convRate}% from above`}
                  </div>
                )}
                {/* Show "~3% in-market" on first intent row after TAM */}
                {i === 1 && isTam === false && tamCount != null && stage.count != null && (
                  <div className="text-[8px] text-amber-400/70 tabular-nums">
                    {((stage.count / tamCount) * 100).toFixed(1)}% in-market
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TAM context callout */}
      {tamCount != null && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
          <div className="text-[9px] text-purple-300/80">
            <span className="font-bold">TAM:</span> {config.tam!.description}
            <span className="text-gray-500 ml-2">
              — ~3% actively searching, 7–10% would buy
            </span>
          </div>
        </div>
      )}

      {/* Per-pipeline breakdown */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {config.pipelines.map(p => {
            const ic = getCount(p.id, 'intentCore');
            const meta = getCount(p.id, 'metaAudience');
            const matchRate = ic != null && meta != null && ic > 0 ? ((meta / ic) * 100).toFixed(1) : null;
            const tamPct = tamCount != null && ic != null ? ((ic / tamCount) * 100).toFixed(1) : null;

            return (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-gray-200 truncate">{p.name}</div>
                  <div className="text-[8px] text-gray-500 truncate">{p.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-white tabular-nums">{fmtCount(ic)}</div>
                  {tamPct && (
                    <div className="text-[8px] text-amber-400/60 tabular-nums">{tamPct}% of TAM</div>
                  )}
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
