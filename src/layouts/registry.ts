import type { ComponentType } from 'react';

export interface WidgetDef {
  id: string;
  label: string;
  component: ComponentType<{ widgetId: string }>;
  defaultSize: { w: number; h: number };  // grid units
  minSize?: { w: number; h: number };
  roles: Array<'admin' | 'meta_partner' | 'partner' | 'tenant'>;
}

const registry = new Map<string, WidgetDef>();

export function registerWidget(def: WidgetDef) {
  registry.set(def.id, def);
}

export function getWidget(id: string): WidgetDef | undefined {
  return registry.get(id);
}

export function getWidgetsForRole(role: string): WidgetDef[] {
  return [...registry.values()].filter(w => w.roles.includes(role as any));
}

export interface WidgetPlacement {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export type LayoutConfig = WidgetPlacement[];
