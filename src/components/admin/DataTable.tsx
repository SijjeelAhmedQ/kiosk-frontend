import { type ReactNode } from 'react';
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
}

const alignment = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

/**
 * The one table the back office uses.
 *
 * Kept deliberately plain — no sorting, no column resizing, no virtualisation.
 * The lists it renders are server-paged at 10–15 rows, so none of that would do
 * anything except add ways for it to go wrong.
 *
 * The table scrolls inside its own container rather than pushing the page wide,
 * which is what keeps a narrow window usable.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
}: DataTableProps<T>) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl3 bg-paper shadow-soft">
        <Spinner size={44} />
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="rounded-xl3 bg-paper shadow-soft">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl3 bg-paper shadow-soft">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-mist">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'whitespace-nowrap px-5 py-4 font-display text-xs font-bold uppercase tracking-[0.08em] text-ash',
                  alignment[col.align ?? 'left'],
                  col.width,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn(loading && 'opacity-50 transition-opacity')}>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-mist/60 last:border-0 transition-colors duration-150',
                onRowClick && 'cursor-pointer hover:bg-cream',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-5 py-4 text-sm text-charcoal', alignment[col.align ?? 'left'])}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
