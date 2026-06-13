import { ChevronLeft, PanelLeft } from 'lucide-react';
import { NAV, type ViewKey } from './nav';
import { cn } from '../ui/cn';
import { useDashboard } from '../state/dashboard';
import { getNode, ROLE_ROOT } from '../data/orgMock';

export function Sidebar({ view, onNavigate, collapsed, onToggle, onCloseMobile, mobile }: {
  view: ViewKey;
  onNavigate: (v: ViewKey) => void;
  collapsed: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
  mobile?: boolean;
}) {
  const { accent, role, drillIds } = useDashboard();
  const scopeId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const scope = getNode(scopeId);
  const c = collapsed && !mobile;

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-elevated transition-[width] duration-200',
        c ? 'w-[68px]' : 'w-[240px]',
      )}
    >
      {/* brand / tenant */}
      <div className={cn('flex h-14 items-center border-b border-border', c ? 'justify-center px-2' : 'justify-between pl-3 pr-2')}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-[13px] font-bold" style={{ background: `${accent}1f`, color: accent }}>
            {(scope?.name ?? 'A').slice(0, 1)}
          </div>
          {!c && (
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-tight">{scope?.name ?? 'ArkData'}</div>
              <div className="truncate text-[10px] text-muted-foreground">Attribution</div>
            </div>
          )}
        </div>
        {!c && !mobile && (
          <button onClick={onToggle} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Collapse">
            <ChevronLeft size={16} />
          </button>
        )}
        {mobile && (
          <button onClick={onCloseMobile} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><ChevronLeft size={18} /></button>
        )}
      </div>

      {/* nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((section, si) => (
          <div key={si} className={si ? 'mt-4' : ''}>
            {section.title && !c && (
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</div>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = item.key === view;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => { onNavigate(item.key); onCloseMobile?.(); }}
                    title={c ? item.label : undefined}
                    className={cn(
                      'group flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors',
                      c ? 'justify-center px-2' : 'gap-2.5 px-2.5',
                      active ? '' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    style={active ? { background: `${accent}16`, color: accent } : undefined}
                  >
                    <Icon size={17} className="flex-shrink-0" style={active ? { color: accent } : undefined} />
                    {!c && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* footer: collapse handle when collapsed + user */}
      <div className="border-t border-border p-2">
        {c && !mobile && (
          <button onClick={onToggle} className="mb-1 flex w-full justify-center rounded-lg py-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Expand">
            <PanelLeft size={17} />
          </button>
        )}
        <div className={cn('flex items-center rounded-lg py-1.5', c ? 'justify-center px-1' : 'gap-2 px-1.5')}>
          <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold" style={{ background: `${accent}24`, color: accent }}>SC</div>
          {!c && (
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium leading-tight">Shaw Cole</div>
              <div className="truncate text-[10px] text-muted-foreground">shaw@arkdata.io</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
