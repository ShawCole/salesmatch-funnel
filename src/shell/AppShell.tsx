import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { FilterBar } from './FilterBar';
import type { ViewKey } from './nav';
import { cn } from '../ui/cn';

export function AppShell({ view, onNavigate, showFilters = true, children }: {
  view: ViewKey;
  onNavigate: (v: ViewKey) => void;
  showFilters?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar view={view} onNavigate={onNavigate} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[240px] shadow-xl">
            <Sidebar view={view} onNavigate={onNavigate} collapsed={false} onToggle={() => {}} mobile onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar view={view} onOpenMobileNav={() => setMobileOpen(true)} />
        {showFilters && <FilterBar view={view} />}
        <main className={cn('min-h-0 flex-1 overflow-y-auto', view === 'map' ? '' : 'px-4 py-4 sm:px-5 sm:py-5')}>
          {children}
        </main>
      </div>
    </div>
  );
}
