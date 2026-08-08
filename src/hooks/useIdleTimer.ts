import { useEffect, useRef } from 'react';

/**
 * Anything that counts as "someone is still here" but leaves no trace on the
 * touchscreen — a voice order is the whole reason it exists. Talking for two
 * minutes without touching the glass used to reset the kiosk mid-sentence and
 * empty the basket.
 */
export const ACTIVITY_EVENT = 'fk:activity';

export const reportActivity = (): void => {
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
};

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
    const events = ['pointerdown', 'touchstart', 'keydown', ACTIVITY_EVENT] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeout, enabled]);
}
