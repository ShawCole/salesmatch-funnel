import { useId } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import type { SeriesPoint } from '../data/seriesMock';
import { fmt } from '../data/funnelMock';

/* ---------------- MiniSpark (KPI sparkline) ---------------- */
export function MiniSpark({ data, color, width = 96, height = 30 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const id = useId().replace(/:/g, '');
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const stroke = color ?? 'var(--accent)';
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- TrendChart (line + prior-period overlay) ---------------- */
function TrendTooltip({ active, payload, label, showCompare }: any) {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p: any) => p.dataKey === 'current')?.value;
  const prev = payload.find((p: any) => p.dataKey === 'previous')?.value;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="mb-0.5 font-semibold text-muted-foreground">{label}</div>
      <div className="tnum"><span style={{ color: 'var(--accent)' }}>●</span> Current <b className="ml-1">{fmt(cur)}</b></div>
      {showCompare && prev != null && (
        <div className="tnum text-muted-foreground">○ Prior <b className="ml-1">{fmt(prev)}</b></div>
      )}
    </div>
  );
}

export function TrendChart({ points, height = 240, showCompare = true }: { points: SeriesPoint[]; height?: number; showCompare?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={`area${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={42} tickFormatter={(v) => fmt(v)} />
        <Tooltip content={<TrendTooltip showCompare={showCompare} />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.3 }} />
        {showCompare && (
          <Area type="monotone" dataKey="previous" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.55} strokeWidth={1.25} strokeDasharray="4 3" fill="none" dot={false} />
        )}
        <Area type="monotone" dataKey="current" stroke="var(--accent)" strokeWidth={2.25} fill={`url(#area${id})`} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Multi-line channel trend ---------------- */
export function ChannelLines({ series, height = 220 }: { series: { name: string; color: string; points: { i: number; value: number }[] }[]; height?: number }) {
  // pivot to recharts row format
  const len = series[0]?.points.length ?? 0;
  const rows = Array.from({ length: len }, (_, i) => {
    const row: Record<string, number> = { i };
    series.forEach((s) => { row[s.name] = s.points[i]?.value ?? 0; });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="i" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} minTickGap={30} />
        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={42} tickFormatter={(v) => fmt(v)} />
        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} />
        {series.map((s) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={1.75} dot={false} activeDot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
