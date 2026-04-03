import { Monitor, Globe, Calendar } from 'lucide-react';
import type { Campaign } from './types';

export function CampaignHeader({ campaign }: { campaign: Campaign }) {
  return (
    <div className="flex gap-3 flex-wrap">
      {/* Ad Set */}
      <div className="glass rounded-xl p-4 flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <Monitor size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ad Set</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/20">{campaign.adSet.platform}</span>
        </div>
        <div className="text-sm font-semibold text-white mb-2">"{campaign.adSet.headline}"</div>
        <div className="flex gap-3 text-[10px] text-gray-400">
          <span>CTR: <strong className="text-white">{campaign.adSet.ctr}%</strong></span>
          <span>CPC: <strong className="text-white">${campaign.adSet.cpc}</strong></span>
          <span>Spend: <strong className="text-white">${campaign.adSet.spend.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Landing Page */}
      <div className="glass rounded-xl p-4 flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={14} className="text-emerald-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Landing Page</span>
        </div>
        <div className="text-sm font-semibold text-white mb-2 truncate">{campaign.landingPage.url}</div>
        <div className="flex gap-3 text-[10px] text-gray-400">
          <span>Bounce: <strong className="text-white">{campaign.landingPage.bounceRate}%</strong></span>
          <span>Views: <strong className="text-white">{campaign.landingPage.pageViews.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Conversion */}
      <div className="glass rounded-xl p-4 flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-rose-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conversion</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-300 border border-rose-500/20">{campaign.conversion.type}</span>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{campaign.conversion.booked}</div>
        <div className="text-[10px] text-gray-400">
          Conv Rate: <strong className="text-emerald-400">{campaign.conversion.convRate}%</strong>
        </div>
      </div>
    </div>
  );
}
