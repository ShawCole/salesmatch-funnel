// Mock data model for the Full-Funnel Attribution dashboard.
// Numbers are simulated and tick live in the UI to illustrate the product.

export type PlatformKey = 'meta' | 'google' | 'linkedin' | 'tiktok' | 'dsp' | 'email';

export interface Platform {
  key: PlatformKey;
  name: string;
  color: string;
}

export const PLATFORMS: Record<PlatformKey, Platform> = {
  meta:     { key: 'meta',     name: 'Meta',     color: '#1877F2' },
  google:   { key: 'google',   name: 'Google',   color: '#ea4335' },
  linkedin: { key: 'linkedin', name: 'LinkedIn', color: '#0A66C2' },
  tiktok:   { key: 'tiktok',   name: 'TikTok',   color: '#25F4EE' },
  dsp:      { key: 'dsp',      name: 'DSP',      color: '#10b981' },
  email:    { key: 'email',    name: 'Email',    color: '#f59e0b' },
};

export const PLATFORM_ORDER: PlatformKey[] = ['meta', 'google', 'linkedin', 'tiktok', 'dsp', 'email'];

export type StageKey = 'intent' | 'impr' | 'click' | 'visit' | 'retarget' | 'conv';

export interface Stage {
  key: StageKey;
  icon: string;
  name: string;
  desc: string;
  count: number;
  /** relative per-platform weights; absolute = count * weight / sum(weights) */
  split: Record<PlatformKey, number>;
  seed?: boolean;   // upstream intent audience, no platform split
  pixel?: boolean;  // ArkData pixel-owned stage
  /** visual bar width as % of the widest stage (impressions = 100) */
  barWidth: number;
  /** accent tint for the stage row */
  tint: string;
}

const z: Record<PlatformKey, number> = { meta: 0, google: 0, linkedin: 0, tiktok: 0, dsp: 0, email: 0 };

// Base funnel for "All Pipelines" over the default 30d window.
export const BASE_STAGES: Stage[] = [
  { key: 'intent',   icon: '🔍', name: 'Intent Audience', desc: 'Intent vendor',     count: 965,    split: { ...z },                                              seed: true,  barWidth: 60,  tint: '#a855f7' },
  { key: 'impr',     icon: '📡', name: 'Impressions',     desc: 'Ad delivery',       count: 892000, split: { ...z, meta: 48, google: 31, linkedin: 14, tiktok: 3, dsp: 4 },              barWidth: 100, tint: '#6366f1' },
  { key: 'click',    icon: '👆', name: 'Clicks',          desc: 'Ad clicks',         count: 12400,  split: { ...z, meta: 46, google: 30, linkedin: 17, tiktok: 2, dsp: 5 },              barWidth: 42,  tint: '#818cf8' },
  { key: 'visit',    icon: '👁', name: 'LP Visitors',     desc: 'ArkData pixel',     count: 3180,   split: { ...z, meta: 44, google: 29, linkedin: 19, tiktok: 2, dsp: 4, email: 2 },     pixel: true, barWidth: 28,  tint: '#3b82f6' },
  { key: 'retarget', icon: '🎯', name: 'Retarget Aud.',   desc: 'Pixel → sync',      count: 2910,   split: { ...z, meta: 52, google: 24, linkedin: 20, dsp: 2, email: 2 },               barWidth: 25,  tint: '#14b8a6' },
  { key: 'conv',     icon: '✓',  name: 'Converted',       desc: 'Pixel-verified',    count: 38,     split: { ...z, meta: 41, google: 26, linkedin: 28, dsp: 1, email: 4 },               barWidth: 9,   tint: '#10b981' },
];

export const TAM = 15596;

// Attribution-model presets change how conversion credit splits across platforms.
export const ATTRIBUTION_PRESETS: Record<string, Record<PlatformKey, number>> = {
  last:   { ...z, meta: 41, google: 26, linkedin: 28, dsp: 1, email: 4 },
  first:  { ...z, meta: 55, google: 30, linkedin: 9,  dsp: 4, email: 2 },
  linear: { ...z, meta: 46, google: 27, linkedin: 20, dsp: 3, email: 4 },
  decay:  { ...z, meta: 43, google: 25, linkedin: 26, dsp: 2, email: 4 },
};

export const ATTRIBUTION_MODELS = [
  { key: 'last',   label: 'Last-touch' },
  { key: 'first',  label: 'First-touch' },
  { key: 'linear', label: 'Linear' },
  { key: 'decay',  label: 'Time-decay' },
] as const;

export const PIPELINES = [
  { key: 'all',   label: 'All Pipelines', color: '#a855f7', scale: 1 },
  { key: 'sales', label: 'Sales Hires',   color: '#6366f1', scale: 0.4 },
  { key: 'csm',   label: 'CSM Hires',     color: '#10b981', scale: 0.6 },
] as const;

export const DATE_RANGES = ['Last 7 days', 'Last 14 days', 'Last 30 days', 'Last 60 days'] as const;

// ---- helpers ----

export function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

export function fmtMoney(cents: number): string {
  const d = cents / 100;
  if (d >= 1e6) return '$' + (d / 1e6).toFixed(1) + 'M';
  if (d >= 1e3) return '$' + (d / 1e3).toFixed(1) + 'K';
  return '$' + d.toFixed(2);
}

/** Absolute per-platform counts for a stage. */
export function splitAbs(stage: Stage): Record<PlatformKey, number> {
  const sum = PLATFORM_ORDER.reduce((a, p) => a + (stage.split[p] || 0), 0);
  const out = { ...z };
  PLATFORM_ORDER.forEach((p) => {
    out[p] = sum > 0 ? Math.round(stage.count * (stage.split[p] || 0) / sum) : 0;
  });
  return out;
}

export function scaledStages(scale: number, convSplit: Record<PlatformKey, number>): Stage[] {
  return BASE_STAGES.map((s) => ({
    ...s,
    count: Math.round(s.count * scale),
    split: s.key === 'conv' ? { ...convSplit } : { ...s.split },
  }));
}

// ---- live feed pools ----
export const FEED_NAMES = ['A. Rivera', 'M. Chen', 'J. Okafor', 'S. Patel', 'L. Müller', 'D. Kim', 'R. Santos', 'T. Nguyen', 'K. Abara', 'P. Lindqvist', 'C. Romano', 'B. Haddad'];
export const FEED_ROLES = ['VP Sales', 'Head of CS', 'CRO', 'Founder', 'COO', 'Dir. RevOps', 'VP Marketing', 'CXO'];
export const FEED_COMPANIES = ['Northwind', 'Lumen Agency', 'BrightPath', 'Acme Growth', 'Vertex Media', 'Cobalt Co', 'Pioneer Labs', 'Maple & Co'];
export const FEED_CITIES = ['Austin TX', 'Denver CO', 'Miami FL', 'Seattle WA', 'Boston MA', 'Chicago IL', 'Atlanta GA'];

const FEED_WEIGHTS: Record<PlatformKey, number> = { meta: 44, google: 29, linkedin: 19, email: 4, dsp: 2, tiktok: 2 };

export function pickFeedPlatform(): PlatformKey {
  const r = Math.random() * 100;
  let acc = 0;
  for (const k of PLATFORM_ORDER) {
    acc += FEED_WEIGHTS[k] || 0;
    if (r <= acc) return k;
  }
  return 'meta';
}

export function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
