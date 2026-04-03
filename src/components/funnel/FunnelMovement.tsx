import type { Movement } from './types';
import { STAGE_ORDER, STAGE_LABELS } from './types';

interface FunnelMovementProps {
  movement: Movement;
  timeframe?: string;
}

export function FunnelMovement({ movement, timeframe = 'Past Month' }: FunnelMovementProps) {
  const maxVal = Math.max(
    ...STAGE_ORDER.flatMap(s => [movement[s].entered, movement[s].left])
  );

  return (
    <div className="glass rounded-xl p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Funnel Movement</h3>
        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md">{timeframe}</span>
      </div>

      <div className="space-y-3">
        {STAGE_ORDER.map((stage, i) => {
          const { entered, left } = movement[stage];
          const enteredPct = maxVal > 0 ? (entered / maxVal) * 100 : 0;
          const leftPct = maxVal > 0 ? (left / maxVal) * 100 : 0;

          return (
            <div key={stage}>
              <div className="flex items-center gap-2">
                <div className="w-[90px] shrink-0 text-[11px] text-gray-300 font-medium">{STAGE_LABELS[stage]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 h-7">
                    {/* Left count (exited) — shown before bars */}
                    {left > 0 && (
                      <span className="text-[10px] font-bold text-rose-400 tabular-nums min-w-[24px] text-right">{left}</span>
                    )}
                    {/* Entered bar (teal) */}
                    <div
                      className="h-full rounded-sm transition-all duration-500 min-w-[4px]"
                      style={{ width: `${Math.max(enteredPct, 6)}%`, background: '#14b8a6' }}
                    />
                    {/* Left bar (pink) */}
                    {left > 0 && (
                      <div
                        className="h-full rounded-sm transition-all duration-500 min-w-[4px]"
                        style={{ width: `${Math.max(leftPct, 6)}%`, background: '#f43f5e' }}
                      />
                    )}
                    {/* Entered count — shown after bars */}
                    <span className="text-[10px] font-bold text-teal-400 tabular-nums min-w-[24px]">{entered}</span>
                  </div>
                </div>
              </div>
              {/* Connector */}
              {i < STAGE_ORDER.length - 1 && (
                <div className="ml-[96px] h-2 flex items-center">
                  <div className="w-px h-full bg-gray-700/50 ml-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#14b8a6' }} /> Entered
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#f43f5e' }} /> Left
        </div>
      </div>
    </div>
  );
}
