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

export interface StageMovement {
  entered: number;
  left: number;
}

export interface FunnelStages {
  searching: number;
  tofu: number;
  visitors: number;
  mofu: number;
  repeat: number;
  bofu: number;
  hot: number;
  converted: number;
}

export interface Movement {
  tofu: StageMovement;
  visitors: StageMovement;
  mofu: StageMovement;
  repeat: StageMovement;
  bofu: StageMovement;
  hot: StageMovement;
  converted: StageMovement;
}

export interface CampaignAssets {
  tofu?: Asset[];
  mofu?: Asset[];
  bofu?: Asset[];
}

export interface StageDefinition {
  id: string;
  label: string;
  description: string;
}

export interface Campaign {
  id: string;
  name: string;
  label: string;
  color: string;
  funnel: FunnelStages;
  movement: Movement;
  assets: CampaignAssets;
  audienceLink: string;
}

export interface FunnelConfig {
  client: string;
  timeframe: string;
  highlights: Highlights;
  stages: StageDefinition[];
  campaigns: Campaign[];
  aggregate: {
    funnel: FunnelStages;
    organicVisitors: number;
    movement: Movement;
  };
}

export const STAGE_ORDER: (keyof FunnelStages)[] = ['searching', 'tofu', 'visitors', 'mofu', 'repeat', 'bofu', 'hot', 'converted'];

export const STAGE_COLORS: Record<string, string> = {
  searching: '#6366f1',
  tofu: '#818cf8',
  visitors: '#3b82f6',
  mofu: '#2563eb',
  repeat: '#14b8a6',
  bofu: '#10b981',
  hot: '#f59e0b',
  converted: '#ef4444',
};

export const MOVEMENT_STAGES: (keyof Movement)[] = ['tofu', 'visitors', 'mofu', 'repeat', 'bofu', 'hot', 'converted'];
