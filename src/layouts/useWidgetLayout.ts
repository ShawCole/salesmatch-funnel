import { useState, useCallback, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';
import { getWidgetsForRole, type LayoutConfig } from './registry';

function defaultLayoutForRole(role: string): LayoutConfig {
  const widgets = getWidgetsForRole(role);
  return widgets.map((w, i) => ({
    widgetId: w.id,
    x: 0,
    y: i,
    w: w.defaultSize.w,
    h: w.defaultSize.h,
    visible: true,
  }));
}

export function useWidgetLayout() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [layout, setLayout] = useState<LayoutConfig>(() =>
    defaultLayoutForRole(user?.role || 'tenant')
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/widgets')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.layout?.length > 0) {
          setLayout(data.layout);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user, authFetch]);

  const removeWidget = useCallback((widgetId: string) => {
    setLayout(prev => prev.map(p =>
      p.widgetId === widgetId ? { ...p, visible: false } : p
    ));
  }, []);

  const saveLayout = useCallback(async (newLayout: LayoutConfig) => {
    setLayout(newLayout);
    await authFetch('/api/widgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: newLayout }),
    });
  }, [authFetch]);

  return { layout, loaded, removeWidget, saveLayout };
}
