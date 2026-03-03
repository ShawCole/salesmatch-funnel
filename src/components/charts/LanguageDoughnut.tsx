import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTooltipFlip } from '../../hooks/useTooltipFlip';
import type { LangSegment } from '../cards/LanguageCard';

interface Props {
  segments: LangSegment[];
  totalCount: number;
  height?: number | string;
  compact?: boolean;
}

export function LanguageDoughnut({ segments, totalCount: _totalCount, height = '100%', compact }: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  const [hover, setHover] = useState<{ name: string; value: number } | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const { ref: tipRef, getStyle } = useTooltipFlip();
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    if (hover && isMobile) {
      fadeTimer.current = setTimeout(() => setHover(null), 3000);
      return () => clearTimeout(fadeTimer.current);
    }
  }, [hover, isMobile]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const onEnter = useCallback((_: unknown, index: number) => {
    setHover(segments[index]);
  }, [segments]);

  const tipPos = hover ? getStyle(mouse.x, mouse.y) : { left: 0, top: 0 };

  return (
    <div style={{ width: '100%', height, position: 'relative' }} onMouseMove={onMouseMove} onMouseLeave={() => setHover(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={compact ? 45 : 35}
            outerRadius={compact ? 80 : 65}
            paddingAngle={2}
            animationDuration={300}
            stroke="none"
            onMouseEnter={onEnter}
            onMouseLeave={() => setHover(null)}
          >
            {segments.map((s, i) => (
              <Cell key={i} fill={s.fill} style={{ cursor: 'default' }} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {hover && createPortal(
        <div
          ref={tipRef}
          className="pointer-events-none fixed z-[9999]"
          style={{ left: tipPos.left, top: tipPos.top }}
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
