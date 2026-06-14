import { useMemo, useState } from 'react';
import { Download, Search, CalendarClock, Check } from 'lucide-react';
import { Card, CardHeader, CardBody, Segmented, Badge } from '../ui/primitives';
import { DataTable, type Column } from '../ui/DataTable';
import { useDashboard } from '../state/dashboard';
import { getNode, ROLE_ROOT, rollup, leafTenants } from '../data/orgMock';
import { campaignBreakdown } from '../data/utmMock';
import { PLATFORM_ORDER, PLATFORMS, fmt, fmtMoney } from '../data/funnelMock';

type Dataset = 'channels' | 'campaigns' | 'clients';

interface Row { id: string; name: string; color: string; sub?: string; spendCents: number; conversions: number; verified: number; cpaCents: number; cvr: number; badge?: string; }

export function Reports() {
  const { role, drillIds } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const m = rollup(scope);
  const [dataset, setDataset] = useState<Dataset>('channels');
  const [q, setQ] = useState('');

  const rows: Row[] = useMemo(() => {
    if (dataset === 'channels') {
      const w: Record<string, number> = { meta: 44, google: 29, linkedin: 19, email: 4, dsp: 2, tiktok: 2 };
      const sum = PLATFORM_ORDER.reduce((a, p) => a + (w[p] || 0), 0);
      return PLATFORM_ORDER.filter((p) => w[p]).map((p) => {
        const share = w[p] / sum;
        const conversions = Math.round(m.converted * share);
        const spendCents = Math.round(m.spendCents * share);
        return { id: p, name: PLATFORMS[p].name, color: PLATFORMS[p].color, spendCents, conversions, verified: Math.round(conversions * 0.86), cpaCents: conversions ? Math.round(spendCents / conversions) : 0, cvr: 2 + (w[p] % 5) * 0.4 };
      });
    }
    if (dataset === 'campaigns') {
      return campaignBreakdown(m.converted).map((c) => ({
        id: c.id, name: c.name, color: c.source.color, sub: `${c.source.source}/${c.source.medium}`,
        spendCents: c.clickId ? Math.round((c.conversions * c.convRate) * 900) : Math.round(c.conversions * 200),
        conversions: c.conversions, verified: Math.round(c.conversions * (c.clickId ? 0.84 : 1)),
        cpaCents: c.conversions ? Math.round((c.clickId ? (c.conversions * c.convRate) * 900 : c.conversions * 200) / c.conversions) : 0,
        cvr: c.convRate, badge: c.clickId ? undefined : 'no click-ID',
      }));
    }
    return leafTenants(scope).map((t) => {
      const tm = rollup(t);
      return { id: t.id, name: t.name, color: t.color, spendCents: tm.spendCents, conversions: tm.converted, verified: Math.round(tm.converted * 0.86), cpaCents: tm.converted ? Math.round(tm.spendCents / tm.converted) : 0, cvr: 2.8, badge: `${(t.trendPct ?? 0) >= 0 ? '+' : ''}${t.trendPct}% WoW` };
    });
  }, [dataset, m, scope]);

  const filtered = useMemo(() => rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.sub?.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const columns: Column<Row>[] = [
    { key: 'name', header: dataset === 'channels' ? 'Channel' : dataset === 'campaigns' ? 'Campaign' : 'Client', sortVal: (r) => r.name, className: 'whitespace-nowrap', render: (r) => (
      <div className="flex items-center gap-2"><span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: r.color }} /><div><div className="font-medium">{r.name}</div>{r.sub && <div className="font-mono text-[10px] text-muted-foreground">{r.sub}</div>}</div>{r.badge && <Badge tone="muted">{r.badge}</Badge>}</div>
    ) },
    { key: 'spend', header: 'Spend', align: 'right', sortVal: (r) => r.spendCents, render: (r) => fmtMoney(r.spendCents) },
    { key: 'conv', header: 'Conversions', align: 'right', sortVal: (r) => r.conversions, render: (r) => fmt(r.conversions) },
    { key: 'verified', header: 'Verified', align: 'right', sortVal: (r) => r.verified, render: (r) => fmt(r.verified) },
    { key: 'cpa', header: 'CPA', align: 'right', sortVal: (r) => r.cpaCents, render: (r) => fmtMoney(r.cpaCents) },
    { key: 'cvr', header: 'CVR', align: 'right', sortVal: (r) => r.cvr, render: (r) => `${r.cvr.toFixed(1)}%` },
  ];

  const exportCsv = () => {
    const header = ['name', 'sub', 'spend', 'conversions', 'verified', 'cpa', 'cvr'];
    const lines = [header.join(',')].concat(filtered.map((r) => [r.name, r.sub ?? '', (r.spendCents / 100).toFixed(2), r.conversions, r.verified, (r.cpaCents / 100).toFixed(2), r.cvr.toFixed(1)].join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report-${dataset}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <Card className="rise" accentTop>
        <CardHeader
          title="Performance report"
          sub="Sortable detail — click any column header"
          right={
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-lg border border-border px-2 py-1 sm:flex">
                <Search size={13} className="text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-28 bg-transparent text-[12px] outline-none" />
              </div>
              <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted"><Download size={13} /> CSV</button>
              <ScheduleButton />
            </div>
          }
        />
        <CardBody className="px-0">
          <div className="px-4 pb-3">
            <Segmented<Dataset> value={dataset} onChange={setDataset} options={[{ key: 'channels', label: 'Channels' }, { key: 'campaigns', label: 'Campaigns' }, { key: 'clients', label: 'Clients' }]} />
          </div>
          <DataTable columns={columns} rows={filtered} initialSort="conv" getKey={(r) => r.id} />
        </CardBody>
      </Card>
    </div>
  );
}

function ScheduleButton() {
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [fmtKind, setFmtKind] = useState<'pdf' | 'csv'>('pdf');
  const [saved, setSaved] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => { setOpen((o) => !o); setSaved(false); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-white" style={{ background: 'var(--accent)' }}><CalendarClock size={13} /> Schedule</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
            <div className="mb-2 text-[12px] font-semibold">Schedule this report</div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Frequency</div>
            <div className="mb-3"><Segmented value={freq} onChange={setFreq} size="sm" options={[{ key: 'daily', label: 'Daily' }, { key: 'weekly', label: 'Weekly' }, { key: 'monthly', label: 'Monthly' }]} /></div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Format</div>
            <div className="mb-3"><Segmented value={fmtKind} onChange={setFmtKind} size="sm" options={[{ key: 'pdf', label: 'PDF (branded)' }, { key: 'csv', label: 'CSV' }]} /></div>
            <input placeholder="recipients (comma-sep)" className="mb-2 w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-[12px] outline-none" defaultValue="client@salesmatch.io" />
            <p className="mb-2 text-[10.5px] text-muted-foreground">{fmtKind === 'pdf' ? 'White-label PDF — your accent + logo, no ArkData branding.' : 'Raw CSV export.'}</p>
            <button onClick={() => { setSaved(true); setTimeout(() => setOpen(false), 900); }} className="w-full rounded-md py-1.5 text-[12px] font-semibold text-white" style={{ background: 'var(--accent)' }}>
              {saved ? <span className="inline-flex items-center gap-1"><Check size={13} /> Scheduled</span> : `Schedule ${freq} delivery`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
