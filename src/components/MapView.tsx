import { useRef, useCallback, useEffect, useState } from 'react';
import Map, { Source, Layer, type MapRef, type MapLayerMouseEvent } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMobileFade } from '../hooks/useMobileTooltipDismiss';
import { useFilters } from '../contexts/FilterContext';
import { useZipAggregation } from '../hooks/useZipAggregation';
import { ZIP_TO_COUNTY } from '../utils/zipCounty';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// CA center
const INITIAL_VIEW = {
  longitude: -119.4,
  latitude: 37.2,
  zoom: 5.8,
};

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { filteredRecords, baseFilteredRecords, demographicFilteredRecords, allRecords, filters, dispatch } = useFilters();
  const zipCounts = useZipAggregation(filteredRecords);
  const baseZipCounts = useZipAggregation(baseFilteredRecords);
  const demoZipCounts = useZipAggregation(demographicFilteredRecords);
  const allZipCounts = useZipAggregation(allRecords);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const { style: zipFadeStyle, resetFade: resetZipFade, isMobile } = useMobileFade();

  // Load GeoJSON and assign stable IDs to each feature
  useEffect(() => {
    fetch('/ca-zipcodes.geojson')
      .then(r => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        data.features.forEach((f, i) => { f.id = i; });
        setGeojson(data);
      })
      .catch(() => {
        setGeojson({ type: 'FeatureCollection', features: [] });
      });
  }, []);

  // Apply feature states — extracted so we can call it from multiple triggers
  const applyFeatureStates = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !geojson) return;
    if (!map.getSource('zips') || !map.isSourceLoaded('zips')) return;

    for (const feature of geojson.features) {
      const zipCode = feature.properties?.ZCTA5CE20 || feature.properties?.ZCTA5CE10 || feature.properties?.ZIP;
      if (zipCode) {
        const zip = String(zipCode).padStart(5, '0');
        map.setFeatureState(
          { source: 'zips', id: feature.id } as any,
          {
            density: zipCounts.get(zip) || 0,
            baseDensity: allZipCounts.get(zip) || 0,
          },
        );
      }
    }
  }, [zipCounts, allZipCounts, geojson]);

  // Re-apply when zipCounts or geojson change
  useEffect(() => {
    applyFeatureStates();
  }, [applyFeatureStates]);

  // Also apply when the source finishes loading (handles race condition)
  // and on map idle (catches cases where sourcedata fires before listener is attached)
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const onSourceData = (e: any) => {
      if (e.sourceId === 'zips' && e.isSourceLoaded) {
        applyFeatureStates();
      }
    };

    const onIdle = () => {
      applyFeatureStates();
    };

    map.on('sourcedata', onSourceData);
    map.on('idle', onIdle);
    // Apply immediately in case source already loaded before listeners attached
    applyFeatureStates();
    return () => {
      map.off('sourcedata', onSourceData as any);
      map.off('idle', onIdle);
    };
  }, [applyFeatureStates, mapReady]);

  // Derive hover data from current state — always fresh, no stale values after clicks
  const hoveredZipStr = hoveredZip ? String(hoveredZip).padStart(5, '0') : null;
  const hoverExcluded = hoveredZipStr ? filters.excludedZips.has(hoveredZipStr) : false;
  const hoverSelected = hoveredZipStr ? filters.selectedZips.has(hoveredZipStr) : false;
  // Show base count if available, fall back to demographic-only count (respects non-area filters, ignores area filters)
  const hoverCount = hoveredZipStr
    ? (baseZipCounts.get(hoveredZipStr) ?? demoZipCounts.get(hoveredZipStr) ?? 0)
    : 0;

  const clearHover = useCallback(() => {
    setHoveredZip(null);
    setHoverPos(null);
  }, []);

  // Clear map tooltip when pointer enters any overlay (cards, chart panel)
  useEffect(() => {
    const handler = () => clearHover();
    window.addEventListener('card-hover-start', handler);
    window.addEventListener('chart-panel-enter', handler);
    return () => {
      window.removeEventListener('card-hover-start', handler);
      window.removeEventListener('chart-panel-enter', handler);
    };
  }, [clearHover]);

  const onHover = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features && e.features.length > 0 ? e.features[0] : null;
    if (feature) {
      const zip = feature.properties?.ZCTA5CE20 || feature.properties?.ZCTA5CE10 || feature.properties?.ZIP;
      setHoveredZip(zip);
      setHoverPos({ x: e.point.x, y: e.point.y });
      resetZipFade();
    } else {
      clearHover();
    }
  }, [clearHover, isMobile]);

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature) {
      const zip = feature.properties?.ZCTA5CE20 || feature.properties?.ZCTA5CE10 || feature.properties?.ZIP;
      if (zip) {
        const zipStr = String(zip).padStart(5, '0');
        const baseCount = baseZipCounts.get(zipStr) || 0;
        const totalCount = allZipCounts.get(zipStr) || 0;
        const isExcluded = filters.excludedZips.has(zipStr);
        const isSelected = filters.selectedZips.has(zipStr);

        // Nothing to click if ZIP has no records at all
        if (totalCount === 0 && !isExcluded && !isSelected) return;

        // If already excluded, un-exclude it
        if (isExcluded) {
          dispatch({ type: 'TOGGLE_EXCLUDE_ZIP', zip: zipStr });
          return;
        }

        // If already selected (as additional ZIP), deselect it
        if (isSelected) {
          dispatch({ type: 'TOGGLE_ZIP', zip: zipStr });
          return;
        }

        // When a county is included...
        if (filters.county.include.size > 0) {
          const county = ZIP_TO_COUNTY[zipStr];
          if (county && filters.county.include.has(county)) {
            // ZIP is inside the included county — exclude it
            dispatch({ type: 'TOGGLE_EXCLUDE_ZIP', zip: zipStr });
          } else {
            // ZIP is outside the included county — add it as additional selection
            dispatch({ type: 'TOGGLE_ZIP', zip: zipStr });
          }
          return;
        }

        // No county active — only allow clicks on ZIPs with base records
        if (baseCount === 0) return;
        dispatch({ type: 'TOGGLE_ZIP', zip: zipStr });
      }
    }
  }, [dispatch, baseZipCounts, allZipCounts, filters.excludedZips, filters.selectedZips, filters.county.include]);

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={INITIAL_VIEW}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onLoad={() => setMapReady(true)}
        interactiveLayerIds={geojson?.features.length ? ['zip-fill'] : []}
        onMouseMove={onHover}
        onMouseLeave={clearHover}
        onClick={onClick}
        cursor={hoveredZipStr && ((allZipCounts.get(hoveredZipStr) || 0) > 0 || filters.excludedZips.has(hoveredZipStr) || filters.selectedZips.has(hoveredZipStr)) ? 'pointer' : 'grab'}
      >
        {geojson && geojson.features.length > 0 && (
          <Source id="zips" type="geojson" data={geojson}>
            <Layer
              id="zip-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'interpolate',
                  ['linear'],
                  ['coalesce', ['feature-state', 'density'], 0],
                  0, 'rgba(0,0,0,0)',
                  1, '#1e3a5f',
                  5, '#2563eb',
                  15, '#7c3aed',
                  40, '#a855f7',
                  100, '#dc2626',
                  300, '#ef4444',
                ],
                'fill-opacity': 0.7,
              }}
            />
            {/* Faint border for all ZIPs with data — visible even when not selected */}
            <Layer
              id="zip-base-outline"
              type="line"
              paint={{
                'line-color': [
                  'interpolate',
                  ['linear'],
                  ['coalesce', ['feature-state', 'baseDensity'], 0],
                  0, 'rgba(255,255,255,0)',
                  1, 'rgba(255,255,255,0.12)',
                ],
                'line-width': 0.5,
              }}
            />
            <Layer
              id="zip-outline"
              type="line"
              paint={{
                'line-color': [
                  'interpolate',
                  ['linear'],
                  ['coalesce', ['feature-state', 'density'], 0],
                  0, 'rgba(255,255,255,0)',
                  1, '#3b82f6',
                  5, '#6366f1',
                  15, '#8b5cf6',
                  40, '#a855f7',
                  100, '#ef4444',
                  300, '#f87171',
                ],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['coalesce', ['feature-state', 'density'], 0],
                  0, 0,
                  1, 0.8,
                  15, 1.2,
                  100, 1.8,
                  300, 2.5,
                ],
              }}
            />
            {/* Highlight selected ZIPs (gold) */}
            {filters.selectedZips.size > 0 && (
              <Layer
                id="zip-selected"
                type="line"
                filter={[
                  'any',
                  ['in', ['get', 'ZCTA5CE20'], ['literal', [...filters.selectedZips]]],
                  ['in', ['get', 'ZCTA5CE10'], ['literal', [...filters.selectedZips]]],
                  ['in', ['get', 'ZIP'], ['literal', [...filters.selectedZips]]],
                ]}
                paint={{
                  'line-color': '#fbbf24',
                  'line-width': 2.5,
                }}
              />
            )}
            {/* Highlight excluded ZIPs (gray) */}
            {filters.excludedZips.size > 0 && (
              <Layer
                id="zip-excluded"
                type="line"
                filter={[
                  'any',
                  ['in', ['get', 'ZCTA5CE20'], ['literal', [...filters.excludedZips]]],
                  ['in', ['get', 'ZCTA5CE10'], ['literal', [...filters.excludedZips]]],
                  ['in', ['get', 'ZIP'], ['literal', [...filters.excludedZips]]],
                ]}
                paint={{
                  'line-color': '#6b7280',
                  'line-width': 2,
                  'line-dasharray': [2, 2],
                }}
              />
            )}
          </Source>
        )}
      </Map>

      {/* Hover tooltip */}
      {hoveredZip && hoverPos && (
        <div
          className="glass-light rounded-lg px-3 py-2 pointer-events-none absolute z-20"
          style={{ left: hoverPos.x + 12, top: hoverPos.y - 30, ...zipFadeStyle }}
        >
          <div className="text-xs font-medium text-white">ZIP {hoveredZip}</div>
          <div className="text-xs text-gray-300">
            {hoverCount.toLocaleString()} records
            {hoverExcluded && <span className="text-gray-500 ml-1">(excluded)</span>}
            {hoverSelected && <span className="text-purple-400 ml-1">(selected)</span>}
          </div>
        </div>
      )}
    </div>
  );
}
