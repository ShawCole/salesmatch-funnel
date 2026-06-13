import { Menu, Moon, Sun, Bell } from 'lucide-react';
import { Segmented } from '../ui/primitives';
import { useTheme } from '../ui/theme';
import { useDashboard } from '../state/dashboard';
import { ROLE_LABEL, type Role, pathTo, getNode, ROLE_ROOT } from '../data/orgMock';
import { VIEW_TITLE, VIEW_SUBTITLE, type ViewKey } from './nav';

const ROLES: Role[] = ['admin', 'meta_partner', 'partner', 'tenant'];

export function TopBar({ view, onOpenMobileNav }: { view: ViewKey; onOpenMobileNav: () => void }) {
  const { theme, toggle } = useTheme();
  const { role, setRole, drillIds, setDrillIds } = useDashboard();

  // breadcrumb from persona root → current drill node
  const currentId = drillIds.length ? drillIds[drillIds.length - 1] : ROLE_ROOT[role];
  const node = getNode(currentId);
  const full = node ? pathTo(node.id) : [];
  const rootIdx = full.findIndex((n) => n.id === ROLE_ROOT[role]);
  const crumbs = rootIdx >= 0 ? full.slice(rootIdx) : node ? [node] : [];

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-elevated px-3 sm:px-4">
      <button onClick={onOpenMobileNav} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"><Menu size={18} /></button>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{VIEW_TITLE[view]}</h1>
        </div>
        {/* breadcrumb (drill) on wide screens */}
        {crumbs.length > 1 ? (
          <div className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            {crumbs.map((cr, i) => (
              <span key={cr.id} className="flex items-center gap-1">
                {i > 0 && <span>›</span>}
                <button onClick={() => setDrillIds(crumbs.slice(1, i + 1).map((x) => x.id))} className={i === crumbs.length - 1 ? 'font-medium text-foreground' : 'hover:text-foreground'}>{cr.name}</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{VIEW_SUBTITLE[view]}</p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Viewing as</span>
          <Segmented<Role>
            size="sm"
            value={role}
            onChange={(r) => { setRole(r); setDrillIds([]); }}
            options={ROLES.map((r) => ({ key: r, label: ROLE_LABEL[r] }))}
          />
        </div>
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Notifications">
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        </button>
        <button onClick={toggle} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
