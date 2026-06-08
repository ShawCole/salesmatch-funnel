import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface WidgetShellProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  collapsible?: boolean;
  className?: string;
}

export function WidgetShell({ title, children, onClose, collapsible = true, className = '' }: WidgetShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`glass rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <div className="flex items-center gap-1">
          {collapsible && (
            <button onClick={() => setCollapsed(!collapsed)} className="p-1 text-gray-500 hover:text-white transition-colors">
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}
