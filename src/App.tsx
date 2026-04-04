import { useState, useCallback, useEffect } from 'react';
import { FilterProvider } from './contexts/FilterContext';
import { PipelineDashboard } from './components/funnel/PipelineDashboard';
import { MapView } from './components/MapView';
import { FilterBar } from './components/FilterBar';
import { StatsBar } from './components/StatsBar';
import { DraggableCard } from './components/DraggableCard';
import { Sidebar, CARD_CONFIGS } from './components/Sidebar';
import { MobileChartBar } from './components/MobileChartBar';
import { AgeGenderCard } from './components/cards/AgeGenderCard';
import { NetWorthCard } from './components/cards/NetWorthCard';
import { IncomeCard } from './components/cards/IncomeCard';
import { CreditRatingCard } from './components/cards/CreditRatingCard';
import { TopCitiesCard } from './components/cards/TopCitiesCard';
import { FamilyDynamicsCard } from './components/cards/FamilyDynamicsCard';
import { LanguageCard } from './components/cards/LanguageCard';
import { HeadcountCard } from './components/cards/HeadcountCard';
import { CompanyRevenueCard } from './components/cards/CompanyRevenueCard';

const MOBILE_BREAKPOINT = 768;

// Percentage-based positions for desktop draggable cards: [xPct, yPct]
const PCT_POSITIONS: Record<string, [number, number]> = {
  'family':          [0.025, 0.100],
  'language':        [0.207, 0.100],
  'credit':          [0.396, 0.100],
  'income':          [0.025, 0.380],
  'net-worth':       [0.236, 0.380],
  'headcount':       [0.450, 0.380],
  'company-revenue': [0.025, 0.620],
  'age-gender':      [0.236, 0.620],
  'top-cities':      [0.450, 0.620],
};

function computePositions() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const result: Record<string, { x: number; y: number }> = {};
  for (const [id, [xPct, yPct]] of Object.entries(PCT_POSITIONS)) {
    result[id] = { x: Math.round(w * xPct), y: Math.round(h * yPct) };
  }
  return result;
}

// Mobile grid order (left-to-right, top-to-bottom)
const GRID_ORDER = [
  'headcount',        'company-revenue',
  'age-gender',       'top-cities',
  'income',           'credit',
  'net-worth',        'family',
  'language',
];

