// Marketing Mix Modeling (MMM) — the third measurement pillar (with attribution
// + incrementality). MMM models DIMINISHING RETURNS per channel to find the
// budget split that maximizes total conversions. Saturated channels have low
// marginal ROAS; under-funded ones have high marginal ROAS — shift budget toward
// the margin. All simulated via saturation (Hill-type) curves.
import { PLATFORM_ORDER, PLATFORMS, type PlatformKey } from './funnelMock';

interface ChannelParam { max: number; k: number; share: number; } // max conv potential, efficiency, current spend share
const PARAMS: Partial<Record<PlatformKey, ChannelParam>> = {
  meta:     { max: 220, k: 1.1, share: 0.40 },
  google:   { max: 180, k: 1.6, share: 0.30 },
  linkedin: { max: 120, k: 0.9, share: 0.16 },
  email:    { max: 70,  k: 2.4, share: 0.05 },  // owned: cheap, under-funded
  dsp:      { max: 60,  k: 0.5, share: 0.06 },  // saturated / weak
  tiktok:   { max: 90,  k: 1.0, share: 0.03 },  // under-funded, headroom
};

const TOTAL_SPEND = 105_400_00; // cents ($105.4K) — matches the org blended spend scale

/** conversions at a given spend (cents) for a channel — saturating curve */
function convAt(p: ChannelParam, spendCents: number): number {
  const x = spendCents / TOTAL_SPEND; // normalized
  return p.max * (1 - Math.exp(-p.k * x * 3));
}
/** marginal conversions per additional $1k — the slope */
function marginal(p: ChannelParam, spendCents: number): number {
  const d = 1000_00;
  return Math.max(0, convAt(p, spendCents + d) - convAt(p, spendCents));
}

export interface MmmChannel {
  platform: PlatformKey; name: string; color: string;
  spendCents: number; conv: number; saturation: number; marginalRoas: number;
  recSpendCents: number; recDeltaPct: number;
}

export function buildMmm() {
  const channels = PLATFORM_ORDER.filter((p) => PARAMS[p]).map((p) => {
    const par = PARAMS[p]!;
    const spendCents = Math.round(TOTAL_SPEND * par.share);
    const conv = convAt(par, spendCents);
    return { p, par, spendCents, conv };
  });

  // greedy reallocation: move $ from lowest-marginal to highest-marginal channels
  const alloc = new Map(channels.map((c) => [c.p, c.spendCents]));
  const step = 1000_00;
  for (let i = 0; i < 40; i++) {
    let hi = channels[0].p, lo = channels[0].p, hiM = -1, loM = Infinity;
    for (const c of channels) {
      const m = marginal(c.par, alloc.get(c.p)!);
      if (m > hiM) { hiM = m; hi = c.p; }
      if (m < loM && alloc.get(c.p)! > step) { loM = m; lo = c.p; }
    }
    if (hi === lo || hiM <= loM) break;
    alloc.set(hi, alloc.get(hi)! + step);
    alloc.set(lo, alloc.get(lo)! - step);
  }

  const out: MmmChannel[] = channels.map((c) => {
    const rec = alloc.get(c.p)!;
    return {
      platform: c.p, name: PLATFORMS[c.p].name, color: PLATFORMS[c.p].color,
      spendCents: c.spendCents, conv: Math.round(c.conv),
      saturation: Math.round((c.conv / c.par.max) * 100),
      marginalRoas: Math.round(marginal(c.par, c.spendCents) * 100) / 100,
      recSpendCents: rec, recDeltaPct: Math.round(((rec - c.spendCents) / c.spendCents) * 100),
    };
  });

  const curConv = out.reduce((a, c) => a + c.conv, 0);
  const recConv = channels.reduce((a, c) => a + convAt(c.par, alloc.get(c.p)!), 0);
  const liftPct = Math.round(((recConv - curConv) / curConv) * 1000) / 10;
  return { channels: out, totalSpendCents: TOTAL_SPEND, curConv: Math.round(curConv), recConv: Math.round(recConv), liftPct };
}

/** Response-curve points for charting: conversions vs spend across the range. */
export function responseCurves(steps = 24) {
  const rows: Record<string, number>[] = [];
  const chans = PLATFORM_ORDER.filter((p) => PARAMS[p]);
  for (let i = 0; i <= steps; i++) {
    const spend = (TOTAL_SPEND * 0.6 * i) / steps; // 0 .. 60% of total per channel
    const row: Record<string, number> = { spend: Math.round(spend / 100) };
    chans.forEach((p) => { row[PLATFORMS[p].name] = Math.round(convAt(PARAMS[p]!, spend)); });
    rows.push(row);
  }
  return { rows, channels: chans.map((p) => ({ name: PLATFORMS[p].name, color: PLATFORMS[p].color })) };
}
