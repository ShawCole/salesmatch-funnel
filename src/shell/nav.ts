import {
  LayoutDashboard, Users, Megaphone, GitCompareArrows, Scale, Share2, Map, Target, HandCoins, Sparkles, Settings as SettingsIcon, Table2, FlaskConical, SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

export type ViewKey = 'overview' | 'insights' | 'people' | 'marketing' | 'campaigns' | 'paths' | 'reconciliation' | 'attribution' | 'experiments' | 'mediamix' | 'payouts' | 'reports' | 'map' | 'settings';

export interface NavItem { key: ViewKey; label: string; icon: LucideIcon; }
export interface NavSection { title?: string; items: NavItem[]; }

export const NAV: NavSection[] = [
  { items: [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'insights', label: 'AI Insights', icon: Sparkles },
  ] },
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
      { key: 'experiments', label: 'Incrementality', icon: FlaskConical },
      { key: 'mediamix', label: 'Media Mix (MMM)', icon: SlidersHorizontal },
    ],
  },
  { title: 'Partners', items: [{ key: 'payouts', label: 'Partners & Payouts', icon: HandCoins }] },
  { title: 'Audience', items: [{ key: 'map', label: 'Geo & Demographics', icon: Map }] },
  { title: 'Workspace', items: [
    { key: 'reports', label: 'Reports', icon: Table2 },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
  ] },
];

export const VIEW_TITLE: Record<ViewKey, string> = {
  overview: 'Overview',
  insights: 'AI Insights',
  people: 'People Funnel',
  marketing: 'Marketing Funnel',
  campaigns: 'Campaigns',
  paths: 'Conversion Paths',
  reconciliation: 'Reconciliation',
  attribution: 'Attribution by Model',
  experiments: 'Incrementality',
  mediamix: 'Media Mix Modeling',
  payouts: 'Partners & Payouts',
  reports: 'Reports',
  map: 'Geo & Demographics',
  settings: 'Settings',
};

export const VIEW_SUBTITLE: Record<ViewKey, string> = {
  overview: 'Full-funnel performance at a glance',
  insights: 'What changed and why — with recommended actions',
  people: 'Person-level, deterministic — pixel-verified',
  marketing: 'Aggregate, platform-reported delivery',
  campaigns: 'utm_* captured per visit — campaign, source, medium',
  paths: 'Multi-touch journeys across channels',
  reconciliation: 'How many real people? One pixel-verified truth',
  attribution: 'Who gets credit? Total fixed, credit re-split',
  experiments: 'True causal lift — holdout & geo tests',
  mediamix: 'Diminishing returns + budget optimizer',
  payouts: 'Commissions paid on pixel-verified conversions',
  reports: 'Sortable detail across channels, campaigns and clients',
  map: 'Where your audience lives and who they are',
  settings: 'Integrations, white-label, team and alerts',
};