function App() {
  const [view, setView] = useState<'funnel' | 'map'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'map' ? 'map' : 'funnel';
  });
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CARD_CONFIGS.map(c => [c.id, true])),
  );
  const [positions, setPositions] = useState(computePositions);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [panelOpen, setPanelOpen] = useState(true);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setPositions(computePositions());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onToggle = useCallback((id: string) => {
    setVisibility(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Desktop: draggable card entries
  const desktopCards: { id: string; node: React.ReactNode }[] = [
    { id: 'age-gender',       node: <AgeGenderCard onClose={() => onToggle('age-gender')} /> },
    { id: 'top-cities',       node: <TopCitiesCard onClose={() => onToggle('top-cities')} /> },
    { id: 'income',           node: <IncomeCard onClose={() => onToggle('income')} /> },
    { id: 'credit',           node: <CreditRatingCard onClose={() => onToggle('credit')} /> },
    { id: 'net-worth',        node: <NetWorthCard onClose={() => onToggle('net-worth')} /> },
    { id: 'family',           node: <FamilyDynamicsCard onClose={() => onToggle('family')} /> },
    { id: 'language',         node: <LanguageCard onClose={() => onToggle('language')} /> },
    { id: 'headcount',        node: <HeadcountCard onClose={() => onToggle('headcount')} /> },
    { id: 'company-revenue',  node: <CompanyRevenueCard onClose={() => onToggle('company-revenue')} /> },
  ];

  // Mobile: grid card map
  const mobileCardMap: Record<string, React.ReactNode> = {
    'age-gender':       <AgeGenderCard onClose={() => onToggle('age-gender')} compact />,
    'top-cities':       <TopCitiesCard onClose={() => onToggle('top-cities')} compact />,
    'income':           <IncomeCard onClose={() => onToggle('income')} compact />,
    'credit':           <CreditRatingCard onClose={() => onToggle('credit')} compact />,
    'net-worth':        <NetWorthCard onClose={() => onToggle('net-worth')} compact />,
    'family':           <FamilyDynamicsCard onClose={() => onToggle('family')} compact />,
    'language':         <LanguageCard onClose={() => onToggle('language')} compact />,
    'headcount':        <HeadcountCard onClose={() => onToggle('headcount')} compact />,
    'company-revenue':  <CompanyRevenueCard onClose={() => onToggle('company-revenue')} compact />,
  };

  const visibleMobileCards = GRID_ORDER.filter(id => visibility[id]);

  // View toggle component
  const ViewToggle = () => (
    <div className="fixed top-4 right-4 z-[300] flex gap-1 glass rounded-lg p-1">
      <button
        onClick={() => setView('funnel')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'funnel' ? 'bg-purple-600/40 text-purple-200' : 'text-gray-400 hover:text-white'}`}
      >
        Funnel
      </button>
      <button
        onClick={() => setView('map')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'map' ? 'bg-purple-600/40 text-purple-200' : 'text-gray-400 hover:text-white'}`}
      >
        Map
      </button>
    </div>
  );

  // Funnel Dashboard view
  if (view === 'funnel') {
    return (
      <>
        <ViewToggle />
        <PipelineDashboard />
      </>
    );
  }

  if (isMobile) {
    return (
      <FilterProvider>
        <div className="relative w-screen h-dvh overflow-hidden bg-gray-950">
          <MapView mobilePanelOpen={panelOpen} />
          <div className="absolute top-0 left-0 right-0 z-10 p-3 pointer-events-none">
            <FilterBar onCollapseChange={setFiltersCollapsed} />
            <div className="flex justify-end mt-2">
              <StatsBar hideExport={filtersCollapsed} />
            </div>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col pointer-events-auto bg-gray-950/95 backdrop-blur-lg border-t border-white/10 transition-all duration-300"
            style={{ maxHeight: panelOpen ? 'calc(244px + 70px + env(safe-area-inset-bottom, 0px))' : '0px' }}
            onPointerEnter={() => window.dispatchEvent(new Event('chart-panel-enter'))}
          >
            <div className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scroll-smooth">
              {visibleMobileCards.length > 0 ? (
                <div className="mobile-grid">
                  {Array.from({ length: Math.ceil(visibleMobileCards.length / 2) }, (_, i) => {
                    const left = visibleMobileCards[i * 2];
                    const right = visibleMobileCards[i * 2 + 1];
                    return (
                      <div key={left} className="grid grid-cols-2 snap-start border-b border-white/[0.06]">
                        <div className="min-h-[220px] border-r border-white/[0.06]">
                          {mobileCardMap[left]}
                        </div>
                        {right && (
                          <div className="min-h-[220px]">
                            {mobileCardMap[right]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Tap a chart below to show it
                </div>
              )}
            </div>
            <MobileChartBar visibility={visibility} onToggle={onToggle} />
          </div>
          {/* Collapse / expand handle */}
          <button
            onClick={() => setPanelOpen(prev => !prev)}
            className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto px-6 py-1 rounded-t-lg bg-gray-950/90 backdrop-blur border border-b-0 border-white/10 text-gray-400 transition-all"
            style={{ bottom: panelOpen ? 'calc(244px + 70px + env(safe-area-inset-bottom, 0px))' : '0px', transition: 'bottom 0.3s' }}
          >
            <svg width="20" height="10" viewBox="0 0 20 10" className={`transition-transform duration-300 ${panelOpen ? '' : 'rotate-180'}`}>
              <path d="M2 2 L10 8 L18 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </FilterProvider>
    );
  }

  // Desktop: full-screen map with draggable floating cards
  return (
    <FilterProvider>
      <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
        <ViewToggle />
        <MapView />
        <div className="absolute top-0 left-0 right-0 z-[200] p-3 pointer-events-none">
          <FilterBar onCollapseChange={setFiltersCollapsed} />
          <div className="flex justify-end mt-2">
            <StatsBar hideExport={filtersCollapsed} />
          </div>
        </div>
        <Sidebar visibility={visibility} onToggle={onToggle} />

        {desktopCards.map(c => (
          <DraggableCard
            key={c.id}
            id={c.id}
            defaultX={positions[c.id].x}
            defaultY={positions[c.id].y}
            visible={visibility[c.id]}
          >
            {c.node}
          </DraggableCard>
        ))}
      </div>
    </FilterProvider>
  );
}

export default App;
