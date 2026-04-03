import { Image, Video } from 'lucide-react';
import type { Campaign, Asset } from './types';

function AssetCard({ asset }: { asset: Asset }) {
  const Icon = asset.type === 'video' ? Video : Image;
  const platformColors: Record<string, string> = {
    meta: '#1877F2',
    dsp: '#10b981',
    linkedin: '#0A66C2',
    email: '#f59e0b',
  };

  return (
    <div className="glass rounded-lg p-3 min-w-[180px] hover:bg-white/[0.04] transition-colors">
      {/* Placeholder thumbnail */}
      <div className="h-20 rounded-md bg-white/5 flex items-center justify-center mb-2 border border-white/5">
        <Icon size={24} className="text-gray-500" />
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: platformColors[asset.platform] || '#888' }} />
        <span className="text-[9px] font-semibold text-gray-400 uppercase">{asset.platform}</span>
        <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-gray-500">{asset.type}</span>
      </div>
      <div className="text-[10px] text-gray-300 font-medium truncate mb-2" title={asset.label}>{asset.label}</div>
      <div className="flex gap-2 text-[9px] text-gray-500">
        <span>{(asset.impressions / 1000).toFixed(0)}K imp</span>
        <span>{(asset.clicks / 1000).toFixed(1)}K clicks</span>
        <span className="font-bold text-teal-400">{asset.ctr}% CTR</span>
      </div>
    </div>
  );
}

function AssetSection({ title, assets, color }: { title: string; assets?: Asset[]; color: string }) {
  if (!assets || assets.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
        <span className="text-[9px] text-gray-500">{assets.length} asset{assets.length > 1 ? 's' : ''}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {assets.map((a, i) => <AssetCard key={i} asset={a} />)}
      </div>
    </div>
  );
}

export function CampaignHeader({ campaign }: { campaign: Campaign }) {
  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: campaign.color }} />
        <span className="text-sm font-bold text-white">{campaign.name}</span>
        <span className="text-xs text-gray-500">— {campaign.label}</span>
        <a
          href={campaign.audienceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
        >
          View on Map →
        </a>
      </div>

      <AssetSection title="TOFU — Pattern Interrupt" assets={campaign.assets.tofu} color="#818cf8" />
      <AssetSection title="MOFU — Social Proof" assets={campaign.assets.mofu} color="#2563eb" />
      <AssetSection title="BOFU — Direct CTA" assets={campaign.assets.bofu} color="#10b981" />
    </div>
  );
}
