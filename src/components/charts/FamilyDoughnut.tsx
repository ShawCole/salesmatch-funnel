import { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTooltipFlip } from '../../hooks/useTooltipFlip';
import { useMobileFade } from '../../hooks/useMobileTooltipDismiss';
import type { IntentRecord } from '../../types/record';

interface Props {
  records: IntentRecord[];
  height?: number | string;
  compact?: boolean;
}

const COLORS = {
  married: '#7c3aed',
  single: '#6b7280',
  marriedKids: '#6d28d9',
  marriedNoKids: '#a78bfa',
  singleKids: '#4b5563',
  singleNoKids: '#9ca3af',
};

interface Segment {
  name: string;
  value: number;
  fill: string;
}

export function FamilyDoughnut({ records, height = '100%', compact }: Props) {
  const { inner, outer } = useMemo(() => {
    let mK = 0, mN = 0, sK = 0, sN = 0;

    for (const r of records) {
      const married = r.MARRIED === 'Y';
      const kids = r.CHILDREN === 'Y';
      if (married) { if (kids) mK++; else mN++; }
      else { if (kids) sK++; else sN++; }
    }

    const inner: Segment[] = [
      { name: 'Married', value: mK + mN, fill: COLORS.married },
      { name: 'Single', value: sK + sN, fill: COLORS.single },
    ];

    const outer: Segment[] = [
      { name: 'Married + Kids', value: mK, fill: COLORS.marriedKids },
      { name: 'Married + No Kids', value: mN, fill: COLORS.marriedNoKids },
      { name: 'Single + Kids', value: sK, fill: COLORS.singleKids },
      { name: 'Single + No Kids', value: sN, fill: COLORS.singleNoKids },
    ];

    return { inner, outer };
  }, [records]);

  const total = records.length || 1;

  const [hover, setHover] = useState<{ name: string; value: number } | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const { ref: tipRef, getStyle } = useTooltipFlip();
  const { style: fadeStyle, resetFade, isMobile } = useMobileFade();

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const onEnter = useCallback((_: unknown, index: number, ring: Segment[]) => {
    resetFade();
    setHover(ring[index]);
  }, []);

  const onLeave = useCallback(() => {
    // On mobile, let the fade timer handle dismissal — don't clear immediately
    if (!isMobile) setHover(null);
  }, [isMobile]);

  const tipPos = hover ? getStyle(mouse.x, mouse.y) : { left: 0, top: 0 };

  return (
    <div style={{ width: '100%', height, position: 'relative' }} onMouseMove={onMouseMove} onMouseLeave={onLeave}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={inner}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={compact ? 50 : 38}
            innerRadius={compact ? 28 : 20}
            paddingAngle={2}
            animationDuration={300}
            stroke="none"
            onMouseEnter={(_, i) => onEnter(_, i, inner)}
            onMouseLeave={onLeave}
          >
            {inner.map((s, i) => (
              <Cell key={i} fill={s.fill} style={{ cursor: 'default' }} />
            ))}
          </Pie>
          <Pie
            data={outer}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={compact ? 55 : 42}
            outerRadius={compact ? 80 : 65}
            paddingAngle={2}
            animationDuration={300}
            stroke="none"
            onMouseEnter={(_, i) => onEnter(_, i, outer)}
            onMouseLeave={onLeave}
          >
            {outer.map((s, i) => (
              <Cell key={i} fill={s.fill} style={{ cursor: 'default' }} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {hover && createPortal(
        <div
          ref={tipRef}
          className="pointer-events-none fixed z-[9999]"
          style={{ left: tipPos.left, top: tipPos.top, ...fadeStyle }}
        >
          <div
            style={{
              background: 'rgba(17,24,39,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              color: '#f3f4f6',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontWeight: 500 }}>{hover.name}</span>
            <span style={{ marginLeft: 8, color: '#9ca3af' }}>
              {hover.value.toLocaleString()} ({((hover.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
