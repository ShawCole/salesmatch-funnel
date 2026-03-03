import { CARD_CONFIGS } from './Sidebar';

interface Props {
  visibility: Record<string, boolean>;
  onToggle: (id: string) => void;
}

export function MobileChartBar({ visibility, onToggle }: Props) {
  const activeCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div className="shrink-0 bg-gray-950/95 backdrop-blur-lg border-t border-white/10 px-2 py-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {CARD_CONFIGS.map(card => {
          const active = visibility[card.id] !== false;
          return (
            <button
              key={card.id}
              onClick={() => onToggle(card.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                active
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-gray-500 border border-white/5'
              }`}
            >
              {card.icon}
              {card.label}
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-gray-500 mt-1 px-1">
        {activeCount} of {CARD_CONFIGS.length} charts
      </div>
    </div>
  );
}
