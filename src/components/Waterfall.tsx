// Generic horizontal waterfall / bridge chart.
// Running-total bars taper from `start` through signed `steps` down to `end`.

export interface WaterfallStep {
  label: string;
  delta: number;          // negative = subtract, positive = add
  description?: string;
}

interface WaterfallProps {
  start: { label: string; value: number; tone?: 'warn'; color?: string };
  steps: WaterfallStep[];
  end: { label: string; value: number };
}

interface Row {
  label: string;
  value: number;          // displayed figure (signed for steps)
  running: number;        // running total after this row
  kind: 'start' | 'sub' | 'add' | 'end';
}

const KIND_COLOR: Record<Row['kind'], string> = {
  start: '#6366f1',
  sub: '#fb7185',
  add: '#10b981',
  end: '#a855f7',
};

export function Waterfall({ start, steps, end }: WaterfallProps) {
  const rows: Row[] = [{ label: start.label, value: start.value, running: start.value, kind: 'start' }];
  let running = start.value;
  for (const st of steps) {
    running += st.delta;
    rows.push({ label: st.label, value: st.delta, running, kind: st.delta < 0 ? 'sub' : 'add' });
  }
  rows.push({ label: end.label, value: end.value, running: end.value, kind: 'end' });

  const max = Math.max(start.value, end.value, ...rows.map((r) => r.running), 1);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => {
        const color = r.kind === 'start'
          ? (start.tone === 'warn' ? '#fbbf24' : start.color ?? KIND_COLOR.start)
          : KIND_COLOR[r.kind];
        const widthPct = Math.max(2, (r.running / max) * 100);
        const valueText = r.kind === 'start' || r.kind === 'end'
          ? r.value.toLocaleString()
          : `${r.value > 0 ? '+' : ''}${r.value.toLocaleString()}`;
        const isTotal = r.kind === 'start' || r.kind === 'end';
        return (
          <div key={i} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            {/* label */}
            <div className={`w-full sm:w-[200px] sm:flex-shrink-0 text-[12px] ${isTotal ? 'font-bold text-[#e8e8ec]' : 'font-medium text-[#9aa0ad]'}`}>
              {r.kind === 'start' && start.tone === 'warn' && <span className="mr-1 text-[#fbbf24]">⚠</span>}
              {r.kind === 'sub' && <span className="mr-1 text-[#fb7185]">−</span>}
              {r.kind === 'add' && <span className="mr-1 text-emerald-400">+</span>}
              {r.kind === 'end' && <span className="mr-1 text-[#a855f7]">◆</span>}
              {r.label}
            </div>
            {/* bar */}
            <div className="flex flex-1 items-center gap-2">
              <div className="h-[26px] flex-1 overflow-hidden rounded-[6px] bg-white/[0.03]">
                <div className="h-full rounded-[6px] transition-[width] duration-700"
                  style={{
                    width: `${widthPct}%`,
                    background: isTotal
                      ? `linear-gradient(135deg, ${color}, ${color}cc)`
                      : `${color}40`,
                    boxShadow: isTotal ? 'inset 0 1px 0 rgba(255,255,255,.12)' : undefined,
                    borderRight: isTotal ? 'none' : `2px solid ${color}`,
                  }}
                />
              </div>
              <div className={`w-[68px] flex-shrink-0 text-right text-[13px] font-extrabold tabular-nums ${
                r.kind === 'sub' ? 'text-[#fb7185]' : r.kind === 'add' ? 'text-emerald-400' : 'text-[#e8e8ec]'}`}>
                {valueText}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
