import { Fragment, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/common/LoadingScreen';

/**
 * The back office's lists, as cards rather than table rows.
 *
 * Same anatomy as the kiosk's OrderRow, so the staff screens and the admin read
 * as one product: a tile that says what kind of thing this is, a name with its
 * badges, quiet context underneath, and the number that matters on the right.
 *
 * A card carries what a table row carried, but it can wrap and stack, which a
 * <td> cannot — so nothing is truncated into uselessness on a narrow window,
 * and the row no longer needs seven columns to say six things.
 *
 * The ledger on the coupon detail page is still a real table: those rows are
 * homogeneous money movements read in sequence, which is what tables are for.
 */

interface ListViewProps<T> {
  rows: T[];
  rowKey: (row: T) => string | number;
  renderRow: (row: T) => ReactNode;
  loading?: boolean;
  /** Shown instead of the rows when there are none. */
  empty?: ReactNode;
}

export function ListView<T>({ rows, rowKey, renderRow, loading, empty }: ListViewProps<T>) {
  // The spinner and the empty state stand in for the list, so they take up the
  // room it would — otherwise the page jumps on reload.
  const surface = 'rounded-xl3 bg-paper shadow-soft';

  if (loading && rows.length === 0) {
    return (
      <div className={cn('flex min-h-[280px] items-center justify-center', surface)}>
        <Spinner size={44} />
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className={surface}>{empty}</div>;
  }

  return (
    <div className={cn('flex flex-col gap-3', loading && 'opacity-50 transition-opacity')}>
      {rows.map((row) => (
        <Fragment key={rowKey(row)}>{renderRow(row)}</Fragment>
      ))}
    </div>
  );
}

interface ListRowProps {
  /** The square on the left — one glyph that says what kind of thing this is. */
  lead?: ReactNode;
  /** A tailwind bg class for the state rail down the left edge. */
  accent?: string;
  /** First line: the name or code, and its badges. */
  title: ReactNode;
  /** Second line, quieter — whose campaign, what it is for. */
  subtitle?: ReactNode;
  /** Third line, quieter still — times, terminals, counts. */
  meta?: ReactNode;
  /** The figure on the right. Money, balances, progress. */
  trailing?: ReactNode;
  /** Buttons. They sit above the card's own click target, so they win the click. */
  actions?: ReactNode;
  onOpen?: () => void;
  /** Names the card for screen readers — its text is decoration to that button. */
  openLabel?: string;
}

export function ListRow({
  lead,
  accent,
  title,
  subtitle,
  meta,
  trailing,
  actions,
  onOpen,
  openLabel,
}: ListRowProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-wrap items-center gap-x-5 gap-y-4 overflow-hidden',
        'rounded-xl3 bg-paper px-5 py-4 shadow-soft',
        'transition-shadow duration-200 ease-smooth',
        onOpen && 'hover:shadow-card',
      )}
    >
      {/* A rail rather than a fourth badge: state reads straight down the list
          without competing with anything on the card. */}
      {accent && <span className={cn('absolute inset-y-0 left-0 w-1.5', accent)} />}

      {/* A stretched button, not a click handler on the card: it keeps the row
          keyboard-reachable and the markup valid, which a <button> wrapping the
          copy button would not be. Everything else sits above it and, being
          pointer-events-none, lets its clicks fall through to here. */}
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className={cn(
            'absolute inset-0 rounded-xl3',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
            'focus-visible:outline-ink/30',
          )}
        />
      )}

      {lead && <div className="pointer-events-none relative shrink-0">{lead}</div>}

      {/* [&_button]: any control dropped into the text — a copy button, say —
          takes its own clicks back, so callers do not have to remember to. */}
      <div className="pointer-events-none relative min-w-[15rem] flex-1 [&_button]:pointer-events-auto">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">{title}</div>
        {subtitle && <p className="mt-1.5 truncate text-sm text-charcoal">{subtitle}</p>}
        {meta && <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ash">{meta}</p>}
      </div>

      {trailing && (
        <div className="pointer-events-none relative shrink-0 text-right leading-none">{trailing}</div>
      )}

      {actions && <div className="relative flex shrink-0 flex-wrap gap-2">{actions}</div>}

      {onOpen && (
        <span className="pointer-events-none relative shrink-0 text-lg text-ash transition-transform duration-200 group-hover:translate-x-1">
          ›
        </span>
      )}
    </div>
  );
}

/** The glyph tile every card leads with. Tinted when the state is worth a colour. */
export function RowTile({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-2xl text-2xl leading-none',
        tone ?? 'bg-cream',
      )}
    >
      {children}
    </span>
  );
}
