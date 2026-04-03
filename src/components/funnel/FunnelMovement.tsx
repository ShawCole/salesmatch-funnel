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

      <div className="space-y-4">
        {STAGE_ORDER.map((stage, i) => {
          const { entered, left } = movement[stage];
          const enteredPct = maxVal > 0 ? (entered / maxVal) * 100 : 0;
          const leftPct = maxVal > 0 ? (left / maxVal) * 100 : 0;

          return (
            <div key={stage}>
              <div className="flex items-center gap-3">
                <div className="w-[100px] shrink-0 text-xs text-gray-300 font-medium">{STAGE_LABELS[stage]}</div>
                <div className="flex-1 flex items-center gap-1">
                  {/* Left count (exited) */}
                  {left > 0 && (
                    <span className="text-[10px] font-bold text-rose-400 tabular-nums w-8 text-right">{left}</span>
                  )}
                  {/* Entered bar (teal) */}
                  <div
                    className="h-6 rounded-sm transition-all duration-500"
                    style={{ width: `${Math.max(enteredPct, 4)}%`, background: '#14b8a6' }}
                  />
                  {/* Left bar (pink) */}
                  {left > 0 && (
                    <div
                      className="h-6 rounded-sm transition-all duration-500"
                      style={{ width: `${Math.max(leftPct, 4)}%`, background: '#f43f5e' }}
                    />
                  )}
                  {/* Entered count */}
                  <span className="text-[10px] font-bold text-teal-400 tabular-nums">{entered}</span>
                </div>
              </div>
              {/* Connector arrow */}
              {i < STAGE_ORDER.length - 1 && (
                <div className="ml-[112px] h-3 flex items-center">
                  <div className="w-px h-full bg-gray-700 ml-2" />
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
