import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useFilters, type MultiSelectKey, type DatasetKey } from '../contexts/FilterContext';
import { AGE_RANGE_ORDER, AGE_RANGE_LABELS, GENDER_ORDER, INCOME_RANGE_ORDER, INCOME_RANGE_LABELS, NET_WORTH_ORDER, NET_WORTH_LABELS, CREDIT_RATING_ORDER, CREDIT_RATING_LABELS, LANGUAGE_CODE_LABELS } from '../utils/constants';
import { X, Copy, Check, ChevronDown } from 'lucide-react';
import { MultiSelectPopover } from './MultiSelectPopover';
import { SingleSelectPopover } from './SingleSelectPopover';

function ZipChipGroup({
  zips,
  variant,
  onClear,
  onClearOne,
}: {
  zips: Set<string>;
  variant: 'included' | 'excluded';
  onClear: () => void;
  onClearOne: (zip: string) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExcluded = variant === 'excluded';
  const count = zips.size;
  const zipList = Array.from(zips).sort();

  useEffect(() => {
    if (!showTooltip) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTooltip]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(zipList.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [zipList]);

  if (count === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <span
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border cursor-pointer select-none ${
          isExcluded
            ? 'bg-gray-600/30 text-gray-300 border-gray-500/20'
            : 'bg-purple-600/30 text-purple-200 border-purple-400/20'
        }`}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {count} {isExcluded ? 'Excluded' : 'Selected'} ZIP{count !== 1 ? 's' : ''}
        <button
          onClick={e => { e.stopPropagation(); onClear(); }}
          className="hover:text-white"
        >
          <X size={10} />
        </button>
      </span>

      {showTooltip && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
              {isExcluded ? 'Excluded' : 'Selected'} ZIPs
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto px-1 pb-1">
            {zipList.map(zip => (
              <div
                key={zip}
                className="flex items-center justify-between px-2 py-1 rounded-lg text-xs text-gray-300 hover:bg-white/5"
              >
                {zip}
                <button
                  onClick={() => onClearOne(zip)}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const MOBILE_BP = 768;

export function FilterBar({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void } = {}) {
  const { filters, apiData, dispatch, dataset, setDataset } = useFilters();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const offer = dataset.startsWith('csm') ? 'csm' : 'sales';
  const sizing = dataset.endsWith('headcount') ? 'headcount' : 'revenue';
  const handleOfferChange = (v: string) => setDataset(`${v}_${sizing}` as DatasetKey);
  const handleSizingChange = (v: string) => setDataset(`${offer}_${v}` as DatasetKey);

  useEffect(() => {
    onCollapseChange?.(!filtersOpen);
  }, [filtersOpen, onCollapseChange]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // City options from API filterOptions (already sorted by count)
  const cityOptions = useMemo(() => {
    if (!apiData?.filterOptions?.cities) return [];
    return apiData.filterOptions.cities.map(c => c.value);
  }, [apiData?.filterOptions?.cities]);

  // Language options from API filterOptions
  const languageOptions = useMemo(() => {
    if (!apiData?.filterOptions?.languages) return [];
    return apiData.filterOptions.languages
      .filter(l => l.code !== 'UX')
      .map(l => l.code);
  }, [apiData?.filterOptions?.languages]);

  // County options from API filterOptions (FIPS → "Name, ST" label)
  const countyOptions = useMemo(() => {
    if (!apiData?.filterOptions?.counties) return [];
    return apiData.filterOptions.counties.map(c => c.fips);
  }, [apiData?.filterOptions?.counties]);

  const countyLabelMap = useMemo(() => {
    if (!apiData?.filterOptions?.counties) return {};
    const map: Record<string, string> = {};
    for (const c of apiData.filterOptions.counties) {
      map[c.fips] = `${c.name}, ${c.state}`;
    }
    return map;
  }, [apiData?.filterOptions?.counties]);

  // All 50 states + DC — always available regardless of filters
  const stateOptions = useMemo(() => [
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL',
    'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
    'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
    'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
    'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  ], []);

  // Build active filter chips (non-ZIP)
  const activeFilters: { label: string; clear: () => void }[] = [];

  // Merge consecutive ordered ranges into shorthand: "$20k-$45k" + "$45k-$60k" → "$20k-$60k"
  const mergeRangeLabel = (
    selected: Set<string>,
    order: string[],
    labelMap: Record<string, string>,
  ): string => {
    const sorted = order.filter(t => selected.has(t));
    const runs: string[][] = [];
    for (const item of sorted) {
      const idx = order.indexOf(item);
      const lastRun = runs[runs.length - 1];
      if (lastRun && order.indexOf(lastRun[lastRun.length - 1]) === idx - 1) {
        lastRun.push(item);
      } else {
        runs.push([item]);
      }
    }
    const rangeLabels = runs.map(run => {
      if (run.length === 1) return labelMap[run[0]] ?? run[0];
      const firstLabel = labelMap[run[0]] ?? run[0];
      const lastLabel = labelMap[run[run.length - 1]] ?? run[run.length - 1];
      const splitRange = (lbl: string) => {
        const m = lbl.match(/^(.+[kM\d])-(\$[\d.]+[kM]?\+?)$/);
        return m ? [m[1], m[2]] : [lbl, lbl];
      };
      const [low] = splitRange(firstLabel);
      const [, high] = splitRange(lastLabel);
      return `${low}-${high}`;
    });
    return rangeLabels.join(', ');
  };

  // Merge consecutive age ranges: "35-44" + "45-54" + "55-64" → "35-64", "55-64" + "65+" → "55+"
  const mergeAgeLabel = (selected: Set<string>): string => {
    const sorted = AGE_RANGE_ORDER.filter(t => selected.has(t));
    const runs: string[][] = [];
    for (const item of sorted) {
      const idx = AGE_RANGE_ORDER.indexOf(item);
      const lastRun = runs[runs.length - 1];
      if (lastRun && AGE_RANGE_ORDER.indexOf(lastRun[lastRun.length - 1]) === idx - 1) {
        lastRun.push(item);
      } else {
        runs.push([item]);
      }
    }
    const rangeLabels = runs.map(run => {
      if (run.length === 1) return AGE_RANGE_LABELS[run[0]] ?? run[0];
      const first = run[0];
      const last = run[run.length - 1];
      const low = first.split('-')[0];
      if (last === '65 and older') return `${low}+`;
      const high = last.split('-')[1];
      return `${low}-${high}`;
    });
    return rangeLabels.join(', ');
  };

  // Range-merge configs
  const rangeMergeConfigs: { key: MultiSelectKey; label: string; order: string[]; labelMap: Record<string, string> }[] = [
    { key: 'incomeRange', label: 'Income', order: INCOME_RANGE_ORDER, labelMap: INCOME_RANGE_LABELS },
    { key: 'netWorth', label: 'Net Worth', order: NET_WORTH_ORDER, labelMap: NET_WORTH_LABELS },
  ];

  for (const { key, label, order, labelMap } of rangeMergeConfigs) {
    const f = filters[key];
    const total = f.include.size + f.exclude.size;
    if (total > 0) {
      const parts: string[] = [];
      if (f.include.size > 0) parts.push(mergeRangeLabel(f.include, order, labelMap));
      if (f.exclude.size > 0) parts.push(`${f.exclude.size} excl`);
      activeFilters.push({
        label: `${label}: ${parts.join(', ')}`,
        clear: () => dispatch({ type: 'CLEAR_MULTI_SELECT', key }),
      });
    }
  }

  // Age range chip with consecutive merge
  {
    const f = filters.ageRange;
    const total = f.include.size + f.exclude.size;
    if (total > 0) {
      const parts: string[] = [];
      if (f.include.size > 0) parts.push(mergeAgeLabel(f.include));
      if (f.exclude.size > 0) parts.push(`${f.exclude.size} excl`);
      activeFilters.push({
        label: `Age: ${parts.join(', ')}`,
        clear: () => dispatch({ type: 'CLEAR_MULTI_SELECT', key: 'ageRange' }),
      });
    }
  }

  const multiSelectConfigs: { key: MultiSelectKey; label: string; labelMap?: Record<string, string> }[] = [
    { key: 'gender', label: 'Gender', labelMap: { F: 'Female', M: 'Male', U: 'Unknown' } },
    { key: 'creditRating', label: 'Credit', labelMap: CREDIT_RATING_LABELS },
    { key: 'county', label: 'County', labelMap: countyLabelMap },
    { key: 'city', label: 'City' },
    { key: 'language', label: 'Language', labelMap: LANGUAGE_CODE_LABELS },
    { key: 'state', label: 'State' },
  ];

  for (const { key, label, labelMap } of multiSelectConfigs) {
    const f = filters[key];
    const total = f.include.size + f.exclude.size;
    if (total > 0) {
      const parts: string[] = [];
      if (f.include.size > 0) {
        if (f.include.size <= 2) {
          const names = [...f.include].map(v => labelMap?.[v] ?? v);
          parts.push(names.join(', '));
        } else {
          parts.push(`${f.include.size} incl`);
        }
      }
      if (f.exclude.size > 0) parts.push(`${f.exclude.size} excl`);
      activeFilters.push({
        label: `${label}: ${parts.join(', ')}`,
        clear: () => dispatch({ type: 'CLEAR_MULTI_SELECT', key }),
      });
    }
  }

  const hasAnyFilter = activeFilters.length > 0 || filters.selectedZips.size > 0 || filters.excludedZips.size > 0;

  const handleToggle = (key: MultiSelectKey) => (value: string, state: 'include' | 'exclude' | 'unset') => {
    dispatch({ type: 'TOGGLE_MULTI_SELECT', key, value, state });
  };

  const handleClear = (key: MultiSelectKey) => () => {
    dispatch({ type: 'CLEAR_MULTI_SELECT', key });
  };

  void filters.topic; // keep TS happy

  return (
    <div
      className="pointer-events-auto"
      onMouseEnter={() => window.dispatchEvent(new Event('card-hover-start'))}
    >
      <div className="glass rounded-xl p-3 max-w-[calc(100vw-24px)] mx-auto">
        {/* Title + dataset switcher + collapse toggle */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-white font-bold text-sm sm:text-base leading-tight">
              CXOs in Orgs with {sizing === 'revenue' ? 'Est. Revenue between $1m-$25m' : 'Headcount between 1-250'}{' '}
              <span className="text-purple-400">Spiking in intent to hire {offer === 'sales' ? 'Sales People' : 'Customer Success Managers'}</span>
            </h1>
          </div>
          <button
            onClick={() => setFiltersOpen(prev => !prev)}
            className="shrink-0 mt-1 p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${filtersOpen ? '' : '-rotate-90'}`} />
          </button>
        </div>

        {/* Collapsible filter content */}
        <div className={`overflow-hidden transition-all duration-300 ${filtersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* Multi-select popovers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dataset toggles */}
          <SingleSelectPopover
            label="Offer"
            options={['sales', 'csm']}
            labelMap={{ sales: 'Sales Hiring', csm: 'CSM Hiring' }}
            value={offer}
            onChange={handleOfferChange}
          />
          <SingleSelectPopover
            label="Company Size"
            options={['revenue', 'headcount']}
            labelMap={{ revenue: 'Revenue $1M–$25M', headcount: 'Headcount 1–250' }}
            value={sizing}
            onChange={handleSizingChange}
          />
          <div className="w-px h-5 bg-white/10" />
          <MultiSelectPopover
            label={isMobile ? 'Age' : 'Age Range'}
            options={AGE_RANGE_ORDER}
            labelMap={AGE_RANGE_LABELS}
            filter={filters.ageRange}
            onToggle={handleToggle('ageRange')}
            onClear={handleClear('ageRange')}
          />
          <MultiSelectPopover
            label="Gender"
            options={GENDER_ORDER}
            labelMap={{ F: 'Female', M: 'Male', U: 'Unknown' }}
            filter={filters.gender}
            onToggle={handleToggle('gender')}
            onClear={handleClear('gender')}
          />
          <MultiSelectPopover
            label="Income"
            options={INCOME_RANGE_ORDER}
            labelMap={INCOME_RANGE_LABELS}
            filter={filters.incomeRange}
            onToggle={handleToggle('incomeRange')}
            onClear={handleClear('incomeRange')}
          />
          <MultiSelectPopover
            label={isMobile ? 'Credit' : 'Credit Rating'}
            options={CREDIT_RATING_ORDER}
            labelMap={CREDIT_RATING_LABELS}
            filter={filters.creditRating}
            onToggle={handleToggle('creditRating')}
            onClear={handleClear('creditRating')}
          />
          <MultiSelectPopover
            label={isMobile ? 'Worth' : 'Net Worth'}
            options={NET_WORTH_ORDER}
            labelMap={NET_WORTH_LABELS}
            filter={filters.netWorth}
            onToggle={handleToggle('netWorth')}
            onClear={handleClear('netWorth')}
          />
          <MultiSelectPopover
            label="State"
            options={stateOptions}
            filter={filters.state}
            onToggle={handleToggle('state')}
            onClear={handleClear('state')}
          />
          <MultiSelectPopover
            label="City"
            options={cityOptions}
            filter={filters.city}
            onToggle={handleToggle('city')}
            onClear={handleClear('city')}
          />
          <MultiSelectPopover
            label="County"
            options={countyOptions}
            labelMap={countyLabelMap}
            filter={filters.county}
            onToggle={handleToggle('county')}
            onClear={handleClear('county')}
          />
          <MultiSelectPopover
            label="Language"
            options={languageOptions}
            labelMap={LANGUAGE_CODE_LABELS}
            filter={filters.language}
            onToggle={handleToggle('language')}
            onClear={handleClear('language')}
          />
          <MultiSelectPopover
            label="Homeowner"
            options={['Y', 'N']}
            labelMap={{ Y: 'Yes', N: 'No' }}
            filter={filters.homeowner}
            onToggle={handleToggle('homeowner')}
            onClear={handleClear('homeowner')}
          />
        </div>
        </div>{/* end collapsible */}

        {/* Applied filters — always visible, even when collapsed */}
        {hasAnyFilter && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <ZipChipGroup
              zips={filters.selectedZips}
              variant="included"
              onClear={() => dispatch({ type: 'CLEAR_SELECTED_ZIPS' })}
              onClearOne={zip => dispatch({ type: 'TOGGLE_ZIP', zip })}
            />
            <ZipChipGroup
              zips={filters.excludedZips}
              variant="excluded"
              onClear={() => dispatch({ type: 'CLEAR_EXCLUDED_ZIPS' })}
              onClearOne={zip => dispatch({ type: 'TOGGLE_EXCLUDE_ZIP', zip })}
            />

            {activeFilters.map(f => (
              <span
                key={f.label}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-600/30 text-purple-200 text-[10px] border border-purple-400/20"
              >
                {f.label}
                <button onClick={f.clear} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            ))}

            <button
              onClick={() => dispatch({ type: 'CLEAR_ALL' })}
              className="text-[10px] text-gray-400 hover:text-white transition-colors ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
