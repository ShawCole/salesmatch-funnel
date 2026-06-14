import { useState } from 'react';
import { Check, Plug, Palette, Users2, Bell, RefreshCw, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, Button } from '../ui/primitives';
import { useDashboard } from '../state/dashboard';

interface Integration { key: string; name: string; cat: string; color: string; connected: boolean; sync?: string; note: string; }
const INTEGRATIONS: Integration[] = [
  { key: 'pixel', name: 'ArkData Pixel', cat: 'First-party', color: '#7c3aed', connected: true, sync: 'live', note: 'Person-level pixel — captures click-IDs + UTM (pre-redirect).' },
  { key: 'meta', name: 'Meta Ads', cat: 'Ad platform', color: '#1877F2', connected: true, sync: '14:05', note: 'Conversions API + ad spend.' },
  { key: 'google', name: 'Google Ads', cat: 'Ad platform', color: '#ea4335', connected: true, sync: '14:05', note: 'Click data (gclid) + spend.' },
  { key: 'ga4', name: 'Google Analytics 4', cat: 'Analytics', color: '#f9ab00', connected: false, note: 'Session-based context for reconciliation.' },
  { key: 'hubspot', name: 'HubSpot', cat: 'CRM', color: '#ff7a59', connected: true, sync: '13:40', note: 'Closed-won — the revenue ground truth.' },
  { key: 'salesforce', name: 'Salesforce', cat: 'CRM', color: '#00a1e0', connected: false, note: 'Alternative CRM for closed-won sync.' },
  { key: 'tiktok', name: 'TikTok Ads', cat: 'Ad platform', color: '#25F4EE', connected: false, note: 'Events API + spend.' },
  { key: 'slack', name: 'Slack', cat: 'Alerting', color: '#611f69', connected: true, sync: 'webhook', note: 'Route AI insights + alerts to channels.' },
];

const ACCENTS = ['#7c3aed', '#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];

const TEAM = [
  { name: 'Shaw Cole', email: 'shaw@arkdata.io', role: 'Owner', color: '#7c3aed' },
  { name: 'Dana Reyes', email: 'dana@arkdata.io', role: 'Admin', color: '#0ea5e9' },
  { name: 'Marcus Lee', email: 'marcus@apexnetwork.co', role: 'Meta-Partner', color: '#8b5cf6' },
  { name: 'Priya Shah', email: 'priya@fastfund.io', role: 'Partner', color: '#6366f1' },
];

export function Settings() {
  const { accent, setAccent } = useDashboard();
  const [subdomain, setSubdomain] = useState('salesmatch');

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      {/* integrations */}
      <Card className="rise" accentTop>
        <CardHeader title={<span className="flex items-center gap-1.5"><Plug size={14} style={{ color: 'var(--accent)' }} /> Integrations</span>} sub="Connect ad platforms, analytics, CRM and alerting" right={<Button variant="ghost"><RefreshCw size={13} /> Sync all</Button>} />
        <CardBody>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {INTEGRATIONS.map((it) => (
              <div key={it.key} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-[13px] font-bold" style={{ background: `${it.color}1f`, color: it.color }}>{it.name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{it.name}</span>
                    <Badge tone="muted">{it.cat}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{it.note}</p>
                  <div className="mt-2">
                    {it.connected
                      ? <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'hsl(var(--success))' }}><Check size={13} /> Connected{it.sync && it.sync !== 'live' && it.sync !== 'webhook' ? ` · synced ${it.sync}` : it.sync === 'live' ? ' · live' : ''}</span>
                      : <button className="rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted">Connect</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* white-label */}
        <Card className="rise" style={{ animationDelay: '60ms' }}>
          <CardHeader title={<span className="flex items-center gap-1.5"><Palette size={14} style={{ color: 'var(--accent)' }} /> White-label &amp; branding</span>} sub="Per-tenant accent + custom subdomain" />
          <CardBody className="space-y-4">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Accent color</div>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENTS.map((c) => (
                  <button key={c} onClick={() => setAccent(c)} className="grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-110" style={{ background: c, boxShadow: accent.toLowerCase() === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}` : undefined }}>
                    {accent.toLowerCase() === c && <Check size={15} className="text-white" />}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Live preview — the whole app re-skins instantly. Each tenant gets their own.</p>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Client subdomain</div>
              <div className="flex items-center overflow-hidden rounded-lg border border-border">
                <input value={subdomain} onChange={(e) => setSubdomain(e.target.value.replace(/[^a-z0-9-]/g, ''))} className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-[13px] outline-none" />
                <span className="flex-shrink-0 border-l border-border bg-muted px-2.5 py-1.5 text-[12px] text-muted-foreground">.arkdata.io</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* alerts */}
        <Card className="rise" style={{ animationDelay: '100ms' }}>
          <CardHeader title={<span className="flex items-center gap-1.5"><Bell size={14} style={{ color: 'var(--accent)' }} /> Alerts &amp; automations</span>} sub="When to notify, and where" />
          <CardBody className="space-y-2.5">
            {[
              { label: 'Over-attribution detected (>25% gap)', on: true },
              { label: 'Tenant conversions drop >10% WoW', on: true },
              { label: 'Partner payout ready for approval', on: true },
              { label: 'New UTM source appears', on: false },
              { label: 'Weekly digest to Slack + email', on: true },
            ].map((a) => (
              <div key={a.label} className="flex items-center justify-between gap-3">
                <span className="text-[12.5px]">{a.label}</span>
                <Toggle initial={a.on} />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* team */}
      <Card className="rise" style={{ animationDelay: '140ms' }}>
        <CardHeader title={<span className="flex items-center gap-1.5"><Users2 size={14} style={{ color: 'var(--accent)' }} /> Team &amp; roles</span>} sub="admin > meta-partner > partner > tenant" right={<Button variant="outline"><Plus size={13} /> Invite</Button>} />
        <CardBody className="px-0">
          <div className="divide-y divide-border">
            {TEAM.map((m) => (
              <div key={m.email} className="flex items-center gap-3 px-4 py-2.5">
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold" style={{ background: `${m.color}24`, color: m.color }}>{m.name.split(' ').map((s) => s[0]).join('')}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{m.name}</div><div className="truncate text-[11px] text-muted-foreground">{m.email}</div></div>
                <Badge tone="accent">{m.role}</Badge>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Toggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button onClick={() => setOn((v) => !v)} className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors" style={{ background: on ? 'var(--accent)' : 'hsl(var(--muted))' }}>
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: on ? '18px' : '2px' }} />
    </button>
  );
}
