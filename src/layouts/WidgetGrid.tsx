import type { LayoutConfig } from './registry';
import { getWidget } from './registry';
import { WidgetShell } from './WidgetShell';

interface WidgetGridProps {
  layout: LayoutConfig;
  onRemove?: (widgetId: string) => void;
}

export function WidgetGrid({ layout, onRemove }: WidgetGridProps) {
  const visibleWidgets = layout.filter(p => p.visible);

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {visibleWidgets.map(placement => {
        const def = getWidget(placement.widgetId);
        if (!def) return null;
        const Component = def.component;

        return (
          <div
            key={placement.widgetId}
            className="col-span-12"
            style={{
              gridColumn: `span ${Math.min(placement.w, 12)}`,
            }}
          >
            <WidgetShell
              title={def.label}
              onClose={onRemove ? () => onRemove(placement.widgetId) : undefined}
            >
              <Component widgetId={placement.widgetId} />
            </WidgetShell>
          </div>
        );
      })}
    </div>
  );
}
