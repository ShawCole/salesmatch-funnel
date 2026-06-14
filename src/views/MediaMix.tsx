import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Sliders, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, Delta } from '../ui/primitives';
import { KpiCard } from '../ui/KpiCard';
import { buildMmm, responseCurves } from '../data/mmmMock';
import { fmt, fmtMoney } from '../data/funnelMock';

export function MediaMix() {
  const mmm = useMemo(() => buildMmm(), []);
  const curves = useMemo(() => responseCurves(), []);
  const maxRec = Math.max(...mmm.channels.map((c) => Math.max(c.spendCents, c.recSpendCents)), 1);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="rise flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}><Sparkles size={15} /></div>
        <p className="text-[13px] leading-relaxed text-foreground/90">
          MMM models <b>diminishing returns</b> per channel to find the optimal budget split. At the same spend, reallocating toward under-saturated channels would lift conversions <b>+{mmm.liftPct}%</b> ({fmt(mmm.curConv)} → {fmt(mmm.recConv)}). Email &amp; TikTok have headroom; DSP is saturated.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rise" style={{ animationDelay: '40ms' }}><KpiCard label="Modeled spend" value={fmtMoney(mmm.totalSpendCents)} /></div>
        <div className="rise" style={{ animationDelay: '70ms' }}><KpiCard label="Current conversions" value={fmt(mmm.curConv)} /></div>
        <div className="rise" style={{ animationDelay: '100ms' }}><KpiCard label="Optimized conversions" value={fmt(mmm.recConv)} /></div>
        <div className="rise" style={{ animationDelay: '130ms' }}><KpiCard label="Projected lift" value={`+${mmm.liftPct}%`} /></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* response curves */}
        <Card className="rise" accentTop style={{ animationDelay: '160ms' }}>
          <CardHeader title="Response curves" sub="Conversions vs. spend — flattening = saturation" />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={curves.rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="spend" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmt(v)}`} minTickGap={36} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} />
                {curves.channels.map((c) => (
                  <Line key={c.name} type="monotone" dataKey={c.name} stroke={c.color} strokeWidth={1.75} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* budget optimizer */}
        <Card className="rise" style={{ animationDelay: '200ms' }}>
          <CardHeader title={<span className="flex items-center gap-1.5"><Sliders size={14} style={{ color: 'var(--accent)' }} /> Budget optimizer</span>} sub="Current → recommended allocation" right={<Badge tone="success">+{mmm.liftPct}% conv.</Badge>} />
          <CardBody className="space-y-3">
            {mmm.channels.map((c) => (
              <div key={c.platform}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 font-medium"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">{c.saturation}% saturated {c.recDeltaPct !== 0 && <Delta pct={c.recDeltaPct} />}</span>
                </div>
                <div className="relative h-5 overflow-hidden rounded-md bg-muted">
                  <div className="absolute inset-y-0 left-0 rounded-md opacity-30" style={{ width: `${(c.spendCents / maxRec) * 100}%`, background: c.color }} />
                  <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${(c.recSpendCents / maxRec) * 100}%`, background: c.color, opacity: 0.9 }} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold text-foreground">{fmtMoney(c.recSpendCents)}</span>
                </div>
              </div>
            ))}
            <p className="border-t border-border pt-2 text-[10.5px] text-muted-foreground">Faded = current spend · solid = recommended. Same total budget, re-weighted to the margin.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
