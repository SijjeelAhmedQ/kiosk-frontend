import { Pagination as AntPagination } from 'antd';

interface PaginationProps {
  /** Rows matching the filter, ignoring paging. */
  total: number;
  limit: number;
  offset: number;
  /** Zero-based, matching the `offset / limit` the slices page by. */
  onPageChange: (page: number) => void;
}

/**
 * antd's pager, and nothing else.
 *
 * Renders nothing at all when everything fits on one page — a lone "1" button
 * under a short list is furniture.
 *
 * antd counts pages from 1; every slice here pages from 0, so the boundary is
 * converted in one place, here.
 */
export function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  if (total <= limit) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 px-1 py-4">
      <AntPagination
        current={Math.floor(offset / limit) + 1}
        pageSize={limit}
        total={total}
        onChange={(page) => onPageChange(page - 1)}
        showSizeChanger={false}
      />
    </div>
  );
}
