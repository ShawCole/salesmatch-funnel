import type { DashboardResponse } from '../types/dashboard';
import type { MultiSelectFilter } from '../types/record';

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

interface FilterState {
  topic: string;
  intent: MultiSelectFilter;
  ageRange: MultiSelectFilter;
  gender: MultiSelectFilter;
  incomeRange: MultiSelectFilter;
  netWorth: MultiSelectFilter;
  creditRating: MultiSelectFilter;
  seniorityLevel: MultiSelectFilter;
  city: MultiSelectFilter;
  county: MultiSelectFilter;
  language: MultiSelectFilter;
  state: MultiSelectFilter;
  selectedZips: Set<string>;
  excludedZips: Set<string>;
}

const PARAM_MAP: Record<string, string> = {
  intent: 'intent',
  ageRange: 'age',
  gender: 'gender',
  incomeRange: 'income',
  netWorth: 'nw',
  creditRating: 'credit',
  seniorityLevel: 'seniority',
  city: 'city',
  county: 'county',
  language: 'lang',
  state: 'state',
};

export function filtersToQueryParams(filters: FilterState): string {
  const params = new URLSearchParams();
  params.set('topic', filters.topic);

  for (const [key, param] of Object.entries(PARAM_MAP)) {
    const f = filters[key as keyof FilterState] as MultiSelectFilter | undefined;
    if (!f || typeof f !== 'object' || !('include' in f)) continue;
    if (f.include.size > 0) params.set(param, [...f.include].join(','));
    if (f.exclude.size > 0) params.set(param + '_x', [...f.exclude].join(','));
  }

  // ZIP selections (hierarchical override — see backend buildDashboardWhere)
  if (filters.selectedZips.size > 0) params.set('zips', [...filters.selectedZips].join(','));
  if (filters.excludedZips.size > 0) params.set('xzips', [...filters.excludedZips].join(','));

  return params.toString();
}

export async function fetchDashboard(
  filters: FilterState,
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  const qs = filtersToQueryParams(filters);
  const headers: Record<string, string> = {};
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(`${API_BASE}/api/geo/dashboard?${qs}`, { headers, signal });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Dashboard API ${res.status}: ${body}`);
  }
  return res.json();
}

export function exportUrl(filters: FilterState): string {
  const qs = filtersToQueryParams(filters);
  const base = `${API_BASE}/api/geo/export?${qs}`;
  return API_KEY ? `${base}&api_key=${API_KEY}` : base;
}
