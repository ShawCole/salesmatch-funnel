import { useState } from 'react';
import { ThemeProvider } from './ui/theme';
import { DashboardProvider, useDashboard } from './state/dashboard';
import { FilterProvider } from './contexts/FilterContext';
import { AppShell } from './shell/AppShell';
import { ErrorBoundary } from './ui/ErrorBoundary';
import type { ViewKey } from './shell/nav';
import { Overview } from './views/Overview';
import { Insights } from './views/Insights';
import { FunnelView } from './views/FunnelView';
import { Campaigns } from './views/Campaigns';
import { Reconciliation } from './views/Reconciliation';
import { Attribution } from './views/Attribution';
import { Payouts } from './views/Payouts';
import { Settings } from './views/Settings';
import { Paths } from './views/Paths';
import { MapView } from './components/MapView';

function Shelled() {
  const [view, setView] = useState<ViewKey>('overview');
  const { drillIds, setDrillIds } = useDashboard();

  const drillTo = (id: string) => setDrillIds([...drillIds, id]);

  return (
    <AppShell view={view} onNavigate={setView} showFilters={view !== 'map' && view !== 'settings'}>
      <ErrorBoundary label="This view hit an error">
        {view === 'overview' && <Overview onNavigate={(v) => setView(v)} onDrill={drillTo} />}
        {view === 'insights' && <Insights />}
        {view === 'people' && <FunnelView mode="people" />}
        {view === 'marketing' && <FunnelView mode="marketing" />}
        {view === 'campaigns' && <Campaigns />}
        {view === 'paths' && <Paths />}
        {view === 'reconciliation' && <Reconciliation />}
        {view === 'attribution' && <Attribution />}
        {view === 'payouts' && <Payouts />}
        {view === 'settings' && <Settings />}
        {view === 'map' && (
          <div className="relative h-full w-full">
            <FilterProvider>
              <MapView />
            </FilterProvider>
          </div>
        )}
      </ErrorBoundary>
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DashboardProvider>
        <Shelled />
      </DashboardProvider>
    </ThemeProvider>
  );
}
