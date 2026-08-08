/**
 * The microphone, and everything the customer sees of it.
 *
 * Voice at a kiosk fails in a specific way: the customer speaks, nothing
 * visible happens, and they cannot tell whether they were heard, whether the
 * thing is thinking, or whether it is broken. So the control always says which
 * of those it is, and the panel shows the words as they are recognised — the
 * transcript is not a debug view, it is the receipt for what the kiosk thinks
 * it was told.
 *
 * Drawn as a messenger dock on the right edge, following the desktop chat
 * window everybody already knows how to use:
 *
 *   · the window sits flush on the bottom edge with only its top corners
 *     rounded, so it reads as docked to the screen rather than floating over it
 *   · a title bar carries who you are talking to on the left and the window
 *     controls on the right
 *   · the transcript scrolls in the middle, opening with a timestamp
 *   · a composer row sits at the bottom — where a chat app puts its text box,
 *     this puts the microphone
 *
 * The two window controls are not the same thing and are deliberately drawn
 * differently:
 *
 *   minimise (—)  collapses the window and leaves the session running, so a
 *                 customer can watch the basket fill while still talking. The
 *                 launcher keeps its status ring, which is what stops a
 *                 minimised dock from reading as a closed one.
 *   close (✕)     ends the session. A hot microphone behind a window someone
 *                 believes they shut is the one state this must never reach.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { reportActivity } from '@/hooks/useIdleTimer';
import { useVoiceSession, useVoiceAvailability } from './useVoiceSession';
import { useKioskVoiceTools, KIOSK_VOICE_INSTRUCTIONS } from './kioskTools';
import { VOICE_HEALTH_URL, VOICE_SOCKET_URL } from './endpoints';
import type { VoiceStatus } from './types';
import { APP } from '@/constants/app.constants';
import { cn } from '@/utils/cn';

/**
 * What the launcher is doing, in the customer's words. The button is a bare
 * icon, so this is never drawn — it is the accessible name, and the only place
 * the state is available to anyone who cannot read the ring.
 */
const LABEL: Record<VoiceStatus, string> = {
  idle: 'Order by voice',
  connecting: 'Starting…',
  listening: 'Listening',
  hearing: 'Listening',
  thinking: 'One moment…',
  speaking: 'Speaking',
  error: 'Voice unavailable',
};

/**
 * The same state as the subtitle under the name in the title bar.
 *
 * Not LABEL: that names the button ("Order by voice"), which under a title bar
 * already naming who you are talking to is a line that tells you nothing.
 */
const STATUS_TEXT: Record<VoiceStatus, string> = {
  idle: 'Not listening',
  connecting: 'Connecting…',
  listening: 'Listening — go ahead',
  hearing: 'Listening — go ahead',
  thinking: 'Thinking…',
  speaking: 'Speaking',
  error: 'Unavailable',
};

