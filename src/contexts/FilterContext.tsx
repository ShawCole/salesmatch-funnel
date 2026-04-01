import { createContext, useContext, useReducer, useMemo, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { MultiSelectFilter } from '../types/record';
import type { DashboardResponse } from '../types/dashboard';
import { searchParamsToFilters, syncFiltersToURL } from '../utils/urlFilters';
import { aggregateRecords, loadCountyNames, type CompactRecord } from '../utils/clientAggregation';

function emptyFilter(): MultiSelectFilter {
  return { include: new Set(), exclude: new Set() };
}

export interface FilterState {
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
}

export type MultiSelectKey =
  | 'intent' | 'ageRange' | 'gender' | 'incomeRange' | 'netWorth'
  | 'creditRating' | 'seniorityLevel' | 'homeowner' | 'employeeCount' | 'companyRevenue' | 'city' | 'county' | 'language' | 'state';

type Action =
  | { type: 'SET_TOPIC'; topic: string }
  | { type: 'TOGGLE_MULTI_SELECT'; key: MultiSelectKey; value: string; state: 'include' | 'exclude' | 'unset' }
  | { type: 'CLEAR_MULTI_SELECT'; key: MultiSelectKey }
  | { type: 'TOGGLE_ZIP'; zip: string }
  | { type: 'TOGGLE_EXCLUDE_ZIP'; zip: string }
  | { type: 'CLEAR_SELECTED_ZIPS' }
  | { type: 'CLEAR_EXCLUDED_ZIPS' }
  | { type: 'CLEAR_ALL' };

const DEFAULT_TOPIC = 'sales_revenue';

export type DatasetKey = 'sales_revenue' | 'sales_headcount' | 'csm_revenue' | 'csm_headcount';

const DATASET_URLS: Record<DatasetKey, string> = {
  sales_revenue: '/datasets/sales_revenue.json',
  sales_headcount: '/datasets/sales_headcount.json',
  csm_revenue: '/datasets/csm_revenue.json',
  csm_headcount: '/datasets/csm_headcount.json',
};

function buildEmptyState(): FilterState {
  return {
    topic: DEFAULT_TOPIC,
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
}

function buildInitialState(): FilterState {
  const fromURL = searchParamsToFilters(window.location.search);
  return fromURL ?? buildEmptyState();
}

const initialState = buildInitialState();

function reducer(state: FilterState, action: Action): FilterState {
  switch (action.type) {
    case 'SET_TOPIC':
      return { ...buildEmptyState(), topic: action.topic };
    case 'TOGGLE_MULTI_SELECT': {
      const prev = state[action.key];
      const include = new Set(prev.include);
      const exclude = new Set(prev.exclude);
      include.delete(action.value);
      exclude.delete(action.value);
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
      return { ...buildEmptyState(), topic: state.topic };
    default:
      return state;
  }
}

// Serialize filter state to a stable string for effect dependency comparison.
// This avoids re-firing effects due to new Set/object references.
function serializeFilters(f: FilterState): string {
  const serSet = (s: Set<string>) => [...s].sort().join(',');
  const serMF = (m: MultiSelectFilter) => `${serSet(m.include)}|${serSet(m.exclude)}`;
  return [
    f.topic,
    serMF(f.intent), serMF(f.ageRange), serMF(f.gender),
    serMF(f.incomeRange), serMF(f.netWorth), serMF(f.creditRating),
    serMF(f.seniorityLevel), serMF(f.homeowner), serMF(f.employeeCount), serMF(f.companyRevenue), serMF(f.city), serMF(f.county),
    serMF(f.language), serMF(f.state),
    serSet(f.selectedZips), serSet(f.excludedZips),
  ].join(';;');
}

export interface Topic {
  topic_id: number;
  topic_slug: string;
  topic_label: string;
  category: string;
  signal_count: string;
}

interface FilterContextValue {
  filters: FilterState;
  apiData: DashboardResponse | null;
  loading: boolean;
  dispatch: React.Dispatch<Action>;
  topics: Topic[];
  dataset: DatasetKey;
  setDataset: (key: DatasetKey) => void;
}

const FilterContext = createContext<FilterContextValue>(null!);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(reducer, initialState);
  const [apiData, setApiData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataset, setDatasetRaw] = useState<DatasetKey>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('dataset') as DatasetKey) || 'sales_revenue';
  });
  const topics: Topic[] = [];
  const recordCache = useRef<Partial<Record<DatasetKey, CompactRecord[]>>>({});
  const rawRecords = useRef<CompactRecord[]>([]);

  const setDataset = useCallback((key: DatasetKey) => {
    setDatasetRaw(key);
    dispatch({ type: 'CLEAR_ALL' });
    const url = new URL(window.location.href);
    url.searchParams.set('dataset', key);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Load raw records when dataset changes
  useEffect(() => {
    const cached = recordCache.current[dataset];
    if (cached) {
      rawRecords.current = cached;
      setLoading(true);
      requestAnimationFrame(() => {
        const result = aggregateRecords(cached, filters);
        lastFilterKey.current = serializeFilters(filters);
        setApiData(result);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    Promise.all([fetch(DATASET_URLS[dataset]).then(r => r.json()), loadCountyNames()])
      .then(([records]: [CompactRecord[], any]) => {
        recordCache.current[dataset] = records;
        rawRecords.current = records;
        const result = aggregateRecords(records, filters);
        lastFilterKey.current = serializeFilters(filters);
        setApiData(result);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load dataset:', err);
        setLoading(false);
      });
  }, [dataset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-aggregate when filters change (but NOT on initial mount — dataset effect handles that)
  const filterKey = serializeFilters(filters);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const lastFilterKey = useRef<string>(filterKey);
  const initialMount = useRef(true);

  useEffect(() => {
    // Skip initial mount — the dataset effect already set apiData
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    // Skip if filterKey hasn't actually changed (e.g. React strict mode double-fire)
    if (filterKey === lastFilterKey.current) return;
    lastFilterKey.current = filterKey;

    if (rawRecords.current.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        const start = performance.now();
        const result = aggregateRecords(rawRecords.current, filtersRef.current);
        const elapsed = performance.now() - start;
        const remaining = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          setApiData(result);
          setLoading(false);
        }, remaining);
      });
    }, 100);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filter state → URL bar
  useEffect(() => {
    syncFiltersToURL(filters);
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({
    filters,
    apiData,
    loading,
    dispatch,
    topics,
    dataset,
    setDataset,
  }), [filters, apiData, loading, topics, dataset, setDataset]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  return useContext(FilterContext);
}
