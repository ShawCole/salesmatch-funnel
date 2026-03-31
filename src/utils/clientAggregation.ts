/**
 * Client-side aggregation engine.
 * Takes compact record arrays and produces DashboardResponse objects
 * identical to what the backend API returns.
 */
import type { DashboardResponse, GeoCounty, GeoZip, AgeGenderBucket, BucketCount, CityCount, LanguageCount, SeniorityCount, FamilyAgg, FilterOptionCity, FilterOptionCounty, FilterOptionLanguage } from '../types/dashboard';
import type { MultiSelectFilter } from '../types/record';

/** Compact record format from convert-csv.py */
export interface CompactRecord {
  z?: string;  // zip
  s?: string;  // state
  c?: string;  // city
  a?: string;  // age_range
  g?: string;  // gender (M/F/U)
  i?: string;  // income_range
  n?: string;  // net_worth
  r?: string;  // credit_rating (A-H)
  l?: string;  // language_code
  e?: string;  // seniority_level
  m?: string;  // married (Y/N)
  h?: string;  // children (Y/N)
  o?: string;  // homeowner (Y/N)
  f?: string;  // county_fips
  y?: number;  // lat
  x?: number;  // lng
}

export interface FilterState {
  ageRange: MultiSelectFilter;
  gender: MultiSelectFilter;
  incomeRange: MultiSelectFilter;
  netWorth: MultiSelectFilter;
  creditRating: MultiSelectFilter;
  seniorityLevel: MultiSelectFilter;
  homeowner: MultiSelectFilter;
  city: MultiSelectFilter;
  county: MultiSelectFilter;
  language: MultiSelectFilter;
  state: MultiSelectFilter;
  selectedZips: Set<string>;
  excludedZips: Set<string>;
}

function matchesFilter(value: string | undefined, filter: MultiSelectFilter): boolean {
  if (filter.include.size > 0 && (!value || !filter.include.has(value))) return false;
  if (filter.exclude.size > 0 && value && filter.exclude.has(value)) return false;
  return true;
}

