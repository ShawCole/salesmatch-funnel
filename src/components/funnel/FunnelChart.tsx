import { MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { FunnelStages } from './types';
import { STAGE_LABELS } from './types';

interface FunnelChartProps {
  funnel: FunnelStages;
  onStageClick: (stage: string) => void;
  onAction: (stage: string, action: string) => void;
  label?: string;
}

const STAGES = ['targeted', 'awareness', 'interest', 'consideration', 'evaluation'] as const;
const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

export function FunnelChart({ funnel, onStageClick, onAction, label = 'Today' }: FunnelChartProps) {
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

  const maxCount = funnel.targeted;

  return (
    <div className="glass rounded-xl p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Funnel Report <span className="text-gray-400 font-normal">({label})</span></h3>
      </div>
      <div className="space-y-3">
        {STAGES.map((stage, i) => {
          const count = funnel[stage];
          const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          // Taper: minimum width so even small counts show
          const displayWidth = Math.max(widthPct, 8);

          return (
            <div key={stage} className="flex items-center gap-3 group">
              <div className="w-[120px] shrink-0 text-xs text-gray-300 font-medium">
                {STAGE_LABELS[stage]}
              </div>
              <div className="flex-1 relative h-8">
                <button
                  onClick={() => onStageClick(stage)}
                  className="h-full rounded-md transition-all duration-300 hover:brightness-110 cursor-pointer relative"
                  style={{
                    width: `${displayWidth}%`,
                    background: `linear-gradient(135deg, ${COLORS[i]}, ${COLORS[Math.min(i + 1, 4)]})`,
                    clipPath: i === 0 ? undefined : `polygon(2% 0%, 100% 0%, ${100 - i * 1.5}% 100%, 0% 100%)`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/90 drop-shadow">
                    {count.toLocaleString()}
                  </span>
                </button>
              </div>
              <div className="w-[60px] text-right text-xs font-bold text-gray-200 tabular-nums">
                {count.toLocaleString()}
              </div>
              <div className="relative" ref={menuOpen === stage ? menuRef : undefined}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === stage ? null : stage); }}
                  className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuOpen === stage && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl py-1">
                    <button onClick={() => { onAction(stage, 'map'); setMenuOpen(null); }} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">View on Map</button>
                    <button className="w-full text-left px-3 py-2 text-xs text-gray-500 cursor-not-allowed">View Assets <span className="text-[9px] text-gray-600">Soon</span></button>
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
