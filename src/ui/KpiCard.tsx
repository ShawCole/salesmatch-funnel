import { Card, Delta } from './primitives';
import { MiniSpark } from './charts';
import { cn } from './cn';

export interface KpiProps {
  label: string;
  value: string;
  deltaPct?: number;
  invertDelta?: boolean;     // for cost-like metrics where down = good
  spark?: number[];
  sparkColor?: string;
  compareLabel?: string;
  className?: string;
}

export function KpiCard({ label, value, deltaPct, invertDelta, spark, sparkColor, compareLabel, className }: KpiProps) {
  return (
    <Card className={cn('flex flex-col justify-between gap-2 p-3.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {deltaPct != null && <Delta pct={deltaPct} invert={invertDelta} />}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="tnum text-[26px] font-semibold leading-none tracking-tight">{value}</div>
          {compareLabel && <div className="mt-1 text-[10.5px] text-muted-foreground">{compareLabel}</div>}
        </div>
        {spark && spark.length > 1 && <MiniSpark data={spark} color={sparkColor} />}
      </div>
    </Card>
  );
}