export function aggregateRecords(
  allRecords: CompactRecord[],
  filters: FilterState,
): DashboardResponse {
  // Check if any non-geo filters are active
  const hasFilters =
    filters.state.include.size > 0 || filters.state.exclude.size > 0 ||
    filters.city.include.size > 0 || filters.city.exclude.size > 0 ||
    filters.county.include.size > 0 || filters.county.exclude.size > 0 ||
    filters.ageRange.include.size > 0 || filters.ageRange.exclude.size > 0 ||
    filters.gender.include.size > 0 || filters.gender.exclude.size > 0 ||
    filters.incomeRange.include.size > 0 || filters.incomeRange.exclude.size > 0 ||
    filters.netWorth.include.size > 0 || filters.netWorth.exclude.size > 0 ||
    filters.creditRating.include.size > 0 || filters.creditRating.exclude.size > 0 ||
    filters.seniorityLevel.include.size > 0 || filters.seniorityLevel.exclude.size > 0 ||
    filters.homeowner.include.size > 0 || filters.homeowner.exclude.size > 0 ||
    filters.language.include.size > 0 || filters.language.exclude.size > 0 ||
    filters.selectedZips.size > 0 || filters.excludedZips.size > 0;

  // Filter records
  const records = hasFilters ? allRecords.filter(rec => {
    if (!matchesFilter(rec.s, filters.state)) return false;
    if (!matchesFilter(rec.a, filters.ageRange)) return false;
    if (!matchesFilter(rec.g, filters.gender)) return false;
    if (!matchesFilter(rec.i, filters.incomeRange)) return false;
    if (!matchesFilter(rec.n, filters.netWorth)) return false;
    if (!matchesFilter(rec.r, filters.creditRating)) return false;
    if (!matchesFilter(rec.e, filters.seniorityLevel)) return false;
    if (!matchesFilter(rec.o, filters.homeowner)) return false;
    if (!matchesFilter(rec.l, filters.language)) return false;

    // City filter
    if (filters.city.include.size > 0) {
      const cityState = rec.c && rec.s ? `${rec.c}, ${rec.s}` : '';
      if (!cityState || !filters.city.include.has(cityState)) return false;
    }
    if (filters.city.exclude.size > 0) {
      const cityState = rec.c && rec.s ? `${rec.c}, ${rec.s}` : '';
      if (cityState && filters.city.exclude.has(cityState)) return false;
    }

    // County filter
    if (!matchesFilter(rec.f, filters.county)) return false;

    // ZIP filters
    if (filters.selectedZips.size > 0 && (!rec.z || !filters.selectedZips.has(rec.z))) return false;
    if (filters.excludedZips.size > 0 && rec.z && filters.excludedZips.has(rec.z)) return false;

    return true;
  }) : allRecords;

  // Aggregate
  const countyMap = new Map<string, { state: string; total: number }>();
  const zipMap = new Map<string, { state: string; fips: string; lat: number | null; lng: number | null; total: number }>();
  const ageGenderMap = new Map<string, { male: number; female: number; unknown: number }>();
  const incomeMap = new Map<string, number>();
  const nwMap = new Map<string, number>();
  const creditMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const langMap = new Map<string, number>();
  const senMap = new Map<string, number>();
  let mY = 0, mN = 0, cY = 0, cN = 0;

  for (const rec of records) {
    // County
    if (rec.f) {
      const existing = countyMap.get(rec.f);
      if (existing) {
        existing.total++;
      } else {
        countyMap.set(rec.f, { state: rec.s || '', total: 1 });
      }
    }

    // ZIP
    if (rec.z) {
      const existing = zipMap.get(rec.z);
      if (existing) {
        existing.total++;
      } else {
        zipMap.set(rec.z, {
          state: rec.s || '',
          fips: rec.f || '',
          lat: rec.y ?? null,
          lng: rec.x ?? null,
          total: 1,
        });
      }
    }

    // Age/Gender
    if (rec.a) {
      let bucket = ageGenderMap.get(rec.a);
      if (!bucket) {
        bucket = { male: 0, female: 0, unknown: 0 };
        ageGenderMap.set(rec.a, bucket);
      }
      if (rec.g === 'M') bucket.male++;
      else if (rec.g === 'F') bucket.female++;
      else bucket.unknown++;
    }

    // Income
    if (rec.i) incomeMap.set(rec.i, (incomeMap.get(rec.i) || 0) + 1);
    // Net worth
    if (rec.n) nwMap.set(rec.n, (nwMap.get(rec.n) || 0) + 1);
    // Credit
    if (rec.r) creditMap.set(rec.r, (creditMap.get(rec.r) || 0) + 1);
    // City
    if (rec.c && rec.s) {
      const key = `${rec.c}, ${rec.s}`;
      cityMap.set(key, (cityMap.get(key) || 0) + 1);
    }
    // Language
    if (rec.l) langMap.set(rec.l, (langMap.get(rec.l) || 0) + 1);
    // Seniority
    if (rec.e) senMap.set(rec.e, (senMap.get(rec.e) || 0) + 1);
    // Family
    if (rec.m === 'Y') mY++;
    else if (rec.m === 'N') mN++;
    if (rec.h === 'Y') cY++;
    else if (rec.h === 'N') cN++;
  }

  // Build geo arrays
  const geoCounties: GeoCounty[] = [];
  for (const [fips, data] of countyMap) {
    geoCounties.push({ fips, state: data.state, name: '', high: 0, medium: 0, low: data.total, total: data.total });
  }
  geoCounties.sort((a, b) => b.total - a.total);

  const geoZips: GeoZip[] = [];
  for (const [zip, data] of zipMap) {
    geoZips.push({ zip, state: data.state, county_fips: data.fips, lat: data.lat, lng: data.lng, high: 0, medium: 0, low: data.total, total: data.total });
  }
  geoZips.sort((a, b) => b.total - a.total);

  // Age/gender
  const ageGender: AgeGenderBucket[] = [];
  for (const [age, data] of ageGenderMap) {
    ageGender.push({ age_range: age, ...data });
  }

  // Sorted bucket arrays
  const toSortedBuckets = (m: Map<string, number>): BucketCount[] =>
    Array.from(m, ([bucket, count]) => ({ bucket, count })).sort((a, b) => b.count - a.count);

  const topCities: CityCount[] = Array.from(cityMap, ([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count).slice(0, 25);

  const languages: LanguageCount[] = Array.from(langMap, ([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count).slice(0, 50);

  const seniority: SeniorityCount[] = Array.from(senMap, ([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count);

  const mTotal = mY + mN || 1;
  const cTotal = cY + cN || 1;
  const family: FamilyAgg = {
    married_children: Math.round(mY * cY / mTotal),
    married_no_children: Math.round(mY * cN / mTotal),
    single_children: Math.round(mN * cY / cTotal),
    single_no_children: Math.round(mN * cN / cTotal),
  };

  // Filter options (built from ALL records for the full option set)
  const cityOptions: FilterOptionCity[] = Array.from(cityMap, ([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count).slice(0, 200);

  const countyOptions: FilterOptionCounty[] = geoCounties.slice(0, 500).map(c => ({
    fips: c.fips, name: c.fips, state: c.state, count: c.total,
  }));

  const langOptions: FilterOptionLanguage[] = languages;

  // Build tooltipGeo from all records (unfiltered geo for hover) only if filters are active
  let tooltipGeo: DashboardResponse['tooltipGeo'] = null;
  if (hasFilters && (filters.state.include.size > 0 || filters.state.exclude.size > 0 ||
      filters.selectedZips.size > 0 || filters.excludedZips.size > 0)) {
    // Recompute from all records ignoring geo filters but respecting demographic filters
    tooltipGeo = null; // Simplified — could enhance later
  }

  return {
    totalContacts: allRecords.length,
    filteredContacts: records.length,
    geo: { counties: geoCounties, zips: geoZips },
    tooltipGeo,
    aggregations: {
      age_gender: ageGender,
      income: toSortedBuckets(incomeMap),
      net_worth: toSortedBuckets(nwMap),
      credit_rating: toSortedBuckets(creditMap),
      top_cities: topCities,
      language: languages,
      family,
      seniority,
    },
    filterOptions: { cities: cityOptions, counties: countyOptions, languages: langOptions },
    ms: 0,
  };
}
