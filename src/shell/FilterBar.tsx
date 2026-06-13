import { CalendarRange, GitCompareArrows, Filter, RefreshCw } from 'lucide-react';
import { Select } from '../ui/primitives';
import {
  useDashboard, DATE_PRESETS, COMPARE_PRESETS, type DateKey, type CompareKey, type ChannelFilter, type ModelKey,
} from '../state/dashboard';
import { PLATFORM_ORDER, PLATFORMS } from '../data/funnelMock';
import { ATTRIBUTION_MODELS } from '../data/funnelMock';
import { campaignFilterOptions } from '../data/utmMock';
import type { ViewKey } from './nav';

const campaignOpts = campaignFilterOptions();

const channelOpts: { key: ChannelFilter; label: string }[] = [
  { key: 'all', label: 'All channels' },
  ...PLATFORM_ORDER.map((p) => ({ key: p as ChannelFilter, label: PLATFORMS[p].name })),
];

/** Persistent, sticky filter bar — shared across every view. */
export function FilterBar({ view }: { view: ViewKey }) {
  const { date, setDate, compare, setCompare, channel, setChannel, campaignId, setCampaignId, model, setModel } = useDashboard();
  const showModel = view === 'marketing' || view === 'attribution' || view === 'paths';
  const showCampaign = view === 'marketing' || view === 'attribution' || view === 'campaigns' || view === 'overview';

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur">
      <CalendarRange size={14} className="text-muted-foreground" />
      <Select<DateKey> value={date} onChange={setDate} options={DATE_PRESETS.map((d) => ({ key: d.key, label: d.label }))} />
      <span className="text-muted-foreground"><GitCompareArrows size={14} /></span>
      <Select<CompareKey> value={compare} onChange={setCompare} options={COMPARE_PRESETS.map((c) => ({ key: c.key, label: c.label }))} />
      <span className="mx-0.5 h-4 w-px bg-border" />
      <Filter size={14} className="text-muted-foreground" />
      <Select<ChannelFilter> value={channel} onChange={setChannel} options={channelOpts} />
      {showCampaign && (
        <Select<string> value={campaignId} onChange={setCampaignId} options={campaignOpts} />
      )}
      {showModel && (
        <Select<ModelKey> value={model} onChange={(m) => setModel(m)} label="Model" options={ATTRIBUTION_MODELS.map((m) => ({ key: m.key as ModelKey, label: m.label }))} />
      )}
      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success))] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
        </span>
        Live · updated 14:05
        <button className="ml-1 rounded-md p-1 hover:bg-muted hover:text-foreground" title="Refresh"><RefreshCw size={13} /></button>
      </div>
    </div>
  );
}
