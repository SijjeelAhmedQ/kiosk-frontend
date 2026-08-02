import { useCallback, useEffect, useState } from 'react';
import type {
  ApiError,
  OrderDetail,
  OrderListItem,
  OrderListQuery,
  OrderStatus,
} from '@/types';
import { orderApi } from '@/services/api/orderApi';
import { useDebounce } from '@/hooks/useDebounce';
import { EmptyState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/LoadingScreen';
import { SearchBar } from '@/components/controls/SearchBar';
import {
  AlertBanner,
  Field,
  ListRow,
  ListView,
  PageBody,
  PageHeader,
  Pagination,
  RowTile,
  Select,
  Stat,
  type SelectOption,
} from '@/components/admin';
import { OrderDetailModal } from '@/pages/OrderDetailModal';
import { formatCurrency } from '@/utils/currency';
import { STATUS_STYLES, formatWhen } from '@/utils/orderDisplay';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 15;

type Range = 'today' | 'week' | 'all';

const RANGE_OPTIONS: SelectOption<Range>[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
];

type StatusChoice = '' | OrderStatus;

const STATUS_OPTIONS: SelectOption<StatusChoice>[] = [
  { value: '', label: 'Any status' },
  { value: 'paid', label: 'Paid' },
  { value: 'placed', label: 'Awaiting payment' },
  { value: 'payment_failed', label: 'Payment failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORDER_TYPE_ICON = { dine_in: '🍽️', take_away: '🥡' } as const;
const ORDER_TYPE_LABEL = { dine_in: 'Dine in', take_away: 'Take away' } as const;

const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/** Business dates are stored in UTC, which is what toISOString gives us. */
const rangeToQuery = (range: Range): Pick<OrderListQuery, 'from'> =>
  range === 'all' ? {} : { from: isoDaysAgo(range === 'today' ? 0 : 6) };

/** Ticket numbers are digits only, so anything else is a typo on the keypad. */
const toOrderNumber = (raw: string): string => raw.replace(/\D/g, '').slice(0, 10);

/**
 * Every order the kiosk has taken.
 *
 * Lives in the back office with the menu and the coupons rather than on its own
 * screen: it is the same job — someone at a desk looking things up — and having
 * one of the four lists wear a different chrome only made it harder to find.
 *
 * State is local rather than in a slice. Nothing else in the app reads this
 * list, and the filters are meant to reset when you leave, unlike the coupon
 * screens where you come back from a detail page expecting them intact.
 */
export default function OrderListPage() {
  const [range, setRange] = useState<Range>('today');
  const [status, setStatus] = useState<StatusChoice>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [items, setItems] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const activeNumber = toOrderNumber(debouncedSearch);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await orderApi.list({
        /* Ticket numbers restart every day, so a search has to look past the
           selected period — otherwise yesterday's #142 is simply invisible. */
        ...(activeNumber ? { orderNumber: activeNumber } : rangeToQuery(range)),
        ...(status ? { status } : {}),
        limit: PAGE_SIZE,
        offset,
      });
      setItems(page.items);
      setTotal(page.total);
      setRevenue(page.revenue);
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [activeNumber, range, status, offset]);

  useEffect(() => { void load(); }, [load]);

  // Any filter change puts you back on the first page — page 4 of the old
  // result set means nothing once the filter moved.
  useEffect(() => { setOffset(0); }, [activeNumber, range, status]);

  const openDetail = async (orderId: number) => {
    setDetailLoading(true);
    try {
      setSelected(await orderApi.getById(orderId));
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Could not open that order.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PageBody fill>
      <div className="shrink-0">
        <PageHeader
          title="Orders"
          subtitle="Every ticket the kiosk has taken, newest first. Open one to see its lines and what was paid."
        />

        <AlertBanner message={error} onDismiss={() => setError(null)} />

        <div className="mb-5 grid max-w-[34rem] grid-cols-2 gap-3">
          <Stat label="Orders" value={String(total)} />
          <Stat label="Revenue" value={formatCurrency(revenue)} tone="text-leaf" />
        </div>

        <div className="mb-5 flex flex-col gap-4 rounded-xl3 bg-paper p-5 shadow-soft">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by ticket number…" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Period"
              hint={activeNumber ? 'Ignored while searching a ticket number.' : undefined}
            >
              <Select<Range>
                value={range}
                onChange={setRange}
                options={RANGE_OPTIONS}
                disabled={Boolean(activeNumber)}
              />
            </Field>
            <Field label="Status">
              <Select<StatusChoice> value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </Field>
          </div>
        </div>
      </div>

      <ListView
        fill
        rows={items}
        rowKey={(o) => o.orderId}
        loading={loading}
        renderRow={(o) => <OrderCard order={o} onOpen={() => void openDetail(o.orderId)} />}
        empty={
          <EmptyState
            icon={activeNumber ? '🔍' : '🧾'}
            title={activeNumber ? `No order #${activeNumber}` : 'No orders here'}
            message={
              activeNumber
                ? 'No ticket starts with that number. Check the digits, or clear the search.'
                : 'Nothing in this period. Try a wider one, or a different status.'
            }
          />
        }
      />

      <div className="shrink-0">
        <Pagination
          total={total}
          limit={PAGE_SIZE}
          offset={offset}
          onPageChange={(page) => setOffset(page * PAGE_SIZE)}
        />
      </div>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
          <Spinner size={60} />
        </div>
      )}

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
    </PageBody>
  );
}

function OrderCard({ order, onOpen }: { order: OrderListItem; onOpen: () => void }) {
  const badge = STATUS_STYLES[order.status];

  return (
    <ListRow
      accent={badge.accent}
      openLabel={`Open order ${order.orderNumber}`}
      onOpen={onOpen}
      lead={<RowTile>{ORDER_TYPE_ICON[order.orderType]}</RowTile>}
      title={
        <>
          <code className="font-mono text-base font-bold tracking-tight text-ink">
            #{order.orderNumber}
          </code>
          <span
            className={cn(
              'rounded-full px-3 py-1 font-display text-xs font-bold',
              badge.className,
            )}
          >
            {badge.label}
          </span>
          <span className="rounded-full bg-cream px-3 py-1 font-display text-xs font-bold text-charcoal">
            {ORDER_TYPE_LABEL[order.orderType]}
          </span>
        </>
      }
      subtitle={order.itemsPreview || '—'}
      meta={<span>{formatWhen(order.placedAt)}</span>}
      trailing={
        <div className="w-32">
          <p className="font-display text-lg font-extrabold tabular-nums text-ink">
            {formatCurrency(order.total)}
          </p>
          <p className="mt-1.5 text-xs text-ash">
            {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
          </p>
        </div>
      }
    />
  );
}
