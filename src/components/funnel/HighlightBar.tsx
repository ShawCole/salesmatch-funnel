import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Highlights } from './types';

function fmt(value: number, prefix = '', suffix = ''): string {
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M${suffix}`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K${suffix}`;
  return `${prefix}${value.toLocaleString()}${suffix}`;
}

function HighlightCard({ label, value, trend }: { label: string; value: string; trend: number }) {
  const isPositive = trend >= 0;
  return (
    <div className="glass rounded-xl p-4 flex-1 min-w-[130px]">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-xl font-bold text-white mb-1">{value}</div>
      <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {isPositive ? '+' : ''}{trend.toFixed(1)}%
      </div>
    </div>
  );
}

export function HighlightBar({ data }: { data: Highlights }) {
  return (
    <div className="flex gap-3 flex-wrap">
      <HighlightCard label="Total Spend" value={fmt(data.totalSpend.value, '$')} trend={data.totalSpend.trend} />
      <HighlightCard label="Impressions" value={fmt(data.impressions.value)} trend={data.impressions.trend} />
      <HighlightCard label="Clicks" value={fmt(data.clicks.value)} trend={data.clicks.trend} />
      <HighlightCard label="Average CTR" value={`${data.avgCTR.value.toFixed(2)}%`} trend={data.avgCTR.trend} />
      <HighlightCard label="Average CPC" value={`$${data.avgCPC.value.toFixed(2)}`} trend={data.avgCPC.trend} />
      <HighlightCard label="Influenced Accounts" value={fmt(data.influencedAccounts.value)} trend={data.influencedAccounts.trend} />
    </div>
  );
}
