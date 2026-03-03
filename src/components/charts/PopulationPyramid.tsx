import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PyramidItem } from '../../utils/aggregation';
import { useMobileTooltipDismiss } from '../../hooks/useMobileTooltipDismiss';

interface Props {
  data: PyramidItem[];
  height?: number | string;
  compact?: boolean;
}

function niceMax(val: number): number {
  if (val <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
  const normalized = val / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

export function PopulationPyramid({ data, height = '100%', compact }: Props) {
  const { ref: dismissRef, onTouchStart } = useMobileTooltipDismiss();
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.male, Math.abs(d.female))),
    1,
  );
  const nice = niceMax(maxVal);
  const domain: [number, number] = [-nice, nice];
  const half = nice / 2;
  const symmetricTicks = compact
    ? [-nice, -half, 0, half, nice]
    : [-nice, -half, -nice / 4, 0, nice / 4, half, nice];

  return (
    <div ref={dismissRef} onTouchStart={onTouchStart} style={{ width: '100%', height }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 16, right: 8, bottom: 4, left: 0 }}
        stackOffset="sign"
      >
        <XAxis
          type="number"
          domain={domain}
          ticks={symmetricTicks}
          tick={{ fill: '#9ca3af', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => {
            const abs = Math.abs(v);
            if (compact && abs >= 1000) return `${(abs / 1000).toLocaleString()}k`;
            return abs.toLocaleString();
          }}
        />
        <YAxis
          type="category"
          dataKey="ageRange"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={42}
          tickFormatter={(v: any) => v === '65 and older' ? '65+' : String(v)}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            background: 'rgba(17,24,39,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#f3f4f6',
            fontSize: 12,
          }}
          labelFormatter={(label: any) => String(label) === '65 and older' ? '65+' : String(label)}
          formatter={(value: any, name: any) => [
            Math.abs(Number(value)).toLocaleString(),
            name === 'female' ? 'Female' : 'Male',
          ]}
        />
        <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
        <Bar dataKey="female" stackId="pyramid" fill="#ec4899" animationDuration={500} shape={(props: any) => {
          const { x, y, width, height: h } = props as { x: number; y: number; width: number; height: number };
          const absW = Math.abs(width);
          const r = Math.min(4, absW / 2, h / 2);
          const startX = width < 0 ? x + width : x;
          return (
            <path
              d={`M${startX + r},${y} L${startX + absW},${y} L${startX + absW},${y + h} L${startX + r},${y + h} Q${startX},${y + h} ${startX},${y + h - r} L${startX},${y + r} Q${startX},${y} ${startX + r},${y}`}
              fill="#ec4899"
            />
          );
        }} />
        <Bar dataKey="male" stackId="pyramid" fill="#3b82f6" animationDuration={500} shape={(props: any) => {
          const { x, y, width, height: h } = props as { x: number; y: number; width: number; height: number };
          const absW = Math.abs(width);
          const r = Math.min(4, absW / 2, h / 2);
          const endX = x + absW;
          return (
            <path
              d={`M${x},${y} L${endX - r},${y} Q${endX},${y} ${endX},${y + r} L${endX},${y + h - r} Q${endX},${y + h} ${endX - r},${y + h} L${x},${y + h} Z`}
              fill="#3b82f6"
            />
          );
        }} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
