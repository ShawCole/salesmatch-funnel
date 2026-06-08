import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WidgetGrid } from './WidgetGrid';
import { useWidgetLayout } from './useWidgetLayout';

interface DashboardLayoutProps {
  header?: ReactNode;
  children?: ReactNode;
}

export function DashboardLayout({ header, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { layout, removeWidget } = useWidgetLayout();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold">
              <span style={{ color: 'var(--brand-primary, #a855f7)' }}>
                {user?.brand?.name || 'Attribution'}
              </span>
              {' '}Dashboard
            </h1>
            {user && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 uppercase tracking-wider">
                {user.role.replace('_', ' ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="text-xs text-gray-500">{user.email}</span>
                <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors">
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        {header}
        {children}
        <WidgetGrid layout={layout} onRemove={removeWidget} />
      </div>
    </div>
  );
}
