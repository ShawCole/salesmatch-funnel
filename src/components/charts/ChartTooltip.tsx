import { useRef, useEffect, useLayoutEffect } from 'react';
import { useMobileFade } from '../../hooks/useMobileTooltipDismiss';

interface Entry {
  name: string;
  value: number;
  color?: string;
}

interface Props {
  active?: boolean;
  payload?: Entry[];
  label?: string;
  formatter?: (value: number, name: string) => [string, string];
}

export function ChartTooltip({ active, payload, label, formatter }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { style: fadeStyle, resetFade } = useMobileFade();

  // Reset fade timer whenever tooltip activates or data changes
  const payloadKey = payload?.map(p => `${p.name}:${p.value}`).join(',');
  useEffect(() => {
    if (active && payload?.length) {
      resetFade();
    }
  }, [active, payloadKey]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overflowX = rect.right - window.innerWidth + 8;
    el.style.marginLeft = overflowX > 0 ? `${-overflowX}px` : '0';
    const overflowY = rect.bottom - window.innerHeight + 8;
    el.style.marginTop = overflowY > 0 ? `${-overflowY}px` : '0';
  });

  if (!active || !payload?.length) return null;

  return (
    <div
      ref={ref}
      style={{
        background: 'rgba(17,24,39,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        color: '#f3f4f6',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        ...fadeStyle,
      }}
    >
      {label != null && <div style={{ marginBottom: 2, color: '#9ca3af', fontSize: 11 }}>{label}</div>}
      {payload.map((p, i) => {
        const [display, name] = formatter
          ? formatter(p.value, p.name)
          : [p.value.toLocaleString(), p.name];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {p.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />}
            <span style={{ color: '#9ca3af' }}>{name}:</span>
            <span style={{ fontWeight: 500 }}>{display}</span>
          </div>
        );
      })}
    </div>
  );
}
