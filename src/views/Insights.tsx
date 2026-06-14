import { useMemo } from 'react';
import { Sparkles, Send, ArrowRight, Bookmark, AlertTriangle, TrendingUp, Trophy, Activity } from 'lucide-react';
import { Card, Delta, Badge } from '../ui/primitives';
import { useDashboard } from '../state/dashboard';
import { buildInsights, KIND_META, type Insight, type InsightKind } from '../data/insightsMock';

const ICON: Record<InsightKind, typeof AlertTriangle> = { risk: AlertTriangle, opportunity: TrendingUp, win: Trophy, anomaly: Activity };
const ORDER: InsightKind[] = ['risk', 'opportunity', 'anomaly', 'win'];

export function Insights() {
  const { role, drillIds } = useDashboard();
  const insights = useMemo(() => buildInsights(role, drillIds), [role, drillIds]);
  const sorted = useMemo(() => [...insights].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || b.confidence - a.confidence), [insights]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    insights.forEach((i) => { c[i.kind] = (c[i.kind] ?? 0) + 1; });
    return c;
  }, [insights]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      {/* header */}
      <div className="rise flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}><Sparkles size={15} /></div>
          <div>
            <div className="flex items-center gap-2"><span className="text-[13px] font-semibold">What changed this period</span><Badge tone="accent">AI · beta</Badge></div>
            <p className="text-[12px] text-muted-foreground">{insights.length} insights, ranked by impact and confidence. Grounded in your reconciliation, attribution and UTM data.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ORDER.filter((k) => counts[k]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium">
              <span className="h-2 w-2 rounded-full" style={{ background: KIND_META[k].color }} />{counts[k]} {KIND_META[k].label}
            </span>
          ))}
        </div>
      </div>

      {/* feed */}
      <div className="space-y-3">
        {sorted.map((it, i) => <InsightCard key={it.id} it={it} delay={i * 40} />)}
      </div>
    </div>
  );
}

function InsightCard({ it, delay }: { it: Insight; delay: number }) {
  const meta = KIND_META[it.kind];
  const Icon = ICON[it.kind];
  return (
    <Card className="rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex gap-3 p-4">
        <div className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg" style={{ background: `${meta.color}1a`, color: meta.color }}><Icon size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${meta.color}1a`, color: meta.color }}>{meta.label}</span>
            <h3 className="text-[14px] font-semibold tracking-tight">{it.title}</h3>
            {it.deltaPct != null && <Delta pct={it.deltaPct} invert={it.invertDelta} />}
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">{it.detail}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-white" style={{ background: 'var(--accent)' }}>
              {it.action} <ArrowRight size={13} />
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Send size={12} /> Route to Slack</button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground" title="Save"><Bookmark size={12} /></button>
            <span className="ml-auto text-[11px] text-muted-foreground">confidence {it.confidence}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
