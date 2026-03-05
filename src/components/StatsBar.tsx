import { useMemo, useCallback, useState } from 'react';
import { useFilters } from '../contexts/FilterContext';
import { ZIP_TO_COUNTY } from '../utils/zipCounty';
import { buildShareURL } from '../utils/urlFilters';
import { MapPin, Download, Link, Check } from 'lucide-react';
import type { IntentRecord } from '../types/record';

function exportCSV(records: IntentRecord[]) {
  if (records.length === 0) return;
  // Collect ALL unique columns across all records (not just the first one)
  const headerSet = new Set<string>();
  for (const r of records) {
    for (const k of Object.keys(r)) headerSet.add(k);
  }
  const headers = Array.from(headerSet);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = [
    headers.join(','),
    ...records.map(r => headers.map(h => escape(r[h])).join(',')),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `intent-export-${date}-${records.length}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function toTitleCase(s: string): string {
  return s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Derive the most common city per ZIP from all records */
function buildZipToCity(records: { SKIPTRACE_ZIP: string; PERSONAL_CITY: string }[]): Record<string, string> {
  const freq: Record<string, Record<string, number>> = {};
  for (const r of records) {
    const zip = r.SKIPTRACE_ZIP;
    const city = r.PERSONAL_CITY?.trim();
    if (!zip || !city) continue;
    if (!freq[zip]) freq[zip] = {};
    const tc = toTitleCase(city);
    freq[zip][tc] = (freq[zip][tc] || 0) + 1;
  }
  const map: Record<string, string> = {};
  for (const [zip, cities] of Object.entries(freq)) {
    let best = '';
    let max = 0;
    for (const [city, count] of Object.entries(cities)) {
      if (count > max) { best = city; max = count; }
    }
    map[zip] = best;
  }
  return map;
}

function describeArea(
  zips: string[],
  zipToCity: Record<string, string>,
): string {
  if (zips.length === 0) return 'California';

  // Group by city and county
  const cityGroups = new Map<string, string[]>(); // city → zips
  const countyGroups = new Map<string, string[]>(); // county → zips
  for (const z of zips) {
    const city = zipToCity[z] || '';
    const county = ZIP_TO_COUNTY[z] || 'Unknown';
    if (!cityGroups.has(city)) cityGroups.set(city, []);
    cityGroups.get(city)!.push(z);
    if (!countyGroups.has(county)) countyGroups.set(county, []);
    countyGroups.get(county)!.push(z);
  }

  const cities = [...cityGroups.keys()].filter(c => c !== '');
  const counties = [...countyGroups.keys()].filter(c => c !== 'Unknown');

  // 1 ZIP, no city data → "Near {closest city}" (unincorporated)
  if (zips.length === 1 && cities.length === 0) {
    return `ZIP ${zips[0]}`;
  }

  // 1 ZIP with city → "ZIP, City"
  if (zips.length === 1 && cities.length === 1) {
    return `${zips[0]}, ${cities[0]}`;
  }

  // All in one city
  if (cityGroups.size === 1 && cities.length === 1) {
    return cities[0];
  }

  // 2 ZIPs in different cities — show both city names
  if (zips.length === 2 && cities.length === 2) {
    return `${cities[0]} & ${cities[1]}`;
  }

  // 3+ ZIPs: move to county level
  if (counties.length === 0) {
    return `${zips.length} ZIPs`;
  }
  if (counties.length === 1) {
    const county = counties[0];
    // Check if any ZIP lacks a city (unincorporated) — use "area" suffix
    const hasUnknownCity = cityGroups.has('');
    return hasUnknownCity ? `${county} area` : `${county} County`;
  }

  // Multiple counties — sort by ZIP count descending
  const sorted = counties
    .map(c => ({ county: c, count: countyGroups.get(c)?.length ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const largest = sorted[0];
  const second = sorted[1];
  const otherZips = zips.length - largest.count;

  if (counties.length === 2) {
    // If roughly balanced (within 1 ZIP), show both names
    if (second && largest.count - second.count <= 1) {
      return `${largest.county} & ${second.county} Counties`;
    }
    // Dominant county + remainder
    return `${largest.county} County +${otherZips}`;
  }

  // 3+ counties
  return `${counties.length} Counties`;
}

export function StatsBar({ hideExport }: { hideExport?: boolean } = {}) {
  const { filters, filteredRecords, allRecords, totalCount } = useFilters();
  const [linkCopied, setLinkCopied] = useState(false);

  const zipToCity = useMemo(() => buildZipToCity(allRecords as any[]), [allRecords]);

  const handleExport = useCallback(() => exportCSV(filteredRecords as IntentRecord[]), [filteredRecords]);

  const handleCopyLink = useCallback(() => {
    const url = buildShareURL(filters);
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [filters]);

  const areaLabel = useMemo(() => {
    // If specific ZIPs selected on map, describe those
    if (filters.selectedZips.size > 0) {
      return describeArea([...filters.selectedZips], zipToCity);
    }
    // If county filter active, show those county names
    if (filters.county.include.size > 0) {
      const counties = [...filters.county.include];
      if (counties.length === 1) return `${counties[0]} County`;
      if (counties.length === 2) return `${counties[0]} & ${counties[1]} Counties`;
      return `${counties.length} Counties`;
    }
    // If city filter active, show those city names
    if (filters.city.include.size > 0) {
      const cities = [...filters.city.include];
      if (cities.length === 1) return cities[0];
      return `${cities[0]} & ${cities.length - 1} other${cities.length > 2 ? 's' : ''}`;
    }
    return 'California';
  }, [filters.selectedZips, filters.county.include, filters.city.include, zipToCity]);

  return (
    <div className="pointer-events-auto">
      <div className="glass rounded-xl p-3 w-[200px] space-y-2">
        {/* Area */}
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-purple-400 shrink-0" />
          <span className="text-[11px] font-semibold text-white truncate" title={areaLabel}>{areaLabel}</span>
        </div>

        {/* Count */}
        <div className="border-t border-white/5 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-white leading-none">
              {filteredRecords.length.toLocaleString()}
            </span>
            {filteredRecords.length !== totalCount && (
              <span className="text-[10px] text-gray-500">of {totalCount.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Export + Copy Link */}
        {!hideExport && (
          <div className="flex gap-1.5">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/20 text-purple-200 text-[11px] font-medium transition-colors"
            >
              <Download size={12} />
              Export
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/20 text-purple-200 text-[11px] font-medium transition-colors"
              title="Copy shareable link with current filters"
            >
              {linkCopied ? <Check size={12} className="text-green-400" /> : <Link size={12} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
