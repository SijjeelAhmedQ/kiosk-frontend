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
import { PipelineVoiceSession } from './pipelineClient';
import type {
  VoiceAction,
  VoiceProvider,
  VoiceSessionClient,
  VoiceSessionConfig,
  VoiceSessionHandlers,
  VoiceStatus,
  VoiceTurn,
} from './types';

/**
 * Build the session the backend said it can serve.
 *
 * The two clients present the same four handlers and the same four methods, so
 * this is the only line in the app that knows there is more than one — swap the
 * key in the backend's .env and nothing above here changes.
 */
function createSession(
  provider: VoiceProvider | undefined,
  config: VoiceSessionConfig,
  handlers: VoiceSessionHandlers,
): VoiceSessionClient {
  return provider === 'openai'
    ? new RealtimeVoiceSession(config, handlers)
    : new PipelineVoiceSession(config, handlers);
}

export interface VoiceSession {
  status: VoiceStatus;
  /** True from the moment the session opens until it is stopped. */
  active: boolean;
  /**
   * Whether the microphone is capturing. Not the same as `active`: a typed
   * session is live and answering with no microphone open at all, and a
   * customer who declined the permission prompt is in exactly that state.
   */
  micActive: boolean;
  turns: VoiceTurn[];
  actions: VoiceAction[];
  error: string | null;
  start: (options?: { microphone?: boolean }) => void;
  stop: () => void;
  /** Start with the mic, or stop — what the mic button does. */
  toggle: () => void;
  /** Send a typed order, starting a session first if there is not one. */
  sendText: (text: string) => void;
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
  const [micActive, setMicActive] = useState(false);

  const session = useRef<VoiceSessionClient | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Fresh executors for a live session, without touching the socket.
  useEffect(() => {
    session.current?.setTools(config.tools);
  }, [config.tools]);

  /**
   * The live session, opening one if there is not already one.
   *
   * Returns it rather than just starting it, so a typed order can go out in the
   * same tick the session is created — the alternative is waiting a render for
   * the ref to fill, which loses the first thing the customer wrote.
   */
  const ensure = useCallback(
    (options?: { microphone?: boolean }): VoiceSessionClient => {
      if (session.current) return session.current;
      setError(null);
      setTurns([]);
      setActions([]);

      const live = createSession(configRef.current.provider, configRef.current, {
        onStatus: (next) => {
          setStatus(next);
          // A session that has failed has already torn itself down. Letting go of
          // it here is what makes the mic button work on the second press —
          // otherwise `start` finds a dead object in the ref and returns.
          if (next === 'error' || next === 'idle') session.current = null;
        },
        onError: setError,
        onMicChange: setMicActive,

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
      void live.start(options);
      return live;
    },
    [],
  );

  const start = useCallback(
    (options?: { microphone?: boolean }) => {
      ensure(options);
    },
    [ensure],
  );

  const stop = useCallback(() => {
    const live = session.current;
    session.current = null;
    void live?.stop();
    setStatus('idle');
    setMicActive(false);
  }, []);

  const sendText = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      // Typing opens a session on its own, and opens it *without* the
      // microphone: a permission prompt in answer to someone choosing to type
      // is the one thing guaranteed to make them stop.
      ensure({ microphone: false }).sendText(text);
    },
    [ensure],
  );

  /**
   * What the mic button does, which depends on what is already running.
   *
   * The third case is the one worth naming: a session that has been taking
   * typed orders gets the microphone added to it rather than being torn down
   * and rebuilt. Restarting would drop the conversation — history lives with
   * the socket — so a customer who types "a burger" and then decides to talk
   * would have to start the order again.
   */
  const toggle = useCallback(() => {
    const live = session.current;
    if (!live) start();
    else if (micActive) stop();
    else void live.startMicrophone();
  }, [micActive, start, stop]);

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
    micActive,
    turns,
    actions,
    error,
    start,
    stop,
    toggle,
    sendText,
    say,
    clear,
  };
}

/**
 * Whether the backend can do voice at all, and over which stack.
 *
 * Asked once, before anything is rendered, so a Friends Kitchen terminal with no key shows a
 * disabled mic carrying the reason instead of one that fails on first press.
 *
 * `provider` comes back with it because the two stacks need different sockets
 * and different clients, and only the backend knows which key it is holding.
 * Until the answer arrives the session is not started, so there is no window in
 * which the page could guess wrong.
 */
export function useVoiceAvailability(healthUrl: string): {
  ready: boolean;
  checking: boolean;
  reason: string | null;
  provider: VoiceProvider | undefined;
} {
  const [state, setState] = useState({
    ready: false,
    checking: true,
    reason: null as string | null,
    provider: undefined as VoiceProvider | undefined,
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
          // An older backend answers without this field. Falling back to the
          // relay keeps that deployment working rather than pointing the page
          // at a route it does not serve.
          provider: data.provider === 'openrouter' ? 'openrouter' : 'openai',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          ready: false,
          checking: false,
          reason: 'The backend is not answering, so voice is unavailable.',
          provider: undefined,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [healthUrl]);

  return state;
}
