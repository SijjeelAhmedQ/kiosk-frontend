import { cn } from '@/utils/cn';

interface PaginationProps {
  /** Rows matching the filter, ignoring paging. */
  total: number;
  limit: number;
  offset: number;
  onPageChange: (page: number) => void;
  /** What the rows are, for the "1–15 of 42 coupons" line. */
  noun?: string;
}

/** At most this many numbered buttons; the rest collapse into an ellipsis. */
const MAX_BUTTONS = 7;

/**
 * Builds the page list, eliding the middle when there are too many pages:
 * [0, 1, 2, 3, …, 41] rather than forty-two buttons.
 */
function pageWindow(current: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= MAX_BUTTONS) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const pages = new Set<number>([0, pageCount - 1, current]);
  // Keep a neighbour either side of the current page so stepping through is
  // one click, not a jump back to the ends.
  if (current > 0) pages.add(current - 1);
  if (current < pageCount - 1) pages.add(current + 1);
  // Pad from the front while there is room, so early pages stay reachable.
  for (let i = 1; pages.size < MAX_BUTTONS - 1 && i < pageCount - 1; i += 1) pages.add(i);

  const sorted = [...pages].sort((a, b) => a - b);
  const withGaps: (number | 'gap')[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - (sorted[index - 1] as number) > 1) withGaps.push('gap');
    withGaps.push(page);
  });
  return withGaps;
}

export function Pagination({ total, limit, offset, onPageChange, noun = 'rows' }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const current = Math.floor(offset / limit);

  const firstRow = total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-4">
      <p className="text-sm text-ash">
        {total === 0 ? (
          `No ${noun}`
        ) : (
          <>
            <span className="font-semibold tabular-nums text-charcoal">
              {firstRow}–{lastRow}
            </span>{' '}
            of <span className="font-semibold tabular-nums text-charcoal">{total}</span> {noun}
          </>
        )}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <PageButton
            disabled={current === 0}
            onClick={() => onPageChange(current - 1)}
            aria-label="Previous page"
          >
            ‹
          </PageButton>

          {pageWindow(current, pageCount).map((page, index) =>
            page === 'gap' ? (
              <span key={`gap-${index}`} className="px-1.5 text-sm text-ash">
                …
              </span>
            ) : (
              <PageButton key={page} active={page === current} onClick={() => onPageChange(page)}>
                {page + 1}
              </PageButton>
            ),
          )}

          <PageButton
            disabled={current >= pageCount - 1}
            onClick={() => onPageChange(current + 1)}
            aria-label="Next page"
          >
            ›
          </PageButton>
        </div>
      )}
    </div>
  );
}

function PageButton({
  active,
  disabled,
  onClick,
  children,
  ...rest
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'press flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3',
        'font-display text-sm font-bold tabular-nums transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-30',
        active ? 'bg-ink text-white' : 'bg-cream text-charcoal hover:bg-mist',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
