import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

/** Page-level furniture shared by every admin screen. */

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** The section this page belongs to — the same grouping the sidebar uses. */
  eyebrow?: string;
  /** The glyph the sidebar names this screen with, repeated as a tile. */
  icon?: ReactNode;
  /** Renders a back chevron that navigates here. */
  backTo?: string;
  /** Buttons, right-aligned. */
  actions?: ReactNode;
}

/**
 * The icon and eyebrow are not decoration: the six lists are near-identical in
 * shape, and a glance at the top of one is how you tell which you are on after
 * clicking through from somewhere else. They repeat the sidebar's own glyph and
 * group so the two agree.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  backTo,
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-5 pb-6">
      <div className="flex min-w-0 items-start gap-4">
        {backTo && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label="Back"
            className="press mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-base text-charcoal shadow-soft ring-1 ring-ink/[0.04] transition-colors hover:bg-mist"
          >
            ‹
          </button>
        )}

        {icon && (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper text-2xl leading-none shadow-soft ring-1 ring-ink/[0.04]"
          >
            {icon}
          </span>
        )}

        <div className="min-w-0">
          {eyebrow && (
            <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ash">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              'font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-ink',
              eyebrow && 'mt-1',
            )}
          >
            {title}
          </h1>
          {/* Capped rather than free-running: a subtitle that crosses the whole
              1200px column is a paragraph nobody reads twice. */}
          {subtitle && (
            <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-ash">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/**
 * The card the search box and filters sit in.
 *
 * Every list screen had grown its own copy of this stack; sharing it is what
 * keeps the six of them looking like one back office rather than six.
 */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-5 flex flex-col gap-4 rounded-xl3 bg-paper p-5 shadow-soft ring-1 ring-ink/[0.04]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A row of figures above the list. Two to four; more than that reads as noise. */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-5 grid gap-3', className)}>{children}</div>;
}

interface EmptyPanelProps {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

/**
 * The kiosk's EmptyState at desk scale.
 *
 * The customer-facing one is sized for a 32" panel read from a metre away; the
 * same type inside an admin card shouts. Same anatomy, quieter voice.
 */
export function EmptyPanel({ icon = '🗒️', title, message, action }: EmptyPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-20 text-center animate-fade-in">
      <span
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cream text-[2.5rem] leading-none"
      >
        {icon}
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
        {message && <p className="max-w-sm text-sm leading-relaxed text-ash">{message}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface AlertBannerProps {
  message: string | null;
  tone?: 'error' | 'success' | 'info';
  onDismiss?: () => void;
}

const tones = {
  error: { className: 'bg-flame-soft text-flame', icon: '⚠️' },
  success: { className: 'bg-leaf-soft text-leaf', icon: '✓' },
  info: { className: 'bg-amber-soft text-amber-dark', icon: 'ℹ' },
} as const;

export function AlertBanner({ message, tone = 'error', onDismiss }: AlertBannerProps) {
  if (!message) return null;
  const style = tones[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-5 flex items-center gap-3 rounded-2xl px-5 py-3.5 font-display text-sm font-bold animate-fade-in',
        style.className,
      )}
    >
      <span className="text-base leading-none">{style.icon}</span>
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="press shrink-0 rounded-full px-2 text-base opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * The padded column every admin page lives in.
 *
 * `fill` pins it to the viewport instead of letting it grow: the page itself
 * then never scrolls, and one child inside it is expected to claim the leftover
 * height and scroll on its own. Everything else has to be marked `shrink-0`, or
 * flex will squeeze the header to make room.
 */
export function PageBody({ children, fill }: { children: ReactNode; fill?: boolean }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1200px] px-8 py-7',
        fill && 'flex h-full min-h-0 flex-col overflow-hidden',
      )}
    >
      {children}
    </div>
  );
}
