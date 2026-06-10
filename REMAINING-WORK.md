# Phase 4 — Remaining Work

## What's DONE

### Backend (listmagic-receiver)
- `migrations/002-dashboard-indexes.sql` — Created
- `server.js` — Added `GET /api/geo/dashboard` + `GET /api/geo/export` endpoints with full filter support

### Frontend (listmagic-geo-dashboard) — Forked from ca-intent-dashboard
- `src/types/dashboard.ts` — Created (DashboardResponse interface)
- `src/utils/apiClient.ts` — Created (fetchDashboard, exportUrl, filtersToQueryParams)
- `src/contexts/FilterContext.tsx` — Rewritten (API-backed, debounced fetch, no client-side records)
- `src/utils/urlFilters.ts` — Rewritten (removed homeValueTabs, added topic/intent/state)
- `src/utils/constants.ts` — Updated (removed HOME_VALUE_ORDER, added INTENT_ORDER/INTENT_LABELS)
- `src/utils/aggregation.ts` — Rewritten (reshapeBuckets, reshapeCities, reshapePyramid, reshapeSeniority)
- `src/hooks/useAggregation.ts` — Rewritten (takes BucketCount[] instead of records)
- `src/hooks/useZipAggregation.ts` — Rewritten (takes GeoZip[] from apiData)
- `src/components/MapView.tsx` — Rewritten (PMTiles via mapbox-gl direct, county+ZCTA layers, crossfade)
- `src/components/cards/AgeGenderCard.tsx` — Updated (reads apiData)
- `src/components/cards/IncomeCard.tsx` — Updated
- `src/components/cards/CreditRatingCard.tsx` — Updated
- `src/components/cards/NetWorthCard.tsx` — Updated
- `src/components/cards/TopCitiesCard.tsx` — Updated
- `src/components/cards/FamilyDynamicsCard.tsx` — Updated
- `src/components/cards/LanguageCard.tsx` — Updated

## What STILL NEEDS to be written

### 1. FilterBar.tsx — REWRITE needed
Key changes from original:
- Remove HOME_VALUE_ORDER import, ZIP_TO_COUNTY import, all home value pill/popover logic
- Change `const { filters, allRecords, dispatch } = useFilters()` → `const { filters, apiData, dispatch } = useFilters()`
- Add Intent filter popover (INTENT_ORDER, INTENT_LABELS from constants)
- City/county/language options from `apiData?.filterOptions` instead of computed from allRecords
- County options use FIPS codes with label map `${name}, ${state}`
- Title: `<span className="text-purple-400">{toTitleCase(filters.topic)}</span> Intent Dashboard`
- Add `state` MultiSelectKey support
- Keep all range-merge, chip, ZIP chip, collapse logic

### 2. StatsBar.tsx — REWRITE needed
- Remove ZIP_TO_COUNTY import, client-side CSV export
- Read counts from `apiData?.filteredContacts` / `apiData?.totalContacts`
- Export button calls `window.open(exportUrl(filters), '_blank')` (from apiClient)
- Simplify areaLabel (no zipToCity lookup, use filter state + apiData.filterOptions for county names)
- Fallback area label = 'National' instead of 'California'

### 3. App.tsx — MODIFY needed
- Remove HomeValueCard import and all home-value entries
- Remove 'home-value' from PCT_POSITIONS and GRID_ORDER
- 7 cards instead of 8
- Adjust positions (shift age-gender to fill gap)

### 4. Sidebar.tsx — MODIFY needed
- Remove home-value entry from CARD_CONFIGS (the Home icon + "Home Value" label)

### 5. Files to DELETE
- `src/data/records.json` (Google Sheets data)
- `scripts/fetch-sheet.mjs` (Google Sheets pipeline)
- `src/utils/zipCounty.ts` (CA-only ZIP→county map)

### 6. Package.json updates
- Add `pmtiles` dependency
- Remove `xlsx` dependency
- Add env vars: `VITE_API_URL`, `VITE_API_KEY`, `VITE_TILES_URL`
- Update `scripts.dev` (remove fetch-data dependency)

### 7. .env.local updates
- Add `VITE_API_URL=http://localhost:8080`
- Add `VITE_TILES_URL=https://storage.googleapis.com/arkdata-tiles`
- Keep `VITE_MAPBOX_TOKEN`

### 8. TypeScript cleanup
- `src/types/record.ts` — remove IntentRecord interface (no longer used), keep MultiSelectFilter
