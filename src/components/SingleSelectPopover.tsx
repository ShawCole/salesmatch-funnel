import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface SingleSelectPopoverProps {
  label: string;
  options: string[];
  labelMap?: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
}

export function SingleSelectPopover({
  label,
  options,
  labelMap,
  value,
  onChange,
}: SingleSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const displayValue = labelMap?.[value] ?? value;

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 256;
    const gap = 4;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) left = rect.right - popoverWidth;
    if (left < 8) left = 8;
    setPos({ top: rect.bottom + gap, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 glass-light rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer hover:bg-white/10 text-purple-300 border border-purple-400/30"
      >
        {label}: {displayValue}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-64 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="max-h-60 overflow-y-auto p-1">
            {options.map(option => {
              const display = labelMap?.[option] ?? option;
              const isSelected = option === value;
              return (
                <button
                  key={option}
                  onClick={() => { onChange(option); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors hover:bg-white/5 ${
                    isSelected ? 'text-purple-300' : 'text-gray-300'
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {isSelected ? (
                      <span className="w-4 h-4 rounded border border-purple-400 bg-purple-600/40 flex items-center justify-center">
                        <Check size={10} className="text-purple-200" />
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded border border-gray-600" />
                    )}
                  </span>
                  <span>{display}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
