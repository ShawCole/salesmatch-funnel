import { useMemo } from 'react';
import { Link2Off, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge } from '../ui/primitives';
import { useDashboard } from '../state/dashboard';
import { getNode, ROLE_ROOT, rollup } from '../data/orgMock';
import { campaignBreakdown, bySource, utmResolvedOnly, type CampaignRow } from '../data/utmMock';
import { fmt } from '../data/funnelMock';

export function Campaigns() {
  const { role, drillIds, campaignId } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const total = scope.kind === 'tenant' ? Math.round(420 * (scope.scale ?? 1)) : rollup(scope).converted;

  const rows = useMemo(() => campaignBreakdown(total), [total]);
  const sources = useMemo(() => bySource(rows), [rows]);
  const resolved = useMemo(() => utmResolvedOnly(rows), [rows]);
  const maxConv = Math.max(...rows.map((r) => r.conversions), 1);
  const resolvedPct = total ? Math.round((resolved.total / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* narrative */}
      <div className="rise flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}><Sparkles size={15} /></div>
        <p className="text-[13px] leading-relaxed text-foreground/90">
          The pixel reads <b>utm_source / utm_medium / utm_campaign</b> from the pre-redirect URL on every visit — so campaigns are tracked even when a redirect strips the query string.
          <b> {fmt(resolved.total)} of {fmt(total)} conversions ({resolvedPct}%)</b> came from UTM-tagged sources with <b>no ad click-ID</b> (email, partner, organic) — invisible to Meta &amp; Google, but caught here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* campaign table */}
        <Card className="rise lg:col-span-2" accentTop style={{ animationDelay: '60ms' }}>
          <CardHeader title="Campaigns" sub="utm_campaign · ranked by conversions" />
          <CardBody className="px-0">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-1.5 text-left font-medium">Campaign</th>
                  <th className="px-2 py-1.5 text-left font-medium">Source / medium</th>
                  <th className="px-2 py-1.5 text-right font-medium">Visits</th>
                  <th className="px-2 py-1.5 text-right font-medium">Conv.</th>
                  <th className="px-4 py-1.5 text-right font-medium">CVR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const dim = campaignId !== 'all' && campaignId !== r.id;
                  return (
                    <tr key={r.id} className={`border-b border-border/60 transition-opacity ${dim ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5 font-medium">{r.name}{!r.clickId && <Badge tone="accent"><Link2Off size={9} /> no click-ID</Badge>}</div>
                        {r.content && <div className="text-[10.5px] text-muted-foreground">{r.content}</div>}
                      </td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded px-1.5 py-0.5 text-[10.5px] font-medium text-white" style={{ background: r.source.color }}>{r.source.source}</span>
                          <span className="text-[10.5px] text-muted-foreground">/ {r.source.medium}</span>
                        </span>
                      </td>
                      <td className="tnum px-2 py-2 text-right text-muted-foreground">{fmt(r.visits)}</td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block"><div className="h-full rounded-full" style={{ width: `${(r.conversions / maxConv) * 100}%`, background: r.source.color }} /></div>
                          <span className="tnum font-semibold">{fmt(r.conversions)}</span>
                        </div>
                      </td>
                      <td className="tnum px-4 py-2 text-right text-muted-foreground">{r.convRate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* right column: by source + UTM-resolved callout */}
        <div className="space-y-4">
          <Card className="rise" style={{ animationDelay: '120ms' }}>
            <CardHeader title="By source" sub="utm_source share of conversions" />
            <CardBody className="space-y-2.5">
              {sources.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="flex w-24 flex-shrink-0 items-center gap-1 text-[12px] text-muted-foreground">{s.source.source}{!s.clickId && <Link2Off size={10} className="opacity-60" />}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(s.conversions / total) * 100}%`, background: s.source.color }} /></div>
                  <span className="tnum w-10 flex-shrink-0 text-right text-[12px] font-medium">{fmt(s.conversions)}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card className="rise" style={{ animationDelay: '180ms' }}>
            <CardHeader title={<span className="flex items-center gap-1.5"><Link2Off size={14} style={{ color: 'var(--accent)' }} /> UTM-resolved only</span>} sub="Tracked by UTM — no platform click-ID" />
            <CardBody>
              <div className="tnum mb-1 text-[28px] font-semibold" style={{ color: 'var(--accent)' }}>{fmt(resolved.total)}</div>
              <p className="mb-3 text-[11px] text-muted-foreground">conversions Meta &amp; Google can't see — the pixel + UTM caught them. Partner/referral feeds your payout ledger.</p>
              <div className="space-y-1.5">
                {resolved.sources.map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.source.color }} />{s.source.source} / {s.source.medium}</span>
                    <span className="tnum font-medium">{fmt(s.conversions)}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export type { CampaignRow };
