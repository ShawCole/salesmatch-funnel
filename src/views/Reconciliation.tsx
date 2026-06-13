import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge } from '../ui/primitives';
import { useDashboard } from '../state/dashboard';
import { getNode, ROLE_ROOT, rollup } from '../data/orgMock';
import { buildReconciliation } from '../data/reconciliationMock';
import { campaignBreakdown, utmResolvedOnly } from '../data/utmMock';
import { fmt } from '../data/funnelMock';
import { Link2Off } from 'lucide-react';

export function Reconciliation() {
  const { role, drillIds } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const scale = scope.kind === 'tenant' ? (scope.scale ?? 1) : Math.max(0.6, rollup(scope).converted / 420);
  const d = useMemo(() => buildReconciliation(scale), [scale]);
  // The conversions with NO click-ID = the pixel-only bucket in the truth.
  // Show how UTM splits those by source (proportions from the campaign mix,
  // scaled to the pixel-only count so the numbers reconcile with the truth above).
  const utm = useMemo(() => {
    const r = utmResolvedOnly(campaignBreakdown(420));
    const wsum = r.sources.reduce((a, s) => a + s.conversions, 0) || 1;
    let allocated = 0;
    const sources = r.sources.map((s, i) => {
      const v = i === r.sources.length - 1 ? Math.max(0, d.pixelOnly - allocated) : Math.round((s.conversions / wsum) * d.pixelOnly);
      allocated += v;
      return { ...s, conversions: v };
    });
    return { total: d.pixelOnly, sources };
  }, [d.pixelOnly]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* narrative */}
      <div className="rise flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}><Sparkles size={15} /></div>
        <div className="space-y-1">
          {d.narrative.map((n, i) => <p key={i} className={`text-[13px] leading-relaxed ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>{n}</p>)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* per-platform reconciliation */}
        {d.perPlatform.map((p, idx) => (
          <Card key={p.platform} className="rise" style={{ animationDelay: `${60 + idx * 60}ms` }}>
            <CardHeader
              title={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.label}</span>}
              sub="Reconciled on its own — never summed with the other"
              right={<Badge tone="danger">−{p.overClaimPct}% over-claimed</Badge>}
            />
            <CardBody>
              <div className="mb-3 flex items-end gap-4">
                <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Platform claims</div><div className="tnum text-[24px] font-semibold text-muted-foreground line-through decoration-1">{fmt(p.claimed)}</div></div>
                <div className="pb-1 text-muted-foreground">→</div>
                <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pixel verifies</div><div className="tnum text-[28px] font-semibold" style={{ color: p.color }}>{fmt(p.verified)}</div></div>
              </div>
              <div className="space-y-1.5">
                {p.reasons.filter((r) => r.delta !== 0).map((r) => (
                  <div key={r.key} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="tnum font-medium text-[hsl(var(--destructive))]">{r.delta}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* the one truth */}
      <Card className="rise" accentTop style={{ animationDelay: '200ms' }}>
        <CardHeader title="The one pixel-verified truth" sub={`${fmt(d.pixelVerified)} unique people — composed, not summed`} right={<span className="text-[11px] text-muted-foreground">{d.asOf}</span>} />
        <CardBody>
          <div className="mb-3 flex h-10 w-full overflow-hidden rounded-lg">
            {d.truth.map((t) => (
              <div key={t.key} className="flex h-full items-center justify-center" style={{ width: `${(t.value / d.pixelVerified) * 100}%`, background: t.color }} title={`${t.label}: ${t.value}`}>
                <span className="tnum text-[12px] font-bold text-white">{t.value}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {d.truth.map((t) => (
              <div key={t.key} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: t.color }} />{t.label}</div>
                <div className="tnum mt-1 text-[20px] font-semibold">{fmt(t.value)}</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{t.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
            {d.otherSources.map((o) => (
              <div key={o.key} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                <span className="font-medium">{o.label}</span>
                <span className="tnum text-muted-foreground">{fmt(o.claimed)}</span>
                <span className="text-[10.5px] text-muted-foreground">— {o.note}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* UTM resolution — how click-ID-less conversions get attributed */}
      <Card className="rise" style={{ animationDelay: '240ms' }}>
        <CardHeader
          title={<span className="flex items-center gap-1.5"><Link2Off size={14} style={{ color: 'var(--accent)' }} /> Resolved by UTM, not click-ID</span>}
          sub="The fallback signal for conversions the platforms never see"
          right={<span className="tnum text-[20px] font-semibold" style={{ color: 'var(--accent)' }}>{fmt(utm.total)}</span>}
        />
        <CardBody>
          <p className="mb-3 text-[12px] text-muted-foreground">Email, partner/referral and organic carry no gclid/fbclid — so the platforms can't claim them. The pixel attributes them from the <b>utm_*</b> it captured before the redirect. Partner/referral conversions also feed the payout ledger.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {utm.sources.map((s) => (
              <div key={s.key} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-1.5 text-[12px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: s.source.color }} />{s.source.source} / {s.source.medium}</div>
                <div className="tnum mt-1 text-[18px] font-semibold">{fmt(s.conversions)}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="rise" style={{ animationDelay: '300ms' }}>
        <CardHeader title="How the pixel resolves this" />
        <CardBody className="space-y-1.5">
          {d.methodology.map((mth, i) => <p key={i} className="text-[12px] leading-relaxed text-muted-foreground">{mth}</p>)}
        </CardBody>
      </Card>
    </div>
  );
}
