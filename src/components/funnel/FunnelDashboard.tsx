import { useState, useEffect } from 'react';
import type { FunnelConfig, Campaign, FunnelStages, Movement } from './types';
import { HighlightBar } from './HighlightBar';
import { FunnelChart } from './FunnelChart';
import { FunnelMovement } from './FunnelMovement';
import { CampaignFilter } from './CampaignFilter';
import { CampaignHeader } from './CampaignHeader';
import { FunnelComparison } from './FunnelComparison';

export function FunnelDashboard() {
  const [config, setConfig] = useState<FunnelConfig | null>(null);
  const [activeCampaign, setActiveCampaign] = useState('all');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  useEffect(() => {
    fetch('/funnel-config.json').then(r => r.json()).then(setConfig).catch(console.error);
  }, []);

  if (!config) {
    return <div className="flex items-center justify-center h-screen"><div className="w-10 h-10 rounded-full border-[3px] border-gray-700 border-t-purple-500 animate-spin" /></div>;
  }

  const selected = activeCampaign !== 'all' ? config.campaigns.find(c => c.id === activeCampaign) : null;
  const funnel: FunnelStages = selected ? selected.funnel : config.aggregate.funnel;
  const movement: Movement = selected ? selected.movement : config.aggregate.movement;

  const handleStageClick = (_stage: string) => {
    const link = selected?.audienceLink || config.campaigns[0]?.audienceLink;
    if (link) window.open(link, '_blank');
  };

  const handleAction = (stage: string, action: string) => {
    if (action === 'map') handleStageClick(stage);
  };

  const handleSelect = (id: string) => {
    if (compareMode) {
      setCompareSelection(prev => {
        if (id === 'all') return [];
        if (prev.includes(id)) return prev.filter(x => x !== id);
        if (prev.length >= 4) return prev;
        return [...prev, id];
      });
    } else {
      setActiveCampaign(id);
    }
  };

  const handleToggleCompare = () => {
    if (compareMode) { setCompareMode(false); setCompareSelection([]); }
    else { setCompareMode(true); setCompareSelection(config.campaigns.map(c => c.id)); }
  };

  const compareCampaigns = compareSelection.map(id => config.campaigns.find(c => c.id === id)).filter(Boolean) as Campaign[];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold"><span className="text-purple-400">{config.client}</span> Marketing Dashboard</h1>
            <p className="text-xs text-gray-400 mt-1">Real data flow — from intent signals to conversions</p>
          </div>
          <a href="https://salesmatch-explorer.netlify.app" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/20 hover:bg-purple-600/30 transition-colors">Open Map Explorer</a>
        </div>

        <HighlightBar data={config.highlights} />

        <CampaignFilter campaigns={config.campaigns} active={activeCampaign} onSelect={handleSelect} onCompare={handleToggleCompare} compareMode={compareMode} />

        {selected && !compareMode && <CampaignHeader campaign={selected} />}

        {compareMode && compareCampaigns.length >= 2 ? (
          <FunnelComparison campaigns={compareCampaigns} stages={config.stages} />
        ) : (
          <div className="flex gap-4 flex-col lg:flex-row">
            <FunnelChart funnel={funnel} stages={config.stages} onStageClick={handleStageClick} onAction={handleAction} />
            <FunnelMovement movement={movement} stages={config.stages} />
          </div>
        )}

        {activeCampaign === 'all' && !compareMode && (
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Per Campaign Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.campaigns.map(c => (
                <button key={c.id} onClick={() => setActiveCampaign(c.id)} className="glass rounded-xl p-4 text-left hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                    <span className="text-xs font-bold text-white">{c.name}</span>
                    <span className="text-[9px] text-gray-500">{c.label}</span>
                    <span className="ml-auto text-[10px] text-gray-500 group-hover:text-purple-400 transition-colors">View details →</span>
                  </div>
                  <div className="flex gap-4 text-[10px]">
                    <div><span className="text-gray-500">Searching</span><div className="font-bold text-white">{c.funnel.searching.toLocaleString()}</div></div>
                    <div><span className="text-gray-500">TOFU</span><div className="font-bold text-white">{c.funnel.tofu.toLocaleString()}</div></div>
                    <div><span className="text-gray-500">Hot</span><div className="font-bold text-amber-400">{c.funnel.hot.toLocaleString()}</div></div>
                    <div><span className="text-gray-500">Converted</span><div className="font-bold text-emerald-400">{c.funnel.converted}</div></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