/** What the composer's pill says, where a chat app would show a text cursor. */
const COMPOSER_HINT: Record<VoiceStatus, string> = {
  idle: 'Tap the mic and say what you want',
  connecting: 'Opening the microphone…',
  listening: 'Listening — go ahead',
  hearing: 'Go on, I’m listening…',
  thinking: 'Working on that…',
  speaking: 'Speaking — tap the mic to cut in',
  error: 'Voice stopped. Tap the mic to try again',
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

  /** Window open, as distinct from session running — see the file comment. */
  const [open, setOpen] = useState(false);
  /** Stamped once per session, for the separator the transcript opens with. */
  const [openedAt, setOpenedAt] = useState<Date | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // A customer who is talking is not idle. Without this the kiosk resets to the
  // splash screen and bins the basket ninety seconds into a conversation,
  // because nothing has touched the glass.
  useEffect(() => {
    if (voice.active) reportActivity();
  }, [voice.active, voice.status, voice.turns.length]);

  // Follow the conversation down. A customer reading a transcript that has
  // stopped scrolling assumes the kiosk has stopped listening. `open` is a
  // dependency because the scroller does not exist while the dock is collapsed,
  // so the position has to be restored when it comes back.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [voice.turns, voice.actions, open]);

  // Something went wrong while minimised: a launcher that has quietly gone red
  // is not an explanation, so the window comes back to carry the message.
  useEffect(() => {
    if (voice.error) setOpen(true);
  }, [voice.error]);

  // Nothing is configured and nothing can be: don't offer a button that only
  // ever apologises.
  if (checking || (!ready && !voice.active)) {
    return reason && !checking ? (
      <div
        data-testid="voice-unavailable"
        className="pointer-events-none fixed bottom-6 right-6 z-40 max-w-xs rounded-2xl bg-mist px-5 py-3 text-kiosk-xs text-ash opacity-70"
      >
        {reason}
      </div>
    ) : null;
  }

  const listening = voice.status === 'listening' || voice.status === 'hearing';
  const busy = voice.status === 'thinking' || voice.status === 'connecting';

  /* Opening starts the session in the same tap. Two taps to say one sentence is
     one tap too many at a kiosk, and an open window with a dead mic is exactly
     the "am I being heard?" ambiguity this whole component exists to remove. */
  const openDock = () => {
    setOpen(true);
    if (!voice.active) {
      setOpenedAt(new Date());
      voice.start();
    }
  };

  const toggleMic = () => {
    if (!voice.active) setOpenedAt(new Date());
    voice.toggle();
  };

  const closeDock = () => {
    voice.stop();
    setOpen(false);
  };

  if (!open) {
    /* The launcher: the head on its own, on the right edge. The state it is in
       still has to be legible without a caption, so it is carried by the ring,
       the fill and the icon — and by the accessible name, which is the only
       place the words survive. */
    return (
      <button
        data-testid="voice-toggle"
        onClick={openDock}
        aria-label={LABEL[voice.status]}
        className={cn(
          'press fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/25',
          voice.active ? 'bg-ink text-white shadow-lift' : 'bg-amber text-ink shadow-brand-lg',
        )}
      >
        {/* Only while the microphone is genuinely open, so it means "you can
            talk now" rather than "this button is decorative" — and it is what
            tells a minimised dock apart from a closed one. */}
        {listening && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-current opacity-30 animate-ring-pulse" />
        )}
        <VoiceIcon
          status={voice.status}
          className={cn('relative h-7 w-7', busy && 'animate-dot-blink')}
        />
      </button>
    );
  }

  return (
    /* bottom-0, not bottom-6: a chat window is docked to the edge of the screen.
       Floating it on a margin is what makes a panel read as a popover instead. */
    <div
      data-testid="voice-panel"
      className="fixed bottom-0 right-6 z-40 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-t-xl3 bg-paper shadow-pop animate-slide-up"
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-mist px-3 py-2.5">
        {/* Where a chat app puts the face of whoever you are talking to. */}
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flame text-[1.05rem] leading-none">
          🔥
          <StatusDot
            status={voice.status}
            className="absolute -bottom-0.5 -right-0.5 ring-2 ring-paper"
          />
        </span>

        <span className="flex min-w-0 flex-col leading-tight">
          <span className="flex items-center gap-1">
            <span className="truncate font-display text-kiosk-sm font-extrabold text-ink">
              {APP.name}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-ash" />
          </span>
          <span className="truncate text-kiosk-xs text-ash">{STATUS_TEXT[voice.status]}</span>
        </span>

        {/* Tinted, not grey — the coloured control cluster is the single most
            recognisable thing about a chat window's title bar. */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {voice.turns.length > 0 && (
            <WindowButton onClick={voice.clear} label="Clear the conversation">
              <ClearIcon className="h-4 w-4" />
            </WindowButton>
          )}
          <WindowButton onClick={() => setOpen(false)} label="Minimise — keeps listening">
            <span className="block h-[2px] w-3.5 rounded-full bg-current" />
          </WindowButton>
          <WindowButton onClick={closeDock} label="Close and stop listening">
            <CrossIcon className="h-3.5 w-3.5" />
          </WindowButton>
        </div>
      </header>

      {/* Fixed height, not max-height: a window that grows and shrinks by a line
          every time the model streams a word will not hold still long enough to
          read. */}
      <div ref={scroller} className="no-scrollbar h-[330px] overflow-y-auto px-3 py-3">
        {/* The timestamp a chat thread opens with — it dates the conversation,
            and it is the first sign that the session actually started. */}
        {openedAt && (
          <p className="pb-3 text-center text-kiosk-xs text-ash">
            {openedAt.toLocaleString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}

        {voice.turns.length === 0 && !voice.error && (
          <p className="px-1 text-kiosk-sm text-ash">
            Try “a cheeseburger and a large fries”, or ask what's on the menu.
          </p>
        )}

        <div className="space-y-2">
          {voice.turns.map((turn) =>
            turn.role === 'user' ? (
              <p
                key={turn.id}
                className="ml-auto max-w-[80%] w-fit rounded-2xl bg-ink px-3.5 py-2 text-kiosk-sm text-white animate-fade-in"
              >
                {turn.text}
              </p>
            ) : (
              // Avatar beside the bubble, the way an incoming message carries one.
              <div key={turn.id} className="flex items-end gap-1.5 animate-fade-in">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-flame text-[0.7rem] leading-none">
                  🔥
                </span>
                <p className="max-w-[80%] rounded-2xl bg-cream px-3.5 py-2 text-kiosk-sm text-charcoal">
                  {turn.text}
                </p>
              </div>
            ),
          )}

          {/* What it did, not just what it said — the customer can see the
              basket move, but this names the step when the screen is busy. */}
          {voice.actions.slice(-3).map((action) => (
            <div
              key={action.callId}
              className="flex items-center gap-2 pl-8 text-kiosk-xs font-bold text-ash"
            >
              <span aria-hidden>{action.ok === null ? '⋯' : action.ok ? '✓' : '✕'}</span>
              {action.name.replace(/_/g, ' ')}
              {action.detail && <span className="truncate font-normal">— {action.detail}</span>}
            </div>
          ))}

          {voice.error && (
            <p className="rounded-2xl bg-flame-soft px-3.5 py-2 text-kiosk-sm font-bold text-flame">
              {voice.error}
            </p>
          )}
        </div>
      </div>

      {/* The composer row: the pill where the text box goes, and the microphone
          in the primary action's corner. */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-mist px-3 py-2.5">
        <span
          className={cn(
            'flex h-11 min-w-0 flex-1 items-center rounded-full px-4 text-kiosk-xs',
            listening ? 'bg-leaf-soft text-leaf' : 'bg-mist text-ash',
          )}
        >
          <span className="truncate">{COMPOSER_HINT[voice.status]}</span>
        </span>

        <button
          data-testid="voice-toggle"
          onClick={toggleMic}
          aria-label={voice.active ? 'Stop listening' : 'Start listening'}
          title={voice.active ? 'Stop listening' : 'Start listening'}
          className={cn(
            'press relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/25',
            voice.active ? 'bg-ink text-white' : 'bg-amber text-ink shadow-brand',
          )}
        >
          {listening && (
            <span className="pointer-events-none absolute inset-0 rounded-full bg-current opacity-30 animate-ring-pulse" />
          )}
          <VoiceIcon
            status={voice.status}
            className={cn('relative h-5 w-5', busy && 'animate-dot-blink')}
          />
        </button>
      </footer>
    </div>
  );
}

/** A title-bar control: round, tinted, and the same size as its neighbours. */
function WindowButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="press flex h-8 w-8 items-center justify-center rounded-full text-flame transition-colors hover:bg-flame-soft"
    >
      {children}
    </button>
  );
}

/**
 * The one glyph that carries the whole launcher now that the caption is gone.
 *
 * Two icons, not one: while the kiosk is talking the microphone is the wrong
 * picture — headphones say "your turn to listen", which is also the moment a
 * customer is most likely to start talking over it.
 */
function VoiceIcon({ status, className }: { status: VoiceStatus; className?: string }) {
  return status === 'speaking' ? (
    <HeadphonesIcon className={className} />
  ) : (
    <MicIcon className={className} />
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <path
        d="M2.5 16.5A2.5 2.5 0 0 1 5 14h1v6H5a2.5 2.5 0 0 1-2.5-2.5v-1ZM21.5 16.5A2.5 2.5 0 0 0 19 14h-1v6h1a2.5 2.5 0 0 0 2.5-2.5v-1Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function StatusDot({ status, className }: { status: VoiceStatus; className?: string }) {
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
      className={cn('h-3 w-3 rounded-full', tone, status !== 'idle' && 'animate-dot-blink', className)}
      aria-hidden
    />
  );
}
