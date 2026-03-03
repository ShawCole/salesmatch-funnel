import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { CountItem } from '../../utils/aggregation';
import { useMobileTooltipDismiss } from '../../hooks/useMobileTooltipDismiss';

interface Props {
  data: CountItem[];
  color?: string;
  height?: number | string;
  yAxisWidth?: number;
  compact?: boolean;
}

function CustomTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill="#9ca3af"
      fontSize={11}
    >
      {payload.value}
    </text>
  );
}

function formatTick(v: number, compact?: boolean) {
  if (compact && v >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  return v.toLocaleString();
}

export function HorizontalBar({ data, color = '#2563eb', height = '100%', yAxisWidth = 90, compact }: Props) {
  const { ref: dismissRef, onTouchStart } = useMobileTooltipDismiss();
  return (
    <div ref={dismissRef} onTouchStart={onTouchStart} style={{ width: '100%', height, overflow: 'hidden', paddingRight: 6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatTick(v, compact)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={CustomTick as never}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
            interval={0}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(17,24,39,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#f3f4f6',
              fontSize: 12,
            }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[0, 3, 3, 0]}
            animationDuration={500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
