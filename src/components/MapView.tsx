import { useRef, useEffect, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMobileFade } from '../hooks/useMobileTooltipDismiss';
import { useRenderPerf } from '../hooks/useRenderPerf';
import { useFilters } from '../contexts/FilterContext';
import type { GeoCounty, GeoZip } from '../types/dashboard';
import { Protocol } from 'pmtiles';

const TILES_BASE = import.meta.env.VITE_TILES_URL || 'https://storage.googleapis.com/listmagic-tiles';

// National center
const INITIAL_VIEW = { lng: -98.5, lat: 39.5, zoom: 4 };

// Register PMTiles protocol once
let protocolAdded = false;
function ensureProtocol() {
  if (protocolAdded) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolAdded = true;
}

// Dark style (self-hosted, no Mapbox token needed)
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'Dark',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#030712' },
    },
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      paint: { 'raster-opacity': 0.6 },
    },
  ],
};

// County: static scale (raw counts work well with large spread)
const FILL_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['coalesce', ['feature-state', 'density'], 0],
  0, 'rgba(0,0,0,0)',
  1, '#1e3a5f',
  5, '#2563eb',
  15, '#7c3aed',
  40, '#a855f7',
  100, '#dc2626',
  300, '#ef4444',
];

const LINE_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['coalesce', ['feature-state', 'density'], 0],
  0, 'rgba(255,255,255,0)',
  1, '#3b82f6',
  5, '#6366f1',
  15, '#8b5cf6',
  40, '#a855f7',
  100, '#ef4444',
  300, '#f87171',
];

// Zip: normalized 0–100 scale (counts per zip are small, need full ramp)
const ZIP_FILL_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['coalesce', ['feature-state', 'density'], 0],
  0,  'rgba(0,0,0,0)',
  1,  '#1e3a5f',
  15, '#2563eb',
  35, '#7c3aed',
  60, '#a855f7',
  80, '#dc2626',
  100, '#ef4444',
];

const ZIP_LINE_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['coalesce', ['feature-state', 'density'], 0],
  0,  'rgba(255,255,255,0)',
  1,  '#3b82f6',
  15, '#6366f1',
  35, '#8b5cf6',
  60, '#a855f7',
  80, '#ef4444',
  100, '#f87171',
];

