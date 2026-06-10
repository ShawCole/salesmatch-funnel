// Attribution-model credit allocation.
// A conversion's credit is distributed across the channels in the journey by the
// chosen model. The total conversions are FIXED — the model only changes which
// channel gets credit. Weights live in funnelMock's ATTRIBUTION_PRESETS.

import {
  PLATFORMS, PLATFORM_ORDER, ATTRIBUTION_PRESETS, ATTRIBUTION_MODELS, type PlatformKey,
} from './funnelMock';

export const MODEL_DESC: Record<string, string> = {
  first: '100% credit to the first touch — rewards discovery / awareness channels (social, video).',
  last: '100% credit to the last touch before converting — rewards intent-capture (search, email).',
  linear: 'Equal credit to every touch in the journey.',
  decay: 'More credit to touches closer to the conversion; early touches decay.',
  data_driven: 'Modeled — credit assigned by each channel’s observed contribution, including mid-funnel assists.',
};

export interface ChannelCredit {
  platform: PlatformKey;
  name: string;
  color: string;
  pct: number;
  credit: number;
}

function normalized(modelKey: string): Record<PlatformKey, number> {
  const preset = ATTRIBUTION_PRESETS[modelKey] ?? ATTRIBUTION_PRESETS.last;
  const sum = PLATFORM_ORDER.reduce((a, p) => a + (preset[p] || 0), 0) || 1;
  return Object.fromEntries(
    PLATFORM_ORDER.map((p) => [p, (preset[p] || 0) / sum * 100]),
  ) as Record<PlatformKey, number>;
}

/** Per-channel credit (count + %) for a model, given the total conversions. */
export function creditByModel(modelKey: string, total: number): ChannelCredit[] {
  const pct = normalized(modelKey);
  return PLATFORM_ORDER
    .map((p) => ({
      platform: p, name: PLATFORMS[p].name, color: PLATFORMS[p].color,
      pct: pct[p], credit: Math.round(total * pct[p] / 100),
    }))
    .filter((c) => c.pct > 0)
    .sort((a, b) => b.pct - a.pct);
}

export interface MatrixRow {
  platform: PlatformKey;
  name: string;
  color: string;
  byModel: Record<string, number>;  // credit % under each model
}

/** Per-channel credit % under every model — for the comparison matrix. */
export function modelMatrix(): MatrixRow[] {
  const norms = Object.fromEntries(ATTRIBUTION_MODELS.map((m) => [m.key, normalized(m.key)]));
  return PLATFORM_ORDER
    .map((p) => ({
      platform: p, name: PLATFORMS[p].name, color: PLATFORMS[p].color,
      byModel: Object.fromEntries(ATTRIBUTION_MODELS.map((m) => [m.key, norms[m.key][p]])),
    }))
    .filter((row) => ATTRIBUTION_MODELS.some((m) => row.byModel[m.key] > 0))
    .sort((a, b) => b.byModel.linear - a.byModel.linear);
}

/** Channel that gains/loses the most between two models — for the insight line. */
export function biggestSwing(fromModel: string, toModel: string): { name: string; delta: number } | null {
  const from = normalized(fromModel), to = normalized(toModel);
  let best: { name: string; delta: number } | null = null;
  for (const p of PLATFORM_ORDER) {
    const d = to[p] - from[p];
    if (!best || Math.abs(d) > Math.abs(best.delta)) best = { name: PLATFORMS[p].name, delta: Math.round(d) };
  }
  return best;
}
