import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

/* ---------------- Card ---------------- */
export function Card({ className, children, accentTop, ...rest }: { className?: string; children: ReactNode; accentTop?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative rounded-[var(--radius)] border border-border bg-card text-card-foreground',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className,
      )}
      {...rest}
    >
      {accentTop && <span className="absolute inset-x-0 top-0 h-px rounded-t-[var(--radius)]" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />}
      {children}
    </div>
  );
}
export function CardHeader({ title, sub, right, className }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-3.5 pb-2', className)}>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-4 pb-4', className)}>{children}</div>;
}

/* ---------------- Button ---------------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' | 'outline'; active?: boolean };
export function Button({ variant = 'ghost', active, className, children, ...rest }: BtnProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors',
        variant === 'outline' && 'border border-border hover:bg-muted',
        variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        active && 'bg-muted text-foreground',
        className,
      )}
      style={variant === 'solid' ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: { options: { key: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('inline-flex gap-0.5 rounded-lg border border-border bg-muted/40 p-[3px]')}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              'whitespace-nowrap rounded-md font-semibold transition-all',
              size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-[12px]',
              on ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            style={on ? { color: 'var(--accent)' } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Select (native, styled) ---------------- */
export function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[]; label?: string }) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12px]">
      {label && <span className="text-muted-foreground">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer bg-transparent pr-1 font-medium text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} className="bg-card text-foreground">{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'accent' | 'success' | 'danger'; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', tone === 'muted' && 'bg-muted text-muted-foreground', className)}
      style={
        tone === 'accent' ? { background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }
          : tone === 'success' ? { background: 'hsl(var(--success) / 0.16)', color: 'hsl(var(--success))' }
          : tone === 'danger' ? { background: 'hsl(var(--destructive) / 0.16)', color: 'hsl(var(--destructive))' }
          : undefined
      }
    >
      {children}
    </span>
  );
}

/* ---------------- Delta pill (vs prior period) ---------------- */
export function Delta({ pct, invert = false }: { pct: number; invert?: boolean }) {
  const good = invert ? pct < 0 : pct >= 0;
  const sign = pct > 0 ? '+' : '';
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tnum"
      style={{ background: good ? 'hsl(var(--success) / 0.14)' : 'hsl(var(--destructive) / 0.14)', color: good ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
    >
      <span aria-hidden>{good ? '▲' : '▼'}</span>{sign}{pct}%
    </span>
  );
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-muted/70', className)}>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" style={{ animation: 'shimmer 1.6s infinite' }} />
    </div>
  );
}

/* ---------------- States ---------------- */
export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">{icon ?? '∅'}</div>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-[12px] text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
