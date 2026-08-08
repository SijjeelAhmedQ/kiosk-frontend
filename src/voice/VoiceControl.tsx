/**
 * The microphone, and everything the customer sees of it.
 *
 * Voice at a kiosk fails in a specific way: the customer speaks, nothing
 * visible happens, and they cannot tell whether they were heard, whether the
 * thing is thinking, or whether it is broken. So the button always says which
 * of those it is, and the panel shows the words as they are recognised — the
 * transcript is not a debug view, it is the receipt for what the kiosk thinks
 * it was told.
 */

import { useEffect, useRef } from 'react';
import { reportActivity } from '@/hooks/useIdleTimer';
import { useVoiceSession, useVoiceAvailability } from './useVoiceSession';
import { useKioskVoiceTools, KIOSK_VOICE_INSTRUCTIONS } from './kioskTools';
import { VOICE_HEALTH_URL, VOICE_SOCKET_URL } from './endpoints';
import type { VoiceStatus } from './types';
import { cn } from '@/utils/cn';

/** What the button says it is doing, in the customer's words. */
const LABEL: Record<VoiceStatus, string> = {
  idle: 'Order by voice',
  connecting: 'Starting…',
  listening: 'Listening',
  hearing: 'Listening',
  thinking: 'One moment…',
  speaking: 'Speaking',
  error: 'Voice unavailable',
};

export function VoiceControl() {
  const tools = useKioskVoiceTools();
  const { ready, checking, reason } = useVoiceAvailability(VOICE_HEALTH_URL);

  const voice = useVoiceSession({
    url: VOICE_SOCKET_URL,
    instructions: KIOSK_VOICE_INSTRUCTIONS,
    tools,
    greeting: 'Hi! What can I get you today?',
  });

  const scroller = useRef<HTMLDivElement>(null);

  // A customer who is talking is not idle. Without this the kiosk resets to the
  // splash screen and bins the basket ninety seconds into a conversation,
  // because nothing has touched the glass.
  useEffect(() => {
    if (voice.active) reportActivity();
  }, [voice.active, voice.status, voice.turns.length]);

  // Follow the conversation down. A customer reading a transcript that has
  // stopped scrolling assumes the kiosk has stopped listening.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [voice.turns]);

  // Nothing is configured and nothing can be: don't offer a button that only
  // ever apologises.
  if (checking || (!ready && !voice.active)) {
    return reason && !checking ? (
      <div
        data-testid="voice-unavailable"
        className="pointer-events-none fixed bottom-6 left-6 z-40 max-w-xs rounded-2xl bg-mist px-5 py-3 text-kiosk-xs text-ash opacity-70"
      >
        {reason}
      </div>
    ) : null;
  }

  const listening = voice.status === 'listening' || voice.status === 'hearing';
  const busy = voice.status === 'thinking' || voice.status === 'connecting';

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-4">
      {voice.active && (
        <div
          data-testid="voice-panel"
          className="w-[420px] overflow-hidden rounded-xl3 bg-paper shadow-lift animate-slide-up"
        >
          <div className="flex items-center justify-between border-b border-mist px-6 py-4">
            <span className="flex items-center gap-3 font-display text-kiosk-sm font-bold text-ink">
              <StatusDot status={voice.status} />
              {LABEL[voice.status]}
            </span>
            {voice.turns.length > 0 && (
              <button
                onClick={voice.clear}
                className="press rounded-full px-4 py-1.5 text-kiosk-xs font-bold text-ash hover:bg-mist"
              >
                Clear
              </button>
            )}
          </div>

          <div ref={scroller} className="no-scrollbar max-h-[340px] space-y-3 overflow-y-auto px-6 py-5">
            {voice.turns.length === 0 && !voice.error && (
              <p className="text-kiosk-sm text-ash">
                Try “a cheeseburger and a large fries”, or ask what's on the menu.
              </p>
            )}

            {voice.turns.map((turn) => (
              <div
                key={turn.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-5 py-3 text-kiosk-sm animate-fade-in',
                  turn.role === 'user'
                    ? 'ml-auto bg-ink text-white'
                    : 'bg-cream text-charcoal',
                )}
              >
                {turn.text}
              </div>
            ))}

            {/* What it did, not just what it said — the customer can see the
                basket move, but this names the step when the screen is busy. */}
            {voice.actions.slice(-3).map((action) => (
              <div
                key={action.callId}
                className="flex items-center gap-2 text-kiosk-xs font-bold text-ash"
              >
                <span aria-hidden>{action.ok === null ? '⋯' : action.ok ? '✓' : '✕'}</span>
                {action.name.replace(/_/g, ' ')}
                {action.detail && <span className="truncate font-normal">— {action.detail}</span>}
              </div>
            ))}

            {voice.error && (
              <p className="rounded-2xl bg-flame-soft px-5 py-3 text-kiosk-sm font-bold text-flame">
                {voice.error}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        data-testid="voice-toggle"
        onClick={voice.toggle}
        aria-label={voice.active ? 'Stop voice ordering' : 'Order by voice'}
        className={cn(
          'press relative flex h-[76px] items-center gap-4 rounded-full pl-6 pr-8 font-display text-kiosk-base font-bold shadow-lift',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/25',
          voice.active ? 'bg-ink text-white' : 'bg-amber text-ink shadow-brand',
        )}
      >
        {/* The pulse only runs while the microphone is genuinely open, so it
            means "you can talk now" rather than "this button is decorative". */}
        {listening && (
          <span className="pointer-events-none absolute left-6 h-11 w-11 rounded-full bg-white/40 animate-ring-pulse" />
        )}
        <span className={cn('relative text-[1.6rem] leading-none', busy && 'animate-dot-blink')}>
          {voice.status === 'speaking' ? '🔊' : '🎤'}
        </span>
        {LABEL[voice.status]}
      </button>
    </div>
  );
}

function StatusDot({ status }: { status: VoiceStatus }) {
  const tone =
    status === 'error'
      ? 'bg-flame'
      : status === 'hearing' || status === 'listening'
        ? 'bg-leaf'
        : status === 'speaking'
          ? 'bg-amber'
          : 'bg-ash';
  return (
    <span
      className={cn('h-2.5 w-2.5 rounded-full', tone, status !== 'idle' && 'animate-dot-blink')}
      aria-hidden
    />
  );
}