export function MapView({ mobilePanelOpen }: { mobilePanelOpen?: boolean }) {
  useRenderPerf('MapView');
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { apiData, loading, filters, dispatch } = useFilters();
  const [mapReady, setMapReady] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<{ name: string; count: number; type: 'county' | 'zip' } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const { style: fadeStyle, resetFade } = useMobileFade();
  const prevCountyIds = useRef<Set<string>>(new Set());
  const prevZipIds = useRef<Set<string>>(new Set());

  // County/ZIP data lookup maps
  const countyMap = useMemo(() => {
    const m = new globalThis.Map<string, GeoCounty>();
    if (apiData?.geo.counties) {
      for (const c of apiData.geo.counties) m.set(c.fips, c);
    }
    return m;
  }, [apiData?.geo.counties]);

  const zipMap = useMemo(() => {
    const m = new globalThis.Map<string, GeoZip>();
    if (apiData?.geo.zips) {
      for (const z of apiData.geo.zips) m.set(z.zip, z);
    }
    return m;
  }, [apiData?.geo.zips]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    ensureProtocol();

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: [INITIAL_VIEW.lng, INITIAL_VIEW.lat],
      zoom: INITIAL_VIEW.zoom,
    });

    map.on('load', () => {
      // Add PMTiles sources
      map.addSource('counties', {
        type: 'vector',
        url: `pmtiles://${TILES_BASE}/counties.pmtiles`,
        promoteId: { counties: 'GEOID' },
      });
      map.addSource('zctas', {
        type: 'vector',
        url: `pmtiles://${TILES_BASE}/zctas.pmtiles`,
        promoteId: { zctas: 'GEOID20' },
      });
      map.addSource('states', {
        type: 'vector',
        url: `pmtiles://${TILES_BASE}/states.pmtiles`,
      });

      // State borders — always visible
      map.addLayer({
        id: 'state-borders',
        type: 'line',
        source: 'states',
        'source-layer': 'states',
        paint: {
          'line-color': 'rgba(255,255,255,0.3)',
          'line-width': 1,
        },
      });

      // County fill — visible at low zoom, fades out by z10
      map.addLayer({
        id: 'county-fill',
        type: 'fill',
        source: 'counties',
        'source-layer': 'counties',
        maxzoom: 11,
        paint: {
          'fill-color': FILL_COLOR as any,
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            7, 0.7,
            10, 0,
          ] as any,
        },
      });

      map.addLayer({
        id: 'county-outline',
        type: 'line',
        source: 'counties',
        'source-layer': 'counties',
        maxzoom: 11,
        paint: {
          'line-color': LINE_COLOR as any,
          'line-width': [
            'interpolate', ['linear'], ['coalesce', ['feature-state', 'density'], 0],
            0, 0, 1, 0.5, 100, 1.5,
          ] as any,
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            7, 1,
            10, 0,
          ] as any,
        },
      });

      // County labels — z5-z10
      map.addLayer({
        id: 'county-labels',
        type: 'symbol',
        source: 'counties',
        'source-layer': 'counties',
        minzoom: 5,
        maxzoom: 10,
        layout: {
          'text-field': ['get', 'NAME'],
          'text-size': 10,
          'text-font': ['Open Sans Regular'],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.5)',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1,
        },
      });

      // ZCTA fill — fades in from z7-z9
      map.addLayer({
        id: 'zcta-fill',
        type: 'fill',
        source: 'zctas',
        'source-layer': 'zctas',
        minzoom: 7,
        paint: {
          'fill-color': ZIP_FILL_COLOR as any,
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            7, 0,
            9, 0.7,
          ] as any,
        },
      });

      map.addLayer({
        id: 'zcta-outline',
        type: 'line',
        source: 'zctas',
        'source-layer': 'zctas',
        minzoom: 7,
        paint: {
          'line-color': ZIP_LINE_COLOR as any,
          'line-width': [
            'interpolate', ['linear'], ['coalesce', ['feature-state', 'density'], 0],
            0, 0, 1, 0.5, 100, 1.5,
          ] as any,
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            7, 0,
            9, 1,
          ] as any,
        },
      });

      // Selected ZIP highlight — bright cyan outline
      map.addLayer({
        id: 'zcta-selected',
        type: 'line',
        source: 'zctas',
        'source-layer': 'zctas',
        minzoom: 7,
        paint: {
          'line-color': '#22d3ee',
          'line-width': ['case', ['==', ['coalesce', ['feature-state', 'selected'], 0], 1], 2.5, 0] as any,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 1] as any,
        },
      });

      // Excluded ZIP overlay — dimmed red outline + darkened fill
      map.addLayer({
        id: 'zcta-excluded-fill',
        type: 'fill',
        source: 'zctas',
        'source-layer': 'zctas',
        minzoom: 7,
        paint: {
          'fill-color': 'rgba(0,0,0,0.6)',
          'fill-opacity': ['case', ['==', ['coalesce', ['feature-state', 'excluded'], 0], 1],
            ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 0.6] as any,
            0,
          ] as any,
        },
      });
      map.addLayer({
        id: 'zcta-excluded-outline',
        type: 'line',
        source: 'zctas',
        'source-layer': 'zctas',
        minzoom: 7,
        paint: {
          'line-color': '#ef4444',
          'line-width': ['case', ['==', ['coalesce', ['feature-state', 'excluded'], 0], 1], 2, 0] as any,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 0.8] as any,
        },
      });

      // ZIP labels at high zoom
      map.addLayer({
        id: 'zcta-labels',
        type: 'symbol',
        source: 'zctas',
        'source-layer': 'zctas',
        minzoom: 10,
        layout: {
          'text-field': ['get', 'GEOID20'],
          'text-size': 9,
          'text-font': ['Open Sans Regular'],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.6)',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1,
        },
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build county→zips lookup for viewport normalization
  const zipsByCounty = useMemo(() => {
    const m = new globalThis.Map<string, GeoZip[]>();
    if (apiData?.geo.zips) {
      for (const z of apiData.geo.zips) {
        const arr = m.get(z.county_fips);
        if (arr) arr.push(z); else m.set(z.county_fips, [z]);
      }
    }
    return m;
  }, [apiData?.geo.zips]);

  // Ref to hold the latest normalization function so moveend can call it
  const applyZipDensity = useRef<() => void>(() => {});

  // Apply feature states when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !apiData) return;

    const newCountyIds = new Set<string>();
    const newZipIds = new Set<string>();

    // Global zip normalization (used at low zoom before viewport takes over)
    let globalMaxZip = 0;
    for (const z of apiData.geo.zips) { if (z.total > globalMaxZip) globalMaxZip = z.total; }

    // Clear previous county states
    for (const id of prevCountyIds.current) {
      try {
        map.setFeatureState(
          { source: 'counties', sourceLayer: 'counties', id },
          { density: 0 }
        );
      } catch { /* */ }
    }

    // Clear previous zip states
    for (const id of prevZipIds.current) {
      try {
        map.setFeatureState(
          { source: 'zctas', sourceLayer: 'zctas', id },
          { density: 0 }
        );
      } catch { /* */ }
    }

    // Set county feature states (raw counts)
    for (const c of apiData.geo.counties) {
      newCountyIds.add(c.fips);
      try {
        map.setFeatureState(
          { source: 'counties', sourceLayer: 'counties', id: c.fips },
          { density: c.total }
        );
      } catch { /* feature may not be loaded yet */ }
    }

    // Track all zip IDs
    for (const z of apiData.geo.zips) {
      newZipIds.add(z.zip);
    }

    prevCountyIds.current = newCountyIds;
    prevZipIds.current = newZipIds;

    // Compute and apply viewport-normalized zip density
    const computeAndApplyZipDensity = () => {
      const zoom = map.getZoom();
      const allZips = apiData.geo.zips;

      if (zoom >= 7) {
        // Viewport-aware: normalize only against visible zips
        const bounds = map.getBounds();
        // Pad bounds by ~1 county width (~0.5 degrees) so edge counties are included
        const pad = 0.5;
        const west = bounds.getWest() - pad;
        const east = bounds.getEast() + pad;
        const south = bounds.getSouth() - pad;
        const north = bounds.getNorth() + pad;

        // Find visible zips by lat/lng
        const visibleZips: GeoZip[] = [];
        for (const z of allZips) {
          if (z.lat != null && z.lng != null &&
              z.lng >= west && z.lng <= east &&
              z.lat >= south && z.lat <= north) {
            visibleZips.push(z);
          }
        }

        // Local max for normalization
        let localMax = 0;
        for (const z of visibleZips) { if (z.total > localMax) localMax = z.total; }
        const norm = localMax > 0 ? 100 / localMax : 0;

        // Apply normalized density to all zips
        for (const z of allZips) {
          try {
            map.setFeatureState(
              { source: 'zctas', sourceLayer: 'zctas', id: z.zip },
              { density: z.total * norm }
            );
          } catch { /* */ }
        }
      } else {
        // Below zip zoom: use global normalization
        const norm = globalMaxZip > 0 ? 100 / globalMaxZip : 0;
        for (const z of allZips) {
          try {
            map.setFeatureState(
              { source: 'zctas', sourceLayer: 'zctas', id: z.zip },
              { density: z.total * norm }
            );
          } catch { /* */ }
        }
      }
    };

    // Store in ref so moveend handler can access it
    applyZipDensity.current = computeAndApplyZipDensity;

    // Initial apply
    computeAndApplyZipDensity();

    // Re-apply on source load events (tiles load incrementally)
    const handleSourceData = (e: any) => {
      if (e.sourceId === 'counties' && e.isSourceLoaded) {
        for (const c of apiData.geo.counties) {
          try {
            map.setFeatureState(
              { source: 'counties', sourceLayer: 'counties', id: c.fips },
              { density: c.total }
            );
          } catch { /* */ }
        }
      }
      if (e.sourceId === 'zctas' && e.isSourceLoaded) {
        computeAndApplyZipDensity();
      }
    };

    map.on('sourcedata', handleSourceData);
    return () => { map.off('sourcedata', handleSourceData); };
  }, [mapReady, apiData]);

  // Viewport-aware: re-normalize zip density on pan/zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onMoveEnd = () => { applyZipDensity.current(); };
    map.on('moveend', onMoveEnd);
    return () => { map.off('moveend', onMoveEnd); };
  }, [mapReady]);

  // Apply selected/excluded ZIP visual states
  const prevSelectedRef = useRef<Set<string>>(new Set());
  const prevExcludedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear previous selected states
    for (const id of prevSelectedRef.current) {
      try { map.setFeatureState({ source: 'zctas', sourceLayer: 'zctas', id }, { selected: 0 }); } catch { /* */ }
    }
    for (const id of prevExcludedRef.current) {
      try { map.setFeatureState({ source: 'zctas', sourceLayer: 'zctas', id }, { excluded: 0 }); } catch { /* */ }
    }

    // Apply new states
    for (const zip of filters.selectedZips) {
      try { map.setFeatureState({ source: 'zctas', sourceLayer: 'zctas', id: zip }, { selected: 1 }); } catch { /* */ }
    }
    for (const zip of filters.excludedZips) {
      try { map.setFeatureState({ source: 'zctas', sourceLayer: 'zctas', id: zip }, { excluded: 1 }); } catch { /* */ }
    }

    prevSelectedRef.current = new Set(filters.selectedZips);
    prevExcludedRef.current = new Set(filters.excludedZips);
  }, [mapReady, filters.selectedZips, filters.excludedZips]);

  // Hover handling
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const zoom = map.getZoom();
      const point = e.point;

      // Check ZCTA layer first at higher zooms
      if (zoom >= 7) {
        const zctaFeatures = map.queryRenderedFeatures(point, { layers: ['zcta-fill'] });
        if (zctaFeatures.length > 0) {
          const f = zctaFeatures[0];
          const zip = f.properties?.GEOID20;
          if (zip) {
            const data = zipMap.get(zip);
            setHoveredFeature({
              name: `ZIP ${zip}`,
              count: data?.total || 0,
              type: 'zip',
            });
            setHoverPos({ x: point.x, y: point.y });
            resetFade();
            map.getCanvas().style.cursor = 'pointer';
            return;
          }
        }
      }

      // County layer at lower zooms
      if (zoom < 10) {
        const countyFeatures = map.queryRenderedFeatures(point, { layers: ['county-fill'] });
        if (countyFeatures.length > 0) {
          const f = countyFeatures[0];
          const fips = f.properties?.GEOID;
          const name = f.properties?.NAME;
          if (fips) {
            const data = countyMap.get(fips);
            setHoveredFeature({
              name: `${name || fips} County`,
              count: data?.total || 0,
              type: 'county',
            });
            setHoverPos({ x: point.x, y: point.y });
            resetFade();
            map.getCanvas().style.cursor = data && data.total > 0 ? 'pointer' : 'grab';
            return;
          }
        }
      }

      setHoveredFeature(null);
      setHoverPos(null);
      map.getCanvas().style.cursor = 'grab';
    };

    const onMouseLeave = () => {
      setHoveredFeature(null);
      setHoverPos(null);
      map.getCanvas().style.cursor = 'grab';
    };

    const onClick = (e: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) => {
      const zoom = map.getZoom();
      const point = e.point;

      // ZIP click — select or exclude
      if (zoom >= 9) {
        const zctaFeatures = map.queryRenderedFeatures(point, { layers: ['zcta-fill'] });
        if (zctaFeatures.length > 0) {
          const zip = zctaFeatures[0].properties?.GEOID20;
          if (zip) {
            if (e.originalEvent.shiftKey) {
              dispatch({ type: 'TOGGLE_EXCLUDE_ZIP', zip });
            } else {
              dispatch({ type: 'TOGGLE_ZIP', zip });
            }
            return;
          }
        }
      }

      // County click — zoom in
      if (zoom < 10) {
        const countyFeatures = map.queryRenderedFeatures(point, { layers: ['county-fill'] });
        if (countyFeatures.length > 0) {
          const f = countyFeatures[0];
          const fips = f.properties?.GEOID;
          const data = countyMap.get(fips);
          if (data && data.total > 0) {
            const geometry = f.geometry as any;
            if (geometry) {
              const bounds = new maplibregl.LngLatBounds();
              const walkCoords = (coords: any) => {
                if (typeof coords[0] === 'number') {
                  bounds.extend(coords as [number, number]);
                } else {
                  for (const c of coords) walkCoords(c);
                }
              };
              walkCoords(geometry.coordinates);
              if (!bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: 50, duration: 800, maxZoom: 11 });
              }
            }
          }
        }
      }
    };

    map.on('mousemove', onMouseMove);
    map.on('mouseleave', onMouseLeave);
    map.on('click', onClick);

    // Clear tooltip when pointer enters cards
    const clearHandler = () => {
      setHoveredFeature(null);
      setHoverPos(null);
    };
    window.addEventListener('card-hover-start', clearHandler);
    window.addEventListener('chart-panel-enter', clearHandler);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('mouseleave', onMouseLeave);
      map.off('click', onClick);
      window.removeEventListener('card-hover-start', clearHandler);
      window.removeEventListener('chart-panel-enter', clearHandler);
    };
  }, [mapReady, countyMap, zipMap, resetFade, dispatch]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full border-[3px] border-gray-700 border-t-purple-500 animate-spin" />
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredFeature && hoverPos && (
        <div
          className="glass-light rounded-lg px-3 py-2 pointer-events-none absolute z-20"
          style={{ left: hoverPos.x + 12, top: hoverPos.y - 30, ...fadeStyle }}
        >
          <div className="text-xs font-medium text-white">{hoveredFeature.name}</div>
          <div className="text-xs text-gray-300">
            {hoveredFeature.count.toLocaleString()} contacts
          </div>
          {hoveredFeature.type === 'county' && (
            <div className="text-[10px] text-gray-500 mt-0.5">Click to zoom</div>
          )}
        </div>
      )}
    </div>
  );
}
