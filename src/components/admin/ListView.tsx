import { Fragment, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * The back office's lists, as cards rather than table rows.
 *
 * Same anatomy as Friends Kitchen's OrderRow, so the staff screens and the admin read
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
  /**
   * Take the height the rest of the page left over and scroll the cards inside
   * it, so the page itself never scrolls. Needs an ancestor that constrains the
   * height — <PageBody fill> is the one that does.
   */
  fill?: boolean;
}

export function ListView<T>({ rows, rowKey, renderRow, loading, empty, fill }: ListViewProps<T>) {
  // The placeholders and the empty state stand in for the list, so they take up
  // the room it would — otherwise the page jumps on reload.
  const surface = cn('rounded-xl3 bg-paper shadow-soft ring-1 ring-ink/[0.04]', fill && 'min-h-0 flex-1');

  // A first load draws the shape of the answer rather than a spinner in a void:
  // the eye settles on where the rows will be before they arrive, so the list
  // does not appear to jump when it does.
  if (loading && rows.length === 0) {
    return (
      <div className={cn('flex flex-col gap-3', fill && 'min-h-0 flex-1 overflow-hidden px-1 pb-1')}>
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className={surface}>{empty}</div>;
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        // px-1 pb-1: a card's shadow sits outside its box, and a scroll
        // container would shave it off at the edges.
        fill && 'min-h-0 flex-1 overflow-y-auto px-1 pb-1',
        loading && 'opacity-50 transition-opacity',
      )}
    >
      {rows.map((row) => (
        <Fragment key={rowKey(row)}>{renderRow(row)}</Fragment>
      ))}
    </div>
  );
}

/** The shape of a row, before the row. Same anatomy: tile, three lines, a figure. */
function SkeletonRow() {
  return (
    <div className="flex shrink-0 items-center gap-5 rounded-xl3 bg-paper px-5 py-4 shadow-soft ring-1 ring-ink/[0.04]">
      <span className="skeleton h-14 w-14 shrink-0 rounded-2xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className="skeleton block h-4 w-1/3 rounded-full" />
        <span className="skeleton block h-3 w-2/3 rounded-full" />
        <span className="skeleton block h-3 w-1/4 rounded-full" />
      </div>
      <span className="skeleton hidden h-9 w-28 shrink-0 rounded-full sm:block" />
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
        // shrink-0: inside a scrolling <ListView fill> these are flex children,
        // and flex would otherwise squash them all to fit rather than letting
        // the container scroll.
        'shrink-0 rounded-xl3 bg-paper px-5 py-4 shadow-soft ring-1 ring-ink/[0.04]',
        'transition-all duration-200 ease-smooth',
        // The lift is the whole hover state: on a list of near-identical cards
        // it says which one the cursor is on more quickly than any tint does.
        onOpen && 'hover:-translate-y-0.5 hover:shadow-card hover:ring-ink/[0.08]',
      )}
    >
      {/* A rail rather than a fourth badge: state reads straight down the list
          without competing with anything on the card. Inset and rounded, so it
          reads as part of the card rather than a stripe painted over its edge. */}
      {accent && (
        <span
          className={cn(
            'absolute inset-y-2.5 left-0 w-1.5 rounded-r-full transition-all duration-200 ease-smooth',
            onOpen && 'group-hover:inset-y-1',
            accent,
          )}
        />
      )}

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

      {/* A fixed column, not a shrink-to-fit one: "Deactivate" is wider than
          "Activate", and without this the buttons — and everything left of
          them — step in and out row by row down the list. */}
      {actions && (
        <div className="relative flex w-[17.5rem] shrink-0 flex-wrap justify-end gap-2">
          {actions}
        </div>
      )}

      {/* A chip rather than a bare chevron: it gives the "there is more behind
          this row" affordance somewhere to light up on hover. */}
      {onOpen && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none relative flex h-8 w-8 shrink-0 items-center justify-center',
            'rounded-full bg-cream pb-0.5 text-lg leading-none text-ash',
            'transition-all duration-200 ease-smooth',
            'group-hover:translate-x-0.5 group-hover:bg-ink group-hover:text-white',
          )}
        >
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
        'flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-2xl leading-none',
        'ring-1 ring-ink/[0.04] transition-transform duration-200 ease-smooth group-hover:scale-[1.04]',
        tone ?? 'bg-cream',
      )}
    >
      {children}
    </span>
  );
}

interface RowActionProps {
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
  /** Why the button is greyed out — the rule, not "disabled". */
  title?: string;
  children: ReactNode;
}

/**
 * The pill buttons on the right of a card.
 *
 * One copy for all four lists that have them: Hide/Show, Generate, Delete and
 * the rest were three near-identical local components, which is exactly how a
 * back office ends up with three slightly different Delete buttons.
 */
export function RowAction({ tone = 'default', disabled, onClick, title, children }: RowActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'press rounded-full px-3.5 py-2 font-display text-xs font-bold',
        'ring-1 ring-inset transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger'
          ? 'bg-flame-soft text-flame ring-flame/10 hover:bg-flame hover:text-white hover:ring-flame'
          : 'bg-cream text-charcoal ring-ink/[0.04] hover:bg-ink hover:text-white hover:ring-ink',
      )}
    >
      {children}
    </button>
  );
}
