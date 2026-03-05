import { createContext, useContext, useReducer, useMemo, useEffect, type ReactNode } from 'react';
import type { IntentRecord, MultiSelectFilter } from '../types/record';
import allRecords from '../data/records.json';
import { ZIP_TO_COUNTY } from '../utils/zipCounty';
import { searchParamsToFilters, syncFiltersToURL } from '../utils/urlFilters';

const records = allRecords as unknown as IntentRecord[];

function emptyFilter(): MultiSelectFilter {
  return { include: new Set(), exclude: new Set() };
}

interface FilterState {
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
}

export type MultiSelectKey = 'ageRange' | 'gender' | 'incomeRange' | 'netWorth' | 'creditRating' | 'seniorityLevel' | 'city' | 'county' | 'language';

type Action =
  | { type: 'TOGGLE_HOME_VALUE'; tab: string }
  | { type: 'TOGGLE_MULTI_SELECT'; key: MultiSelectKey; value: string; state: 'include' | 'exclude' | 'unset' }
  | { type: 'CLEAR_MULTI_SELECT'; key: MultiSelectKey }
  | { type: 'TOGGLE_ZIP'; zip: string }
  | { type: 'TOGGLE_EXCLUDE_ZIP'; zip: string }
  | { type: 'CLEAR_SELECTED_ZIPS' }
  | { type: 'CLEAR_EXCLUDED_ZIPS' }
  | { type: 'CLEAR_ALL' };

