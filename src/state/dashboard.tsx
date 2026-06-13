// Global dashboard state: the persistent filter bar + persona + drill scope.
// One source of truth shared across every view, so filters survive navigation
// and drill-down (closing the "filters are per-view" gap).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../data/orgMock';
import type { PlatformKey } from '../data/funnelMock';

export const DATE_PRESETS = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '14d', label: 'Last 14 days', days: 14 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
] as const;
export type DateKey = (typeof DATE_PRESETS)[number]['key'];

export const COMPARE_PRESETS = [
  { key: 'prev', label: 'vs. prior period' },
  { key: 'yoy', label: 'vs. prior year' },
  { key: 'none', label: 'No comparison' },
] as const;
export type CompareKey = (typeof COMPARE_PRESETS)[number]['key'];

export type ChannelFilter = 'all' | PlatformKey;
export type ModelKey = 'first' | 'last' | 'linear' | 'decay' | 'data_driven';

interface DashboardState {
  // filters
  date: DateKey; setDate: (d: DateKey) => void;
  compare: CompareKey; setCompare: (c: CompareKey) => void;
  channel: ChannelFilter; setChannel: (c: ChannelFilter) => void;
  model: ModelKey; setModel: (m: ModelKey) => void;
  // persona + drill
  role: Role; setRole: (r: Role) => void;
  drillIds: string[]; setDrillIds: (ids: string[]) => void;
  // accent (per-tenant white-label)
  accent: string; setAccent: (hex: string) => void;
  // derived
  days: number;
}

const Ctx = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState<DateKey>('30d');
  const [compare, setCompare] = useState<CompareKey>('prev');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [model, setModel] = useState<ModelKey>('last');
  const [role, setRole] = useState<Role>('tenant');
  const [drillIds, setDrillIds] = useState<string[]>([]);
  const [accent, setAccent] = useState<string>('#7c3aed');

  const days = useMemo(() => DATE_PRESETS.find((d) => d.key === date)?.days ?? 30, [date]);

  // keep the CSS accent var in sync (white-label)
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  const value: DashboardState = {
    date, setDate, compare, setCompare, channel, setChannel, model, setModel,
    role, setRole, drillIds, setDrillIds, accent, setAccent, days,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDashboard must be used within DashboardProvider');
  return c;
}
