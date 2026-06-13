// Deterministic time-series generator for trend charts + KPI cards.
// Produces a current-period series and a comparison series (prior period),
// so every KPI carries a real "vs. prior" delta + a sparkline, and the main
// trend chart can overlay the two. All simulated; seeded so it's stable.
import { PLATFORM_ORDER, PLATFORMS, type PlatformKey } from './funnelMock';

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface SeriesPoint { i: number; label: string; current: number; previous: number; }
export interface MetricSeries {
  key: string;
  points: SeriesPoint[];
  total: number;
  prevTotal: number;
  deltaPct: number;        // current vs prior, %
  spark: number[];         // current series, for KPI sparkline
}

const DAY_LABELS = (days: number) =>
  Array.from({ length: days }, (_, i) => `D${i + 1 - days}`); // D-29 … D0 style index

/** Build a metric series for a window. `base` ≈ daily average; `trend` ≈ the
 *  target period-over-period change (0.18 → ~+18%), clamped to a realistic band.
 *  The previous-period series is derived from current so the delta stays believable. */
export function buildSeries(metric: string, days: number, base: number, trend: number, scope = 'root'): MetricSeries {
  const rnd = mulberry32(hash(`${metric}:${scope}:${days}`));
  const labels = DAY_LABELS(days);
  // realistic delta band: ±35%
  const delta = Math.max(-0.35, Math.min(0.4, trend));
  const points: SeriesPoint[] = [];
  let cur = base * (1 - delta * 0.5);
  for (let i = 0; i < days; i++) {
    const wobble = (rnd() - 0.5) * base * 0.16;
    cur = Math.max(0.5, cur + (base * delta) / days + wobble);
    const dow = i % 7;
    const season = dow === 5 || dow === 6 ? 0.85 : 1.03;     // light weekend dip
    const current = Math.max(0, Math.round(cur * season));
    // prior period: current pulled back by the target delta, plus small noise
    const noise = 1 + (rnd() - 0.5) * 0.12;
    const previous = Math.max(0, Math.round((current / (1 + delta)) * noise));
    points.push({ i, label: labels[i], current, previous });
  }
  const total = points.reduce((a, p) => a + p.current, 0);
  const prevTotal = points.reduce((a, p) => a + p.previous, 0);
  const deltaPct = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : 0;
  return { key: metric, points, total, prevTotal, deltaPct, spark: points.map((p) => p.current) };
}

/** Per-channel daily series for the stacked/area channel trend. */
export interface ChannelSeries { platform: PlatformKey; name: string; color: string; points: { i: number; value: number }[]; total: number; }
export function buildChannelSeries(days: number, base: number, weights: Record<PlatformKey, number>, scope = 'root'): ChannelSeries[] {
  const sum = PLATFORM_ORDER.reduce((a, p) => a + (weights[p] || 0), 0) || 1;
  return PLATFORM_ORDER
    .filter((p) => (weights[p] || 0) > 0)
    .map((p) => {
      const s = buildSeries(`ch:${p}`, days, (base * (weights[p] || 0)) / sum, 0.18, scope);
      return { platform: p, name: PLATFORMS[p].name, color: PLATFORMS[p].color, points: s.points.map((pt) => ({ i: pt.i, value: pt.current })), total: s.total };
    });
}
