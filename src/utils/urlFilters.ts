import type { MultiSelectFilter } from '../types/record';

/**
 * URL parameter keys for each filter.
 * Multi-select filters use `key` for includes and `key_x` for excludes.
 */
const PARAM_MAP = {
  homeValueTabs: 'hv',
  ageRange: 'age',
  gender: 'gender',
  incomeRange: 'income',
  netWorth: 'nw',
  creditRating: 'credit',
  seniorityLevel: 'seniority',
  city: 'city',
  county: 'county',
  language: 'lang',
  selectedZips: 'zips',
  excludedZips: 'xzips',
} as const;

type FilterState = {
  homeValueTabs: Set<string>;
  ageRange: MultiSelectFilter;
  gender: MultiSelectFilter;
  incomeRange: MultiSelectFilter;
  netWorth: MultiSelectFilter;
  creditRating: MultiSelectFilter;
  seniorityLevel: MultiSelectFilter;
  city: MultiSelectFilter;
  county: MultiSelectFilter;
  language: MultiSelectFilter;
  selectedZips: Set<string>;
  excludedZips: Set<string>;
};

const MULTI_SELECT_KEYS = [
  'ageRange', 'gender', 'incomeRange', 'netWorth',
  'creditRating', 'seniorityLevel', 'city', 'county', 'language',
] as const;

/** Encode a Set as a comma-separated param value */
function encodeSet(s: Set<string>): string {
  return [...s].join(',');
}

/** Decode a comma-separated param value into a Set */
function decodeSet(v: string | null): Set<string> {
  if (!v) return new Set();
  return new Set(v.split(',').filter(Boolean));
}

/** Serialize filter state into URL search params string */
export function filtersToSearchParams(filters: FilterState): string {
  const params = new URLSearchParams();

  // Home value tabs
  if (filters.homeValueTabs.size > 0) {
    params.set(PARAM_MAP.homeValueTabs, encodeSet(filters.homeValueTabs));
  }

  // Multi-select filters (include/exclude)
  for (const key of MULTI_SELECT_KEYS) {
    const f = filters[key];
    const param = PARAM_MAP[key];
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

/** Parse URL search params into a partial filter state (only non-empty filters) */
export function searchParamsToFilters(search: string): FilterState | null {
  const params = new URLSearchParams(search);
  if ([...params].length === 0) return null;

  function emptyFilter(): MultiSelectFilter {
    return { include: new Set(), exclude: new Set() };
  }

  const filters: FilterState = {
    homeValueTabs: new Set(),
    ageRange: emptyFilter(),
    gender: emptyFilter(),
    incomeRange: emptyFilter(),
    netWorth: emptyFilter(),
    creditRating: emptyFilter(),
    seniorityLevel: emptyFilter(),
    city: emptyFilter(),
    county: emptyFilter(),
    language: emptyFilter(),
    selectedZips: new Set(),
    excludedZips: new Set(),
  };

  // Home value tabs
  const hv = params.get(PARAM_MAP.homeValueTabs);
  if (hv) filters.homeValueTabs = decodeSet(hv);

  // Multi-select filters
  for (const key of MULTI_SELECT_KEYS) {
    const param = PARAM_MAP[key];
    const inc = params.get(param);
    const exc = params.get(`${param}_x`);
    if (inc) filters[key].include = decodeSet(inc);
    if (exc) filters[key].exclude = decodeSet(exc);
  }

  // ZIP selections
  const zips = params.get(PARAM_MAP.selectedZips);
  if (zips) filters.selectedZips = decodeSet(zips);
  const xzips = params.get(PARAM_MAP.excludedZips);
  if (xzips) filters.excludedZips = decodeSet(xzips);

  return filters;
}

/** Build a full shareable URL with current filters */
export function buildShareURL(filters: FilterState): string {
  const base = window.location.origin + window.location.pathname;
  return base + filtersToSearchParams(filters);
}

/** Sync current filter state to browser URL bar without reload */
export function syncFiltersToURL(filters: FilterState) {
  const search = filtersToSearchParams(filters);
  const url = window.location.pathname + search;
  window.history.replaceState(null, '', url);
}
