import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from './cn';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  sortVal?: (row: T) => number | string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, rows, initialSort, initialDir = 'desc', getKey }: {
  columns: Column<T>[];
  rows: T[];
  initialSort?: string;
  initialDir?: 'asc' | 'desc';
  getKey: (row: T) => string;
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSort);
  const [dir, setDir] = useState<'asc' | 'desc'>(initialDir);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortVal) return rows;
    const arr = [...rows].sort((a, b) => {
      const av = col.sortVal!(a), bv = col.sortVal!(b);
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return dir === 'desc' ? arr.reverse() : arr;
  }, [rows, columns, sortKey, dir]);

  const toggle = (key: string) => {
    if (sortKey === key) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setDir('desc'); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-card">
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => c.sortVal && toggle(c.key)}
                className={cn(
                  'whitespace-nowrap px-3 py-2 font-medium text-muted-foreground',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  c.sortVal && 'cursor-pointer select-none hover:text-foreground',
                )}
              >
                <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                  {c.header}
                  {c.sortVal && (sortKey === c.key
                    ? (dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)
                    : <ArrowUpDown size={11} className="opacity-40" />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={getKey(row)} className="border-b border-border/60 transition-colors hover:bg-muted/40">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2', c.align === 'right' ? 'text-right tnum' : 'text-left', c.className)}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
