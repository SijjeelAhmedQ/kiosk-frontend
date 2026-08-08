/**
 * The voice session as React sees it: a status, a transcript, and two buttons'
 * worth of control.
 *
 * The session object itself lives in a ref and outlives renders — it holds a
 * socket and a microphone, and rebuilding it whenever a parent re-rendered
 * would drop the customer mid-sentence. What *does* get refreshed on every
 * render is the tool list, because those executors close over component state
 * and a stale closure would add items to a cart that no longer exists.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeVoiceSession } from './realtimeClient';
import type { VoiceAction, VoiceSessionConfig, VoiceStatus, VoiceTurn } from './types';

export interface VoiceSession {
  status: VoiceStatus;
  /** True from the moment the mic is asked for until the session is stopped. */
  active: boolean;
  turns: VoiceTurn[];
  actions: VoiceAction[];
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  /** Have the voice mention something the customer did not ask about. */
  say: (context: string) => void;
  /** Wipe the on-screen transcript without ending the session. */
  clear: () => void;
}

export function useVoiceSession(config: VoiceSessionConfig): VoiceSession {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [actions, setActions] = useState<VoiceAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const session = useRef<RealtimeVoiceSession | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Fresh executors for a live session, without touching the socket.
  useEffect(() => {
    session.current?.setTools(config.tools);
  }, [config.tools]);

  const start = useCallback(() => {
    if (session.current) return;
    setError(null);
    setTurns([]);
    setActions([]);

    const live = new RealtimeVoiceSession(configRef.current, {
      onStatus: (next) => {
        setStatus(next);
        // A session that has failed has already torn itself down. Letting go of
        // it here is what makes the mic button work on the second press —
        // otherwise `start` finds a dead object in the ref and returns.
        if (next === 'error' || next === 'idle') session.current = null;
      },
      onError: setError,

      onTurn: (turn) =>
        setTurns((prev) => {
          // Streaming deltas arrive as repeated updates to the same id, so a
          // turn is replaced in place rather than appended.
          const index = prev.findIndex((t) => t.id === turn.id);
          if (index === -1) return [...prev, turn];
          const next = [...prev];
          next[index] = turn;
          return next;
        }),

      onAction: (action) =>
        setActions((prev) => {
          const index = prev.findIndex((a) => a.callId === action.callId);
          if (index === -1) return [...prev, action];
          const next = [...prev];
          next[index] = action;
          return next;
        }),
    });

    session.current = live;
    void live.start();
  }, []);

  const stop = useCallback(() => {
    const live = session.current;
    session.current = null;
    void live?.stop();
    setStatus('idle');
  }, []);

  const toggle = useCallback(() => {
    if (session.current) stop();
    else start();
  }, [start, stop]);

  const say = useCallback((context: string) => {
    session.current?.say(context);
  }, []);

  const clear = useCallback(() => {
    setTurns([]);
    setActions([]);
  }, []);

  // Releasing the microphone on unmount is not optional: the browser leaves the
  // recording indicator on, and the next session cannot open the device.
  useEffect(() => () => void session.current?.stop(), []);

  return {
    status,
    active: status !== 'idle' && status !== 'error',
    turns,
    actions,
    error,
    start,
    stop,
    toggle,
    say,
    clear,
  };
}

/**
 * Whether the backend can do voice at all.
 *
 * Asked once, before anything is rendered, so a kiosk with no key shows a
 * disabled mic carrying the reason instead of one that fails on first press.
 */
export function useVoiceAvailability(healthUrl: string): {
  ready: boolean;
  checking: boolean;
  reason: string | null;
} {
  const [state, setState] = useState({
    ready: false,
    checking: true,
    reason: null as string | null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(healthUrl)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        const data = payload?.data ?? {};
        setState({
          ready: !!data.enabled,
          checking: false,
          reason: data.reason ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          ready: false,
          checking: false,
          reason: 'The backend is not answering, so voice is unavailable.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [healthUrl]);

  return state;
}
