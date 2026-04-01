#!/usr/bin/env python3
"""Convert 4 Sales Match CSV exports into compact record arrays for client-side aggregation."""
import csv, json, os, time

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'datasets')
LOOKUP_PATH = os.path.join(os.path.dirname(__file__), 'zip-lookup.json')

FILES = {
    "sales_revenue": os.path.expanduser("~/Downloads/Sales Hiring - SalesMatch - Revenue $1m-$25m.csv"),
    "sales_headcount": os.path.expanduser("~/Downloads/Sales Hiring - SalesMatch - Headcount 1-250.csv"),
    "csm_revenue": os.path.expanduser("~/Downloads/CSM Hiring - SalesMatch - Revenue $1m-$25m.csv"),
    "csm_headcount": os.path.expanduser("~/Downloads/CSM Hiring - SalesMatch - Headcount 1-250.csv"),
}

def load_lookup():
    with open(LOOKUP_PATH) as f:
        data = json.load(f)
    return data['centroids'], data['counties']

def get_skip_zip(row):
    """Use SKIPTRACE_ZIP only — no coalescing with personal ZIP."""
    z = (row.get('SKIPTRACE_ZIP') or '').strip()
    if z:
        z = z.split('.')[0].split('-')[0].strip().zfill(5)
        if len(z) == 5 and z.isdigit():
            return z
    return ''

def convert_csv(path, centroids, zip2fips):
    """Convert CSV to array of compact record objects for client-side filtering."""
    start = time.time()
    records = []

    with open(path, 'r', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skiptrace-only for geo (state, zip, city) — no mixing sources
            z = get_skip_zip(row)
            st = (row.get('SKIPTRACE_STATE') or '').strip().upper()
            if not st or len(st) != 2:
                st = ''
            city = (row.get('SKIPTRACE_CITY') or '').strip()
            age = (row.get('AGE_RANGE') or '').strip()
            gender = (row.get('GENDER') or '').strip().upper()
            if gender not in ('M', 'F'):
                gender = 'U'
            income = (row.get('INCOME_RANGE') or '').strip()
            nw = (row.get('NET_WORTH') or '').strip()
            cr = (row.get('SKIPTRACE_CREDIT_RATING') or '').strip().upper()
            if len(cr) != 1:
                cr = ''
            lang = (row.get('SKIPTRACE_LANGUAGE_CODE') or '').strip().upper()
            sen = (row.get('SENIORITY_LEVEL') or '').strip().lower()
            married = (row.get('MARRIED') or '').strip().upper()
            children = (row.get('CHILDREN') or '').strip().upper()
            homeowner = (row.get('HOMEOWNER') or '').strip().upper()
            emp_count = (row.get('COMPANY_EMPLOYEE_COUNT') or '').strip()
            comp_rev = (row.get('COMPANY_REVENUE') or '').strip()
            county_fips = zip2fips.get(z, '')
            coords = centroids.get(z)
            lat = coords[0] if coords else None
            lng = coords[1] if coords else None

            # Compact record — single-char keys to minimize JSON size
            rec = {}
            if z: rec['z'] = z
            if st: rec['s'] = st
            if city: rec['c'] = city
            if age: rec['a'] = age
            if gender: rec['g'] = gender
            if income: rec['i'] = income
            if nw: rec['n'] = nw
            if cr: rec['r'] = cr
            if lang: rec['l'] = lang
            if sen: rec['e'] = sen
            if married in ('Y', 'N'): rec['m'] = married
            if children in ('Y', 'N'): rec['h'] = children
            if homeowner in ('Y', 'N'): rec['o'] = homeowner
            if emp_count: rec['ec'] = emp_count
            if comp_rev: rec['cr2'] = comp_rev
            if county_fips: rec['f'] = county_fips
            if lat is not None: rec['y'] = round(lat, 4)
            if lng is not None: rec['x'] = round(lng, 4)

            records.append(rec)

    elapsed = time.time() - start
    print(f"  {len(records)} records in {elapsed:.1f}s")
    return records


def main():
    print("Loading ZIP lookup...")
    centroids, zip2fips = load_lookup()
    print(f"  {len(centroids)} centroids, {len(zip2fips)} county mappings")

    os.makedirs(OUT_DIR, exist_ok=True)

    for key, path in FILES.items():
        print(f"\nConverting {key}...")
        records = convert_csv(path, centroids, zip2fips)
        out_path = os.path.join(OUT_DIR, f'{key}.json')
        with open(out_path, 'w') as f:
            json.dump(records, f, separators=(',', ':'))
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  Written {out_path} ({size_kb:.0f} KB)")

    print("\nAll done.")


if __name__ == '__main__':
    main()
