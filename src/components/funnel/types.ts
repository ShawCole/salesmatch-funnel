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

export interface AdSet {
  platform: string;
  headline: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
}

export interface LandingPage {
  url: string;
  bounceRate: number;
  pageViews: number;
}

export interface Conversion {
  type: string;
  booked: number;
  convRate: number;
}

export interface FunnelStages {
  targeted: number;
  awareness: number;
  interest: number;
  consideration: number;
  evaluation: number;
}

export interface StageMovement {
  entered: number;
  left: number;
}

export interface Movement {
  awareness: StageMovement;
  interest: StageMovement;
  consideration: StageMovement;
  evaluation: StageMovement;
}

export interface Campaign {
  id: string;
  name: string;
  label: string;
  color: string;
  adSet: AdSet;
  landingPage: LandingPage;
  conversion: Conversion;
  funnel: FunnelStages;
  movement: Movement;
  audienceLink: string;
}

export interface FunnelConfig {
  client: string;
  timeframe: string;
  highlights: Highlights;
  campaigns: Campaign[];
  aggregate: {
    funnel: FunnelStages;
    movement: Movement;
  };
}

export const STAGE_ORDER: (keyof Omit<FunnelStages, 'targeted'>)[] = ['awareness', 'interest', 'consideration', 'evaluation'];
export const STAGE_LABELS: Record<string, string> = {
  targeted: 'Targeted Accounts',
  awareness: 'Awareness',
  interest: 'Interest',
  consideration: 'Consideration',
  evaluation: 'Evaluation',
};
