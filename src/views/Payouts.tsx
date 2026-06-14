import { useMemo } from 'react';
import { Copy, ShieldCheck, Link2, BadgeDollarSign } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge } from '../ui/primitives';
import { DataTable, type Column } from '../ui/DataTable';
import { KpiCard } from '../ui/KpiCard';
import { useDashboard } from '../state/dashboard';
import { ROLE_ROOT } from '../data/orgMock';
import { partnersInScope, payoutSummary, payoutLedger, type PartnerPayout, type PayoutStatus } from '../data/payoutsMock';
import { fmtMoney, fmt } from '../data/funnelMock';

const STATUS_TONE: Record<PayoutStatus, 'success' | 'accent' | 'muted'> = { paid: 'success', pending: 'accent', processing: 'muted' };

export function Payouts() {
  const { role, drillIds } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const partners = useMemo(() => partnersInScope(scopeId), [scopeId]);
  const sum = useMemo(() => payoutSummary(partners), [partners]);
  const ledger = useMemo(() => payoutLedger(partners).slice(0, 8), [partners]);
  const isPartnerSelf = role === 'partner' && partners.length === 1;

  const columns: Column<PartnerPayout>[] = [
    { key: 'name', header: 'Partner', sortVal: (r) => r.name, className: 'whitespace-nowrap', render: (r) => (
      <span className="flex items-center gap-2"><span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: r.color }} /><span className="font-medium">{r.name}</span></span>
    ) },
    { key: 'tier', header: 'Tier', sortVal: (r) => r.tier.ratePct, render: (r) => (
      <span className="inline-flex items-center gap-1.5"><span className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: `${r.tier.color}22`, color: r.tier.color }}>{r.tier.label}</span><span className="text-muted-foreground">{r.tier.ratePct}%</span></span>
    ) },
    { key: 'clients', header: 'Clients', align: 'right', sortVal: (r) => r.clients, render: (r) => fmt(r.clients) },
    { key: 'verified', header: 'Verified conv.', align: 'right', sortVal: (r) => r.verifiedConv, render: (r) => (
      <span className="inline-flex items-center justify-end gap-1"><ShieldCheck size={12} style={{ color: 'hsl(var(--success))' }} />{fmt(r.verifiedConv)}</span>
    ) },
    { key: 'revenue', header: 'Attributed rev.', align: 'right', sortVal: (r) => r.revenueCents, render: (r) => fmtMoney(r.revenueCents) },
    { key: 'earned', header: 'Commission', align: 'right', sortVal: (r) => r.earnedCents, render: (r) => <b>{fmtMoney(r.earnedCents)}</b> },
    { key: 'status', header: 'Status', align: 'right', sortVal: (r) => r.status, render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* narrative */}
      <div className="rise flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}><BadgeDollarSign size={15} /></div>
        <p className="text-[13px] leading-relaxed text-foreground/90">
          Commissions are paid on <b>pixel-verified</b> conversions — not platform-claimed. Partners are paid on real, deduped outcomes, so you never over-pay on inflated numbers.
          {!isPartnerSelf && <> Across {sum.activePartners} partners, <b>{fmtMoney(sum.pendingCents)}</b> is pending and <b>{fmtMoney(sum.paidCents)}</b> paid this cycle.</>}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rise" style={{ animationDelay: '40ms' }}><KpiCard label="Pending payout" value={fmtMoney(sum.pendingCents)} /></div>
        <div className="rise" style={{ animationDelay: '70ms' }}><KpiCard label="Paid this cycle" value={fmtMoney(sum.paidCents)} /></div>
        <div className="rise" style={{ animationDelay: '100ms' }}><KpiCard label="Verified conversions" value={fmt(sum.verifiedConv)} /></div>
        <div className="rise" style={{ animationDelay: '130ms' }}><KpiCard label="Avg commission" value={`${sum.avgRate}%`} /></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* partners table */}
        <Card className="rise lg:col-span-2" accentTop style={{ animationDelay: '160ms' }}>
          <CardHeader title={isPartnerSelf ? 'Your earnings' : 'Partner commissions'} sub="Tied to pixel-verified conversions · click a header to sort" />
          <CardBody className="px-0">
            <DataTable columns={columns} rows={partners} initialSort="earned" getKey={(r) => r.id} />
          </CardBody>
        </Card>

        {/* tracking links */}
        <Card className="rise" style={{ animationDelay: '200ms' }}>
          <CardHeader title={<span className="flex items-center gap-1.5"><Link2 size={14} style={{ color: 'var(--accent)' }} /> Tracking links</span>} sub="UTM-tagged · resolves without a click-ID" />
          <CardBody className="space-y-2">
            {partners.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{p.name}</div>
                  <div className="truncate font-mono text-[10.5px] text-muted-foreground">{p.link}</div>
                </div>
                <button className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Copy link"><Copy size={13} /></button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* payout ledger */}
      <Card className="rise" style={{ animationDelay: '240ms' }}>
        <CardHeader title="Payout ledger" sub="Recent commission runs" />
        <CardBody className="px-0">
          <div className="divide-y divide-border">
            {ledger.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: e.color }} />
                <span className="w-40 flex-shrink-0 truncate text-[13px] font-medium">{e.partner}</span>
                <span className="flex-1 text-[12px] text-muted-foreground">{e.period}</span>
                <span className="tnum text-[13px] font-semibold">{fmtMoney(e.amountCents)}</span>
                <span className="w-24 flex-shrink-0 text-right"><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
