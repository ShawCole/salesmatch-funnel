import type { Movement, StageDefinition } from './types';
import { MOVEMENT_STAGES } from './types';

interface FunnelMovementProps {
  movement: Movement;
  stages: StageDefinition[];
  timeframe?: string;
}

export function FunnelMovement({ movement, stages, timeframe = 'Past Month' }: FunnelMovementProps) {
  const stageMap = new Map(stages.map(s => [s.id, s]));
  const maxVal = Math.max(
    ...MOVEMENT_STAGES.flatMap(s => [movement[s].entered, movement[s].left])
  );

  return (
    <div className="glass rounded-xl p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Funnel Movement</h3>
        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md">{timeframe}</span>
      </div>

      <div className="space-y-2.5">
        {MOVEMENT_STAGES.map((stageId, i) => {
          const { entered, left } = movement[stageId];
          const enteredPct = maxVal > 0 ? (entered / maxVal) * 100 : 0;
          const leftPct = maxVal > 0 ? (left / maxVal) * 100 : 0;
          const stageDef = stageMap.get(stageId);

          return (
            <div key={stageId}>
              <div className="flex items-center gap-2">
                <div className="w-[85px] shrink-0 text-[10px] text-gray-300 font-medium truncate" title={stageDef?.label}>
                  {stageDef?.label || stageId}
                </div>
                <div className="flex-1 flex items-center gap-1 h-6">
                  {left > 0 && (
                    <span className="text-[9px] font-bold text-rose-400 tabular-nums min-w-[20px] text-right">{left}</span>
                  )}
                  <div className="h-full rounded-sm min-w-[3px]" style={{ width: `${Math.max(enteredPct, 5)}%`, background: '#14b8a6' }} />
                  {left > 0 && (
                    <div className="h-full rounded-sm min-w-[3px]" style={{ width: `${Math.max(leftPct, 5)}%`, background: '#f43f5e' }} />
                  )}
                  <span className="text-[9px] font-bold text-teal-400 tabular-nums min-w-[20px]">{entered}</span>
                </div>
              </div>
              {i < MOVEMENT_STAGES.length - 1 && (
                <div className="ml-[90px] h-1.5 flex items-center">
                  <div className="w-px h-full bg-gray-700/40 ml-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#14b8a6' }} /> Entered
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f43f5e' }} /> Left
        </div>
      </div>
    </div>
  );
}
