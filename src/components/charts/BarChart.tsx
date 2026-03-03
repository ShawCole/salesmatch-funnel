import {
  BarChart as RechartsBarChart,
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
  xAxisHeight?: number;
}

function AngledTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={2}
        textAnchor="end"
        fill="#9ca3af"
        fontSize={10}
        transform="rotate(-35)"
      >
        {payload.value}
      </text>
    </g>
  );
}

export function BarChart({ data, color = '#7c3aed', height = '100%', xAxisHeight = 38 }: Props) {
  const { ref: dismissRef, onTouchStart } = useMobileTooltipDismiss();
  return (
    <div ref={dismissRef} onTouchStart={onTouchStart} style={{ width: '100%', height }}>
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data} margin={{ top: 4, right: 4, bottom: 17, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={AngledTick as never}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
          interval={0}
          height={xAxisHeight}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={45}
          tickFormatter={(v: number) => v.toLocaleString()}
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
          radius={[3, 3, 0, 0]}
          animationDuration={500}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
    </div>
  );
}
