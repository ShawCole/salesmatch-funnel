// Incrementality / holdout experiments — the 2025-26 measurement frontier.
// Attribution says "who gets credit"; incrementality says "what would have
// happened anyway?" Holdout/geo-lift tests isolate the TRUE causal lift, so you
// don't pay for conversions that would have converted without the ad.
import { buildSeries } from './seriesMock';
import type { PlatformKey } from './funnelMock';
import { PLATFORMS } from './funnelMock';

export type ExpType = 'geo-holdout' | 'audience-holdout' | 'scale-test' | 'ghost-ads';
export type ExpStatus = 'running' | 'complete' | 'paused';

export interface Experiment {
  id: string;
  name: string;
  type: ExpType;
  channel: PlatformKey;
  status: ExpStatus;
  liftPct: number;          // incremental lift over control
  incrementalConv: number;  // conversions attributable to the ad (causal)
  observedConv: number;     // total conversions in treatment
  iroas: number;            // incremental ROAS
  significance: number;     // statistical confidence %
  days: number;
}

export const EXP_TYPE_LABEL: Record<ExpType, string> = {
  'geo-holdout': 'Geo holdout', 'audience-holdout': 'Audience holdout', 'scale-test': 'Scale test', 'ghost-ads': 'Ghost ads',
};

export const EXPERIMENTS: Experiment[] = [
  { id: 'e1', name: 'Meta retargeting — geo holdout', type: 'geo-holdout', channel: 'meta', status: 'complete', liftPct: 18, incrementalConv: 142, observedConv: 232, iroas: 2.4, significance: 96, days: 28 },
  { id: 'e2', name: 'Google Brand — incrementality', type: 'ghost-ads', channel: 'google', status: 'complete', liftPct: 6, incrementalConv: 41, observedConv: 190, iroas: 1.1, significance: 91, days: 28 },
  { id: 'e3', name: 'LinkedIn ABM — audience holdout', type: 'audience-holdout', channel: 'linkedin', status: 'running', liftPct: 23, incrementalConv: 58, observedConv: 96, iroas: 3.1, significance: 78, days: 14 },
  { id: 'e4', name: 'TikTok prospecting — scale test', type: 'scale-test', channel: 'tiktok', status: 'running', liftPct: 12, incrementalConv: 9, observedConv: 24, iroas: 1.6, significance: 64, days: 9 },
  { id: 'e5', name: 'Email winback — holdout', type: 'audience-holdout', channel: 'email', status: 'complete', liftPct: 31, incrementalConv: 27, observedConv: 38, iroas: 5.2, significance: 94, days: 21 },
];

export function expSummary() {
  const complete = EXPERIMENTS.filter((e) => e.status !== 'paused');
  const avgLift = Math.round(complete.reduce((a, e) => a + e.liftPct, 0) / complete.length);
  const incremental = EXPERIMENTS.reduce((a, e) => a + e.incrementalConv, 0);
  const observed = EXPERIMENTS.reduce((a, e) => a + e.observedConv, 0);
  const running = EXPERIMENTS.filter((e) => e.status === 'running').length;
  // % of observed conversions that were NOT incremental (would have happened anyway)
  const wasteShare = observed ? Math.round((1 - incremental / observed) * 100) : 0;
  return { avgLift, incremental, observed, running, wasteShare, count: EXPERIMENTS.length };
}

/** Treatment vs control series for the featured lift chart. */
export function liftSeries(exp: Experiment) {
  const treatment = buildSeries(`exp-t:${exp.id}`, exp.days, exp.observedConv / exp.days, 0.2, 'exp');
  const control = buildSeries(`exp-c:${exp.id}`, exp.days, (exp.observedConv - exp.incrementalConv) / exp.days, 0.05, 'exp');
  return [
    { name: 'Treatment', color: PLATFORMS[exp.channel].color, points: treatment.points.map((p) => ({ i: p.i, value: p.current })) },
    { name: 'Control (holdout)', color: '#94a3b8', points: control.points.map((p) => ({ i: p.i, value: p.current })) },
  ];
}

export { PLATFORMS };
