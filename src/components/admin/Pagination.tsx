import { Pagination as AntPagination } from 'antd';

interface PaginationProps {
  /** Rows matching the filter, ignoring paging. */
  total: number;
  limit: number;
  offset: number;
  /** Zero-based, matching the `offset / limit` the slices page by. */
  onPageChange: (page: number) => void;
  /** What the rows are, for the "1–15 of 42 coupons" line. */
  noun?: string;
}

/**
 * Row count on the left, antd's pager on the right.
 *
 * The count stays a plain line rather than antd's `showTotal`, which folds it
 * into the button row — the two belong at opposite ends of the bar.
 *
 * antd counts pages from 1; every slice here pages from 0, so the boundary is
 * converted in one place, here.
 */
export function Pagination({ total, limit, offset, onPageChange, noun = 'rows' }: PaginationProps) {
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

      {total > limit && (
        <AntPagination
          current={Math.floor(offset / limit) + 1}
          pageSize={limit}
          total={total}
          onChange={(page) => onPageChange(page - 1)}
          showSizeChanger={false}
        />
      )}
    </div>
  );
}
