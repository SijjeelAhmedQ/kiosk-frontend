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
    <div className="flex h-full w-full bg-cream">
      {/* Filters live in a rail so the list keeps the full width for data. */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-8 border-r border-mist bg-paper p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-kiosk-lg font-extrabold text-ink">Orders</h1>
          <Button variant="secondary" size="md" onClick={() => navigate(PATHS.splash)}>
            Exit
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Orders" value={String(total)} />
          <Stat label="Revenue" value={formatCurrency(revenue)} />
        </div>

        <FilterGroup label="Period">
          {RANGES.map((r) => (
            <FilterChip key={r.value} active={range === r.value} onClick={() => setRange(r.value)}>
              {r.label}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Status">
          {STATUSES.map((s) => (
            <FilterChip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
              {s.label}
            </FilterChip>
          ))}
        </FilterGroup>

        <Button variant="secondary" size="md" fullWidth className="mt-auto" onClick={() => void load(0)}>
          Refresh
        </Button>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 px-8 pb-5 pt-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by order number…" />
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-8 pb-8">
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-flame-soft px-6 py-4 font-display text-kiosk-sm font-bold text-flame animate-fade-in">
              <span className="text-kiosk-lg leading-none">⚠️</span>
              {error}
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="flex h-full items-center justify-center"><Spinner size={52} /></div>
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
      </section>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
          <Spinner size={60} />
        </div>
      )}

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-2xl bg-cream px-4 py-3 leading-none">
      <span className="text-kiosk-xs text-ash">{label}</span>
      <span className="mt-2 font-display text-kiosk-base font-extrabold tabular-nums text-ink">{value}</span>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-display text-kiosk-xs font-bold uppercase tracking-[0.1em] text-ash">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
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
        'press rounded-full px-5 py-2.5 font-display text-kiosk-xs font-bold transition-colors duration-200',
        active ? 'bg-ink text-white' : 'bg-cream text-charcoal hover:bg-mist',
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
      className="press group flex w-full items-center gap-6 rounded-xl3 bg-paper px-6 py-5 text-left shadow-soft transition-all duration-200 ease-smooth hover:shadow-card"
    >
      <div className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-cream leading-none">
        <span className="text-kiosk-xs text-ash">#</span>
        <span className="mt-1.5 font-display text-kiosk-lg font-extrabold tabular-nums text-ink">{order.orderNumber}</span>
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
        <p className="mt-1.5 truncate text-kiosk-sm text-charcoal">{order.itemsPreview || '—'}</p>
      </div>

      <div className="shrink-0 text-right leading-none">
        <div className="font-display text-kiosk-lg font-extrabold tabular-nums text-ink">{formatCurrency(order.total)}</div>
        <div className="mt-1.5 text-kiosk-xs text-ash">{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</div>
      </div>
      <span className="shrink-0 text-kiosk-lg text-ash transition-transform duration-200 group-hover:translate-x-1">›</span>
    </button>
  );
}
