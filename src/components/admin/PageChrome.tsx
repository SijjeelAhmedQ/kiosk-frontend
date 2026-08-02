import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

/** Page-level furniture shared by every admin screen. */

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Renders a back chevron that navigates here. */
  backTo?: string;
  /** Buttons, right-aligned. */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div className="flex min-w-0 items-start gap-3">
        {backTo && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label="Back"
            className="press mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-base text-charcoal shadow-soft transition-colors hover:bg-mist"
          >
            ‹
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ash">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
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
 * then never scrolls, and one child inside it — the table — is expected to
 * claim the leftover height and scroll on its own.
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
