import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiError, OrderDetail, OrderListItem, OrderListQuery, OrderStatus } from '@/types';
import { orderApi } from '@/services/api/orderApi';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/LoadingScreen';
import { SearchBar } from '@/components/controls/SearchBar';
import { OrderDetailModal } from './OrderDetailModal';
import { formatCurrency } from '@/utils/currency';
import { STATUS_STYLES, formatWhen } from '@/utils/orderDisplay';
import { cn } from '@/utils/cn';
import { PATHS } from '@/routes/paths';

const PAGE_SIZE = 25;

type Range = 'today' | 'week' | 'all';

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
];

const STATUSES: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'placed', label: 'Unpaid' },
  { value: 'payment_failed', label: 'Failed' },
];

const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/** Business dates are stored in UTC, which is what toISOString gives us. */
const rangeToQuery = (range: Range): Pick<OrderListQuery, 'from'> =>
  range === 'all' ? {} : { from: isoDaysAgo(range === 'today' ? 0 : 6) };

export default function OrdersPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('today');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [items, setItems] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(
    async (offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const page = await orderApi.list({
          ...rangeToQuery(range),
          ...(status === 'all' ? {} : { status }),
          ...(debouncedSearch.trim() ? { orderNumber: debouncedSearch.trim() } : {}),
          limit: PAGE_SIZE,
          offset,
        });
        setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
        setTotal(page.total);
        setRevenue(page.revenue);
      } catch (err) {
        setError((err as ApiError)?.message ?? 'Could not load orders.');
      } finally {
        setLoading(false);
      }
    },
    [range, status, debouncedSearch],
  );

  useEffect(() => { void load(0); }, [load]);

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
    <div className="flex h-full w-full flex-col bg-cream">
      <header className="flex items-center gap-6 border-b border-mist bg-ink px-8 py-5 text-white">
        <Button variant="ghost" size="md" onClick={() => navigate(PATHS.splash)} className="text-white hover:bg-white/10">
          ← Exit
        </Button>
        <h1 className="font-display text-kiosk-lg font-extrabold">Orders</h1>
        <span className="ml-auto text-kiosk-sm text-white/60">
          {total} order{total === 1 ? '' : 's'} · {formatCurrency(revenue)}
        </span>
        <Button variant="ghost" size="md" onClick={() => void load(0)} className="text-white hover:bg-white/10">
          ⟳ Refresh
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-mist px-8 py-5">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <FilterChip key={r.value} active={range === r.value} onClick={() => setRange(r.value)}>
              {r.label}
            </FilterChip>
          ))}
        </div>
        <span className="mx-2 h-8 w-px bg-mist" />
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <FilterChip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
              {s.label}
            </FilterChip>
          ))}
        </div>
        <div className="ml-auto w-[320px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Order number…" />
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-8 py-6">
        {error && (
          <div className="mb-5 rounded-2xl border-2 border-flame/30 bg-flame-soft px-6 py-4 text-kiosk-sm text-flame">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="flex h-full items-center justify-center"><Spinner size={56} /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="🧾" title="No orders yet" message="Orders placed on this kiosk will show up here." />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {items.map((order) => (
                <OrderRow key={order.orderId} order={order} onOpen={() => void openDetail(order.orderId)} />
              ))}
            </div>

            {items.length < total && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" onClick={() => void load(items.length)} disabled={loading}>
                  {loading ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, total - items.length)} more`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <Spinner size={64} />
        </div>
      )}

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'press rounded-full border-2 px-6 py-3 font-display text-kiosk-sm font-bold transition-colors',
        active ? 'border-flame bg-flame text-white' : 'border-mist bg-paper text-charcoal',
      )}
    >
      {children}
    </button>
  );
}

function OrderRow({ order, onOpen }: { order: OrderListItem; onOpen: () => void }) {
  const badge = STATUS_STYLES[order.status];
  return (
    <button
      onClick={onOpen}
      className="press flex w-full items-center gap-6 rounded-xl2 border-2 border-mist bg-paper px-6 py-5 text-left transition-colors hover:border-charcoal/20"
    >
      <div className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-cream">
        <span className="text-kiosk-xs text-ash">#</span>
        <span className="font-display text-kiosk-lg font-extrabold text-ink">{order.orderNumber}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className={cn('rounded-full px-3 py-1 font-display text-kiosk-xs font-bold', badge.className)}>
            {badge.label}
          </span>
          <span className="text-kiosk-xs text-ash">
            {order.orderType === 'dine_in' ? '🍽️ Dine in' : '🥡 Take away'} · {formatWhen(order.placedAt)}
          </span>
        </div>
        <p className="mt-1 truncate text-kiosk-sm text-charcoal">{order.itemsPreview || '—'}</p>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-display text-kiosk-lg font-bold text-ink">{formatCurrency(order.total)}</div>
        <div className="text-kiosk-xs text-ash">{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</div>
      </div>
      <span className="shrink-0 text-kiosk-lg text-ash">›</span>
    </button>
  );
}
