import { useMemo } from 'react';
import { Card, CardHeader, CardBody, Badge } from '../ui/primitives';
import { useDashboard } from '../state/dashboard';
import { getNode, ROLE_ROOT, rollup } from '../data/orgMock';
import { creditByModel, modelMatrix, biggestSwing, MODEL_DESC } from '../data/attributionMock';
import { ATTRIBUTION_MODELS, fmt } from '../data/funnelMock';

export function Attribution() {
  const { role, drillIds, model } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId) ?? getNode(ROLE_ROOT.tenant)!;
  const total = scope.kind === 'tenant' ? Math.round(420 * (scope.scale ?? 1)) : rollup(scope).converted;

  const credit = useMemo(() => creditByModel(model, total), [model, total]);
  const matrix = useMemo(() => modelMatrix(), []);
  const swing = useMemo(() => biggestSwing('last', model), [model]);
  const maxCredit = Math.max(...credit.map((c) => c.credit), 1);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="rise flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
        <p className="text-[13px] text-muted-foreground"><b className="text-foreground">{fmt(total)} conversions</b> stay fixed — the model only changes <b className="text-foreground">who gets the credit</b>. Currently: <Badge tone="accent">{ATTRIBUTION_MODELS.find((m) => m.key === model)?.label}</Badge></p>
        {swing && swing.delta !== 0 && (
          <p className="text-[12px] text-muted-foreground">vs. last-touch: <b style={{ color: 'var(--accent)' }}>{swing.name} {swing.delta > 0 ? '+' : ''}{swing.delta}%</b></p>
        )}
      </div>
      <p className="rise -mt-2 px-1 text-[12px] text-muted-foreground">{MODEL_DESC[model]}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* credit by channel */}
        <Card className="rise lg:col-span-2" accentTop style={{ animationDelay: '60ms' }}>
          <CardHeader title="Credit by channel" sub={`Under ${ATTRIBUTION_MODELS.find((m) => m.key === model)?.label}`} />
          <CardBody className="space-y-2.5">
            {credit.map((c) => (
              <div key={c.platform} className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-[12px] text-muted-foreground">{c.name}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                  <div className="flex h-full items-center justify-end rounded-md px-2" style={{ width: `${(c.credit / maxCredit) * 100}%`, background: c.color }}>
                    <span className="tnum text-[11px] font-bold text-white">{fmt(c.credit)}</span>
                  </div>
                </div>
                <span className="tnum w-10 flex-shrink-0 text-right text-[12px] font-medium">{c.pct.toFixed(0)}%</span>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* model comparison matrix */}
        <Card className="rise lg:col-span-3" style={{ animationDelay: '120ms' }}>
          <CardHeader title="Channel × model" sub="Credit % under every model — green = gains credit" />
          <CardBody className="overflow-x-auto px-0">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-1.5 text-left font-medium">Channel</th>
                  {ATTRIBUTION_MODELS.map((mm) => (
                    <th key={mm.key} className={`px-2 py-1.5 text-right font-medium ${mm.key === model ? 'text-foreground' : ''}`}>{mm.label.replace('-touch', '')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.platform} className="border-b border-border/60">
                    <td className="px-4 py-1.5"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: row.color }} />{row.name}</span></td>
                    {ATTRIBUTION_MODELS.map((mm) => {
                      const v = row.byModel[mm.key];
                      const intensity = Math.min(1, v / 50);
                      return (
                        <td key={mm.key} className={`tnum px-2 py-1.5 text-right ${mm.key === model ? 'font-bold' : ''}`} style={{ background: `color-mix(in srgb, ${row.color} ${Math.round(intensity * 26)}%, transparent)` }}>
                          {v.toFixed(0)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
