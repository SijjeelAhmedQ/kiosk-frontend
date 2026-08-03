import { Pagination as AntPagination } from 'antd';

/** The sizes on offer. 15 is where every list in the back office starts. */
export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

interface PaginationProps {
  /** Rows matching the filter, ignoring paging. */
  total: number;
  limit: number;
  offset: number;
  /** Zero-based, matching the `offset / limit` the slices page by. */
  onPageChange: (page: number) => void;
  /** Omit to fix the page length and hide the sizer. */
  onLimitChange?: (limit: number) => void;
}

/**
 * antd's pager and its page sizer, and nothing else.
 *
 * Shown as soon as the list has a row in it, even when everything already fits
 * on one page: the sizer is how you make a long list short, so hiding it until
 * the list is long puts the control behind the problem it solves. An empty list
 * still renders nothing — there is no size worth choosing for no rows.
 *
 * antd counts pages from 1; every slice here pages from 0, so the boundary is
 * converted in one place, here.
 */
export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (total === 0) return null;

  // "Showing 16–30 of 214" — the pager says which page you are on, not how far
  // through the rows that puts you, and the second question is the one asked.
  const first = offset + 1;
  const last = Math.min(offset + limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-4">
      <p className="text-xs text-ash">
        Showing{' '}
        <span className="font-display font-bold tabular-nums text-charcoal">
          {first}–{last}
        </span>{' '}
        of <span className="font-display font-bold tabular-nums text-charcoal">{total}</span>
      </p>

      <AntPagination
        current={Math.floor(offset / limit) + 1}
        pageSize={limit}
        total={total}
        /* antd fires this for a size change as well as a page change, so both
           are read off the one handler — reacting to each separately would send
           a page hop and a resize for what the user did once. */
        onChange={(page, size) => {
          if (size !== limit) onLimitChange?.(size);
          else onPageChange(page - 1);
        }}
        showSizeChanger={Boolean(onLimitChange)}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
      />
    </div>
  );
}
