import {
  LayoutDashboard, Users, Megaphone, GitCompareArrows, Scale, Share2, Map, Target,
  type LucideIcon,
} from 'lucide-react';

export type ViewKey = 'overview' | 'people' | 'marketing' | 'campaigns' | 'paths' | 'reconciliation' | 'attribution' | 'map';

export interface NavItem { key: ViewKey; label: string; icon: LucideIcon; }
export interface NavSection { title?: string; items: NavItem[]; }

export const NAV: NavSection[] = [
  { items: [{ key: 'overview', label: 'Overview', icon: LayoutDashboard }] },
  {
    title: 'Funnel',
    items: [
      { key: 'people', label: 'People Funnel', icon: Users },
      { key: 'marketing', label: 'Marketing Funnel', icon: Megaphone },
      { key: 'campaigns', label: 'Campaigns (UTM)', icon: Target },
      { key: 'paths', label: 'Conversion Paths', icon: Share2 },
    ],
  },
  {
    title: 'Measurement',
    items: [
      { key: 'reconciliation', label: 'Reconciliation', icon: GitCompareArrows },
      { key: 'attribution', label: 'Attribution', icon: Scale },
    ],
  },
  { title: 'Audience', items: [{ key: 'map', label: 'Geo & Demographics', icon: Map }] },
];

export const VIEW_TITLE: Record<ViewKey, string> = {
  overview: 'Overview',
  people: 'People Funnel',
  marketing: 'Marketing Funnel',
  campaigns: 'Campaigns',
  paths: 'Conversion Paths',
  reconciliation: 'Reconciliation',
  attribution: 'Attribution by Model',
  map: 'Geo & Demographics',
};

export const VIEW_SUBTITLE: Record<ViewKey, string> = {
  overview: 'Full-funnel performance at a glance',
  people: 'Person-level, deterministic — pixel-verified',
  marketing: 'Aggregate, platform-reported delivery',
  campaigns: 'utm_* captured per visit — campaign, source, medium',
  paths: 'Multi-touch journeys across channels',
  reconciliation: 'How many real people? One pixel-verified truth',
  attribution: 'Who gets credit? Total fixed, credit re-split',
  map: 'Where your audience lives and who they are',
};
