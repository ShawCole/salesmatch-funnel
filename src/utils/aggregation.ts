import type { AgeGenderBucket, BucketCount, CityCount, LanguageCount, SeniorityCount } from '../types/dashboard';

export interface CountItem {
  name: string;
  value: number;
}

export interface PyramidItem {
  ageRange: string;
  male: number;
  female: number;
}

export function topN(items: CountItem[], n: number): CountItem[] {
  return items.slice(0, n);
}

/** Reshape API bucket array [{bucket, count}] into CountItem[] with optional ordering and labels */
export function reshapeBuckets(
  buckets: BucketCount[],
  order?: string[],
  labelMap?: Record<string, string>,
): CountItem[] {
  const map = new Map<string, number>();
  for (const b of buckets) {
    map.set(b.bucket, (map.get(b.bucket) || 0) + b.count);
  }

  if (order) {
    const items: CountItem[] = order
      .filter(k => map.has(k))
      .map(k => ({ name: labelMap?.[k] ?? k, value: map.get(k)! }));
    // Append unordered
    for (const [k, v] of map) {
      if (!order.includes(k)) {
        items.push({ name: labelMap?.[k] ?? k, value: v });
      }
    }
    return items;
  }

  return Array.from(map, ([name, value]) => ({
    name: labelMap?.[name] ?? name,
    value,
  })).sort((a, b) => b.value - a.value);
}

/** Reshape API city array into CountItem[] */
export function reshapeCities(cities: CityCount[], limit?: number): CountItem[] {
  const items = cities.map(c => ({
    name: titleCase(c.city),
    value: c.count,
  }));
  return limit ? items.slice(0, limit) : items;
}

/** Reshape API credit_rating into CountItem[] */
export function reshapeCreditRating(
  buckets: BucketCount[],
  order: string[],
  labelMap: Record<string, string>,
): CountItem[] {
  return reshapeBuckets(buckets, order, labelMap);
}

/** Reshape API language array into CountItem[] */
export function reshapeLanguages(
  languages: LanguageCount[],
  labelMap: Record<string, string>,
): CountItem[] {
  return languages.map(l => ({
    name: labelMap[l.code] ?? l.code,
    value: l.count,
  }));
}

/** Reshape API seniority array into CountItem[] */
export function reshapeSeniority(
  seniority: SeniorityCount[],
  order: string[],
  labelMap: Record<string, string>,
): CountItem[] {
  const map = new Map<string, number>();
  for (const s of seniority) map.set(s.level, s.count);

  return order
    .filter(k => map.has(k))
    .map(k => ({ name: labelMap[k] ?? k, value: map.get(k)! }));
}

/** Build pyramid data from API age_gender buckets */
export function reshapePyramid(
  ageGender: AgeGenderBucket[],
  ageOrder: string[],
): PyramidItem[] {
  const map = new Map<string, { male: number; female: number }>();
  for (const age of ageOrder) {
    map.set(age, { male: 0, female: 0 });
  }

  for (const ag of ageGender) {
    let age = ag.age_range;
    const lower = age.toLowerCase();
    if (lower === '65 and older' || lower === '65-74' || lower === '75+' || lower === '65+') {
      age = '65 and older';
    }
    if (map.has(age)) {
      const entry = map.get(age)!;
      entry.male += ag.male;
      entry.female += ag.female;
    }
  }

  return ageOrder.map(age => ({
    ageRange: age,
    male: map.get(age)!.male,
    female: -map.get(age)!.female,
  }));
}

function titleCase(s: string): string {
  // Split on ", " to handle "City, ST" format — keep state abbreviation uppercase
  const parts = s.split(', ');
  const city = parts[0].toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  if (parts.length > 1) {
    return `${city}, ${parts.slice(1).join(', ').toUpperCase()}`;
  }
  return city;
}
