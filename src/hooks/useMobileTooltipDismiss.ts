import { useRef, useCallback } from 'react';

const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Returns a ref and onTouchStart handler for a chart container.
 * On touch devices, dispatches a mouseleave event after 3s to dismiss Recharts tooltips.
 */
export function useMobileTooltipDismiss() {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const onTouchStart = useCallback(() => {
    if (!isMobile) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {

      const el = ref.current;
      if (el) {
        el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      }
    }, 5000);
  }, []);

  return { ref, onTouchStart };
}
