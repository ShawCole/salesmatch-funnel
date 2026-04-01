import type { MultiSelectFilter } from '../types/record';

const PARAM_MAP = {
  intent: 'intent',
  ageRange: 'age',
  gender: 'gender',
  incomeRange: 'income',
  netWorth: 'nw',
  creditRating: 'credit',
  seniorityLevel: 'seniority',
  homeowner: 'homeowner',
  employeeCount: 'emp',
  companyRevenue: 'rev',
  city: 'city',
  county: 'county',
  language: 'lang',
  state: 'state',
  selectedZips: 'zips',
  excludedZips: 'xzips',
} as const;

type FilterState = {
  topic: string;
  intent: MultiSelectFilter;
  ageRange: MultiSelectFilter;
  gender: MultiSelectFilter;
  incomeRange: MultiSelectFilter;
  netWorth: MultiSelectFilter;
  creditRating: MultiSelectFilter;
  seniorityLevel: MultiSelectFilter;
  homeowner: MultiSelectFilter;
  employeeCount: MultiSelectFilter;
  companyRevenue: MultiSelectFilter;
  city: MultiSelectFilter;
  county: MultiSelectFilter;
  language: MultiSelectFilter;
  state: MultiSelectFilter;
  selectedZips: Set<string>;
  excludedZips: Set<string>;
};

const MULTI_SELECT_KEYS = [
  'intent', 'ageRange', 'gender', 'incomeRange', 'netWorth',
  'creditRating', 'seniorityLevel', 'homeowner', 'city', 'county', 'language', 'state',
] as const;

// Use pipe delimiter — commas appear inside income/net-worth values
function encodeSet(s: Set<string>): string {
  return [...s].join('|');
}

function decodeSet(v: string | null): Set<string> {
  if (!v) return new Set();
  return new Set(v.split('|').filter(Boolean));
}

export function filtersToSearchParams(filters: FilterState): string {
  const params = new URLSearchParams();

  // Topic
  if (filters.topic && filters.topic !== 'wealth-management-services') {
    params.set('topic', filters.topic);
  }

  // Multi-select filters (include/exclude)
  for (const key of MULTI_SELECT_KEYS) {
    const f = filters[key as keyof FilterState] as MultiSelectFilter;
    if (!f || !('include' in f)) continue;
    const param = PARAM_MAP[key as keyof typeof PARAM_MAP];
    if (f.include.size > 0) params.set(param, encodeSet(f.include));
    if (f.exclude.size > 0) params.set(`${param}_x`, encodeSet(f.exclude));
  }

  // ZIP selections
  if (filters.selectedZips.size > 0) {
    params.set(PARAM_MAP.selectedZips, encodeSet(filters.selectedZips));
  }
  if (filters.excludedZips.size > 0) {
    params.set(PARAM_MAP.excludedZips, encodeSet(filters.excludedZips));
  }

  const str = params.toString();
  return str ? `?${str}` : '';
}

export function searchParamsToFilters(search: string): FilterState | null {
  const params = new URLSearchParams(search);
  if ([...params].length === 0) return null;

  function emptyFilter(): MultiSelectFilter {
    return { include: new Set(), exclude: new Set() };
  }

  const filters: FilterState = {
    topic: params.get('topic') || 'wealth-management-services',
    intent: emptyFilter(),
    ageRange: emptyFilter(),
    gender: emptyFilter(),
    incomeRange: emptyFilter(),
    netWorth: emptyFilter(),
    creditRating: emptyFilter(),
    seniorityLevel: emptyFilter(),
    homeowner: emptyFilter(),
    employeeCount: emptyFilter(),
    companyRevenue: emptyFilter(),
    city: emptyFilter(),
    county: emptyFilter(),
    language: emptyFilter(),
    state: emptyFilter(),
    selectedZips: new Set(),
    excludedZips: new Set(),
  };

  // Multi-select filters
  for (const key of MULTI_SELECT_KEYS) {
    const param = PARAM_MAP[key as keyof typeof PARAM_MAP];
    const inc = params.get(param);
    const exc = params.get(`${param}_x`);
    const f = filters[key as keyof FilterState] as MultiSelectFilter;
    if (inc) f.include = decodeSet(inc);
    if (exc) f.exclude = decodeSet(exc);
  }

  // ZIP selections
  const zips = params.get(PARAM_MAP.selectedZips);
  if (zips) filters.selectedZips = decodeSet(zips);
  const xzips = params.get(PARAM_MAP.excludedZips);
  if (xzips) filters.excludedZips = decodeSet(xzips);

  return filters;
}

export function buildShareURL(filters: FilterState): string {
  const base = window.location.origin + window.location.pathname;
  return base + filtersToSearchParams(filters);
}

export function syncFiltersToURL(filters: FilterState) {
  const search = filtersToSearchParams(filters);
  const url = window.location.pathname + search;
  window.history.replaceState(null, '', url);
}
