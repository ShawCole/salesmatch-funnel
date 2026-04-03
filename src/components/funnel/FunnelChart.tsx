import { MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { FunnelStages, StageDefinition } from './types';
import { STAGE_ORDER, STAGE_COLORS } from './types';

interface FunnelChartProps {
  funnel: FunnelStages;
  stages: StageDefinition[];
  onStageClick: (stage: string) => void;
  onAction: (stage: string, action: string) => void;
  label?: string;
}

// Progressive taper widths for each stage
const STAGE_WIDTHS = [100, 78, 62, 50, 40, 32, 22, 16];

export function FunnelChart({ funnel, stages, onStageClick, onAction, label = 'Today' }: FunnelChartProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const stageMap = new Map(stages.map(s => [s.id, s]));

  return (
    <div className="glass rounded-xl p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Funnel Report <span className="text-gray-400 font-normal">({label})</span></h3>
      </div>
      <div className="space-y-1">
        {STAGE_ORDER.map((stageId, i) => {
          const count = funnel[stageId];
          const barWidth = STAGE_WIDTHS[i];
          const color = STAGE_COLORS[stageId];
          const stageDef = stageMap.get(stageId);

          return (
            <div key={stageId} className="flex items-center gap-3 group">
              <div className="w-[130px] shrink-0">
                <div className="text-[11px] text-gray-300 font-medium">{stageDef?.label || stageId}</div>
                <div className="text-[9px] text-gray-500">{stageDef?.description || ''}</div>
              </div>
              <div className="flex-1 flex justify-center">
                <button
                  onClick={() => onStageClick(stageId)}
                  className="h-9 rounded-md transition-all duration-300 hover:brightness-125 cursor-pointer"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                    borderRadius: i === 0 ? '6px 6px 3px 3px' : i === STAGE_ORDER.length - 1 ? '3px 3px 6px 6px' : '3px',
                  }}
                />
              </div>
              <div className="w-[65px] text-right text-[11px] font-bold text-gray-200 tabular-nums flex items-center justify-end gap-1.5">
                <span className="w-px h-3 bg-gray-700" />
                {count.toLocaleString()}
              </div>
              <div className="relative" ref={menuOpen === stageId ? menuRef : undefined}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === stageId ? null : stageId); }}
                  className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuOpen === stageId && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl py-1">
                    <button onClick={() => { onAction(stageId, 'map'); setMenuOpen(null); }} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">View on Map</button>
                    <button onClick={() => { onAction(stageId, 'assets'); setMenuOpen(null); }} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">View Assets</button>
                    <button className="w-full text-left px-3 py-2 text-xs text-gray-500 cursor-not-allowed">Create Audience <span className="text-[9px] text-gray-600">Soon</span></button>
                    <button className="w-full text-left px-3 py-2 text-xs text-gray-500 cursor-not-allowed">Export CSV <span className="text-[9px] text-gray-600">Soon</span></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