function buildEmptyState(): FilterState {
  return {
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
}

function buildInitialState(): FilterState {
  // Hydrate from URL params if present
  const fromURL = searchParamsToFilters(window.location.search);
  return fromURL ?? buildEmptyState();
}

const initialState = buildInitialState();

function reducer(state: FilterState, action: Action): FilterState {
  switch (action.type) {
    case 'TOGGLE_HOME_VALUE': {
      const next = new Set(state.homeValueTabs);
      if (next.has(action.tab)) next.delete(action.tab);
      else next.add(action.tab);
      return { ...state, homeValueTabs: next };
    }
    case 'TOGGLE_MULTI_SELECT': {
      const prev = state[action.key];
      const include = new Set(prev.include);
      const exclude = new Set(prev.exclude);
      // Remove from both first
      include.delete(action.value);
      exclude.delete(action.value);
      // Add to the target set
      if (action.state === 'include') include.add(action.value);
      else if (action.state === 'exclude') exclude.add(action.value);
      return { ...state, [action.key]: { include, exclude } };
    }
    case 'CLEAR_MULTI_SELECT':
      return { ...state, [action.key]: emptyFilter() };
    case 'TOGGLE_ZIP': {
      const next = new Set(state.selectedZips);
      if (next.has(action.zip)) next.delete(action.zip);
      else next.add(action.zip);
      return { ...state, selectedZips: next };
    }
    case 'TOGGLE_EXCLUDE_ZIP': {
      const next = new Set(state.excludedZips);
      if (next.has(action.zip)) next.delete(action.zip);
      else next.add(action.zip);
      return { ...state, excludedZips: next };
    }
    case 'CLEAR_SELECTED_ZIPS':
      return { ...state, selectedZips: new Set() };
    case 'CLEAR_EXCLUDED_ZIPS':
      return { ...state, excludedZips: new Set() };
    case 'CLEAR_ALL':
      return buildEmptyState();
    default:
      return state;
  }
}

const FIELD_MAP: Record<string, keyof IntentRecord> = {
  ageRange: 'AGE_RANGE',
  gender: 'GENDER',
  incomeRange: 'INCOME_RANGE',
  netWorth: 'NET_WORTH',
  creditRating: 'SKIPTRACE_CREDIT_RATING',
  seniorityLevel: 'SENIORITY_LEVEL',
  city: 'PERSONAL_CITY',
  language: 'SKIPTRACE_LANGUAGE_CODE',
};

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function applyMultiFilter(filter: MultiSelectFilter, value: string): boolean {
  // Exclude takes priority
  if (filter.exclude.size > 0 && filter.exclude.has(value)) return false;
  // Include whitelist
  if (filter.include.size > 0 && !filter.include.has(value)) return false;
  return true;
}

interface FilterContextValue {
  filters: FilterState;
  /** Records after ALL filters including ZIP exclusions — used by charts, cards, stats */
  filteredRecords: IntentRecord[];
  /** Records after all filters EXCEPT ZIP exclusions — used for tooltip counts on excluded ZIPs */
  baseFilteredRecords: IntentRecord[];
  /** Records after demographic filters only (no area filters: county, city, ZIPs) — used for map tooltip counts */
  demographicFilteredRecords: IntentRecord[];
  allRecords: IntentRecord[];
  totalCount: number;
  dispatch: React.Dispatch<Action>;
}

const FilterContext = createContext<FilterContextValue>(null!);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(reducer, initialState);

  // Sync filter state → URL bar on every change
  useEffect(() => {
    syncFiltersToURL(filters);
  }, [filters]);

  // Stage 0: demographic filters only (no area filters: county, city, ZIPs)
  // Used for map tooltip counts — every ZIP shows how many records survive non-area filters
  const demographicFilteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filters.homeValueTabs.size > 0 && !filters.homeValueTabs.has(r.HOME_VALUE_TAB)) {
        return false;
      }
      for (const [filterKey, field] of Object.entries(FIELD_MAP)) {
        if (filterKey === 'county' || filterKey === 'city') continue; // skip area filters
        const mf = filters[filterKey as MultiSelectKey];
        if (mf.include.size === 0 && mf.exclude.size === 0) continue;
        let val = r[field] || '';
        if (!applyMultiFilter(mf, val)) return false;
      }
      return true;
    });
  }, [filters]);

  // Stage 1: all filters EXCEPT selectedZips and excludedZips
  // Used for map clickability — shows what each ZIP would have before manual ZIP selection
  const baseFilteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filters.homeValueTabs.size > 0 && !filters.homeValueTabs.has(r.HOME_VALUE_TAB)) {
        return false;
      }

      // County filter uses ZIP_TO_COUNTY lookup
      const countyFilter = filters.county;
      if (countyFilter.include.size > 0 || countyFilter.exclude.size > 0) {
        const county = ZIP_TO_COUNTY[r.SKIPTRACE_ZIP] || '';
        if (!applyMultiFilter(countyFilter, county)) return false;
      }

      // All other multi-select filters
      for (const [filterKey, field] of Object.entries(FIELD_MAP)) {
        if (filterKey === 'county') continue; // handled above
        const mf = filters[filterKey as MultiSelectKey];
        if (mf.include.size === 0 && mf.exclude.size === 0) continue;

        let val = r[field] || '';
        // Normalize city to title case for comparison
        if (filterKey === 'city') val = toTitleCase(val);

        if (!applyMultiFilter(mf, val)) return false;
      }
      return true;
    });
  }, [filters]);

  // Stage 2: selectedZips override county/city geography + excludedZips blacklist
  // Selected ZIPs bypass geographic filters (county, city) but still respect demographic filters
  const filteredRecords = useMemo(() => {
    if (filters.selectedZips.size === 0 && filters.excludedZips.size === 0) {
      return baseFilteredRecords;
    }

    let result: IntentRecord[];

    if (filters.selectedZips.size > 0) {
      const hasGeoFilter = filters.county.include.size > 0 || filters.county.exclude.size > 0
        || filters.city.include.size > 0 || filters.city.exclude.size > 0;

      if (hasGeoFilter) {
        // With geographic filters active: base records + selected ZIPs that bypass geo filters
        const selectedZipRecords = records.filter(r => {
          if (!filters.selectedZips.has(r.SKIPTRACE_ZIP)) return false;
          if (filters.homeValueTabs.size > 0 && !filters.homeValueTabs.has(r.HOME_VALUE_TAB)) return false;
          for (const [filterKey, field] of Object.entries(FIELD_MAP)) {
            if (filterKey === 'county' || filterKey === 'city') continue;
            const mf = filters[filterKey as MultiSelectKey];
            if (mf.include.size === 0 && mf.exclude.size === 0) continue;
            let val = r[field] || '';
            if (!applyMultiFilter(mf, val)) return false;
          }
          return true;
        });
        const baseSet = new Set(baseFilteredRecords);
        for (const r of selectedZipRecords) baseSet.add(r);
        result = Array.from(baseSet);
      } else {
        // No geographic filters: selected ZIPs act as a pure whitelist
        result = baseFilteredRecords.filter(r => filters.selectedZips.has(r.SKIPTRACE_ZIP));
      }
    } else {
      result = baseFilteredRecords;
    }

    if (filters.excludedZips.size > 0) {
      result = result.filter(r => !filters.excludedZips.has(r.SKIPTRACE_ZIP));
    }
    return result;
  }, [baseFilteredRecords, filters]);

  const value = useMemo(() => ({
    filters,
    filteredRecords,
    baseFilteredRecords,
    demographicFilteredRecords,
    allRecords: records,
    totalCount: records.length,
    dispatch,
  }), [filters, filteredRecords, baseFilteredRecords, demographicFilteredRecords]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  return useContext(FilterContext);
}
