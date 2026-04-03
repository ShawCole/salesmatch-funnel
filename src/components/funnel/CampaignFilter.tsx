import type { Campaign } from './types';

interface CampaignFilterProps {
  campaigns: Campaign[];
  active: string;
  onSelect: (id: string) => void;
  onCompare: () => void;
  compareMode: boolean;
}

export function CampaignFilter({ campaigns, active, onSelect, onCompare, compareMode }: CampaignFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelect('all')}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          active === 'all'
            ? 'bg-purple-600/30 text-purple-200 border border-purple-400/30 shadow-lg shadow-purple-500/10'
            : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-200'
        }`}
      >
        All Campaigns
      </button>

      {campaigns.map(c => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            active === c.id
              ? 'text-white border shadow-lg'
              : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-200'
          }`}
          style={active === c.id ? { borderColor: c.color + '60', background: c.color + '20', boxShadow: `0 4px 12px ${c.color}15` } : undefined}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
          {c.name}
        </button>
      ))}

      <div className="w-px h-5 bg-white/10 mx-1" />

      <button
        onClick={onCompare}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          compareMode
            ? 'bg-amber-600/30 text-amber-200 border border-amber-400/30'
            : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-200'
        }`}
      >
        Compare
      </button>
    </div>
  );
}
