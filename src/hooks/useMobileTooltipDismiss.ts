import { useState, useEffect, useRef } from 'react';

const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Hook for mobile tooltip fade. Returns { opacity, style, resetFade }.
 * - opacity starts at 1, fades to 0 after 4.5s on mobile
 * - Calling resetFade() restarts the timer (call on new hover/tap)
 * - On desktop, opacity is always 1
 */
export function useMobileFade() {
  const [fading, setFading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetFade = () => {
    setFading(false);
    clearTimeout(timer.current);
    if (isMobile) {
      timer.current = setTimeout(() => setFading(true), 4500);
    }
  };

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  const style = isMobile
    ? { opacity: fading ? 0 : 1, transition: 'opacity 0.5s ease-out' }
    : {};

  return { fading, style, resetFade, isMobile };
}
