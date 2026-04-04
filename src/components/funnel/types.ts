export interface Highlight {
  value: number;
  trend: number;
}

export interface Highlights {
  totalSpend: Highlight;
  impressions: Highlight;
  clicks: Highlight;
  avgCTR: Highlight;
  avgCPC: Highlight;
  influencedAccounts: Highlight;
}

export interface Asset {
  type: 'image' | 'video';
  platform: string;
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface PipelineNode {
  count: number | null;
  refreshDays?: number;
  status?: string;
  landingPage?: string;
}

export interface PipelineNodes {
  intentCore: PipelineNode;
  metaAudience: PipelineNode;
  lpVisitors: PipelineNode;
  retargetAudience: PipelineNode;
  converted: PipelineNode;
}

export interface PipelineAssets {
  tofu?: Asset[];
  bofu?: Asset[];
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  color: string;
  nodes: PipelineNodes;
  tofuCampaign: string;
  bofuCampaign: string;
  assets: PipelineAssets;
  audienceLink: string;
}

export interface PipelineConfig {
  client: string;
  timeframe: string;
  highlights: Highlights;
  pipelines: Pipeline[];
}

export const NODE_ORDER: (keyof PipelineNodes)[] = [
  'intentCore',
  'metaAudience',
  'lpVisitors',
  'retargetAudience',
  'converted',
];

export const NODE_META: Record<keyof PipelineNodes, { label: string; description: string; icon: string }> = {
  intentCore: { label: 'Intent Audience', description: 'IntentCore 3rd party', icon: '🔍' },
  metaAudience: { label: 'Ad Audience', description: 'Meta Custom Audience', icon: '📡' },
  lpVisitors: { label: 'LP Visitors', description: 'ArkData pixel', icon: '👁' },
  retargetAudience: { label: 'Retarget', description: 'Pixel → Meta sync', icon: '🎯' },
  converted: { label: 'Converted', description: 'Booked / submitted', icon: '✓' },
};
