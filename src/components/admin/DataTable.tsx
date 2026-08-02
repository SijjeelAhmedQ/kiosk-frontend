import { type ReactNode } from 'react';
import { ConfigProvider, Table, type TableColumnsType } from 'antd';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/common/LoadingScreen';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Numbers read right-aligned; everything else left. */
  align?: 'left' | 'right' | 'center';
  /** A tailwind width class, e.g. 'w-40'. Omit to let the column size itself. */
  width?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Shown instead of the table body when there are no rows. */
  empty?: ReactNode;
  /**
   * Claim the height left over by the rest of the page and scroll the rows
   * inside it, with the header pinned. Needs an ancestor that constrains the
   * height — <PageBody fill> is the one that does.
   */
  fill?: boolean;
}

/**
 * The one table the back office uses — antd's Table underneath, themed in
 * src/theme/antdTheme.ts so it reads as the same plain list it always did.
 *
 * Still deliberately plain: no sorting, no column resizing, no virtualisation.
 * The lists it renders are server-paged at 10–15 rows, so none of that would do
 * anything except add ways for it to go wrong. Paging stays outside the table
 * too, in <Pagination>, because it sits below the card rather than inside it.
 *
 * Loading and empty are handled here rather than by antd, so a first load shows
 * the app's spinner and an empty list shows the page's own <EmptyState>.
 *
 * The table scrolls inside its own container rather than pushing the page wide,
 * which is what keeps a narrow window usable.
 */
export function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  fill,
}: DataTableProps<T>) {
  // The spinner and the empty state stand in for the table, so they have to
  // take up the same room it would — otherwise a filled page jumps on reload.
  const surface = cn('rounded-xl3 bg-paper shadow-soft', fill && 'min-h-0 flex-1');

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

  const antColumns: TableColumnsType<T> = columns.map((col) => ({
    key: col.key,
    // The header's own typography lives on this span rather than on the <th>:
    // antd's th rules are specific enough to beat a Tailwind class there.
    title: (
      <span className="font-display text-xs font-bold tracking-[0.01em] text-ash">
        {col.header}
      </span>
    ),
    align: col.align ?? 'left',
    className: col.width,
    render: (_: unknown, row: T) => col.render(row),
  }));

  return (
    <div
      className={cn(
        'admin-table rounded-xl3 bg-paper shadow-soft',
        // Sideways when it has to, both ways when it owns the page's height.
        fill ? 'admin-table--sticky min-h-0 flex-1 overflow-auto' : 'overflow-x-auto',
      )}
    >
      <ConfigProvider
        // Rows only light up when there is somewhere to click through to.
        theme={{ components: { Table: { rowHoverBg: onRowClick ? '#F4F4F7' : 'transparent' } } }}
      >
        <Table<T>
          columns={antColumns}
          dataSource={rows}
          rowKey={rowKey}
          pagination={false}
          tableLayout="auto"
          className={cn(loading && 'opacity-50 transition-opacity')}
          onRow={
            onRowClick
              ? (row) => ({ onClick: () => onRowClick(row), className: 'cursor-pointer' })
              : undefined
          }
        />
      </ConfigProvider>
    </div>
  );
}
