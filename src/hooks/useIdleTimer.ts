import { useEffect, useRef } from 'react';

/** Fires onIdle after `timeout` ms of no touch/pointer activity. Kiosk reset. */
export function useIdleTimer(onIdle: () => void, timeout: number, enabled = true): void {
  const cb = useRef(onIdle);
  cb.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => cb.current(), timeout);
    };
    const events = ['pointerdown', 'touchstart', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeout, enabled]);
}
