import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Campaign, CouponHistoryItem } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  COUPON_PAGE_SIZE,
  clearCouponError,
  fetchCouponHistory,
  setHistoryPage,
  setHistoryQuery,
} from '@/redux/slices/couponsSlice';
import { campaignApi } from '@/services/api/campaignApi';
import { useDebounce } from '@/hooks/useDebounce';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchBar } from '@/components/controls/SearchBar';
import {
  AlertBanner,
  type Column,
  CouponTypeBadge,
  DataTable,
  DateRangeFilter,
  Field,
  PageBody,
  PageHeader,
  Pagination,
  Select,
  Stat,
  type SelectOption,
} from '@/components/admin';
import { formatCurrency } from '@/utils/currency';
import { formatWhen } from '@/utils/orderDisplay';
import { ADMIN_PATHS } from '@/routes/paths';

/**
 * The redemption log — one row per time a coupon paid for something.
 *
 * Reads dbo.CouponRedemptionHistory, which is a view over the coupon ledger
 * rather than a second table, so these rows can never drift from the balances
 * shown on the coupon screens.
 */
export default function CouponHistoryPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { history, historyTotal, historyValue, historyQuery, historyLoading, error } =
    useAppSelector((s) => s.coupons);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [campaignId, setCampaignId] = useState('');
  const [range, setRange] = useState<{ from?: string; to?: string }>({});

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  useEffect(() => {
    let cancelled = false;
    void campaignApi
      .list({ limit: 200 })
      .then((page) => { if (!cancelled) setCampaigns(page.items); })
      .catch(() => { /* the filter stays empty; the log still loads */ });
    return () => { cancelled = true; };
  }, []);

  const campaignOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'All campaigns' },
      ...campaigns.map((c) => ({ value: String(c.campaignId), label: c.name })),
    ],
    [campaigns],
  );

  useEffect(() => {
    dispatch(
      setHistoryQuery({
        couponCode: debouncedSearch.trim() || undefined,
        campaignId: campaignId ? Number(campaignId) : undefined,
        from: range.from,
        to: range.to,
      }),
    );
  }, [dispatch, debouncedSearch, campaignId, range.from, range.to]);

  useEffect(() => {
    void dispatch(fetchCouponHistory(historyQuery));
  }, [dispatch, historyQuery]);

  const filtered = Boolean(debouncedSearch || campaignId || range.from || range.to);

  const columns: Column<CouponHistoryItem>[] = [
    {
      key: 'when',
      header: 'When',
      width: 'w-52',
      render: (h) => (
        <span className="whitespace-nowrap text-xs text-ash">{formatWhen(h.redeemedDate)}</span>
      ),
    },
    {
      key: 'coupon',
      header: 'Coupon',
      render: (h) => (
        <div className="min-w-0">
          <code className="font-mono text-sm font-semibold text-ink">{h.couponCode}</code>
          <p className="mt-0.5 truncate text-xs text-ash">{h.campaignName}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', width: 'w-32', render: (h) => <CouponTypeBadge type={h.couponType} /> },
    {
      key: 'order',
      header: 'Order',
      width: 'w-28',
      render: (h) =>
        h.orderNumber ? (
          <span className="font-mono text-sm text-ink">#{h.orderNumber}</span>
        ) : (
          <span className="text-ash">—</span>
        ),
    },
    {
      key: 'amount',
      header: 'Redeemed',
      align: 'right',
      width: 'w-32',
      render: (h) => (
        <span className="tabular-nums font-semibold text-ink">
          {formatCurrency(h.redeemedAmount)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance after',
      align: 'right',
      width: 'w-36',
      render: (h) =>
        h.remainingBalance === null ? (
          <span className="text-ash">—</span>
        ) : (
          <span className="tabular-nums text-charcoal">{formatCurrency(h.remainingBalance)}</span>
        ),
    },
    {
      key: 'terminal',
      header: 'Terminal',
      width: 'w-36',
      render: (h) => (
        <span className="text-xs text-ash">
          {h.terminalId}
          {h.customerId && <span className="block">{h.customerId}</span>}
        </span>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Redemptions"
        subtitle="Every time a coupon paid for something, newest first."
      />

      <AlertBanner message={error} onDismiss={() => dispatch(clearCouponError())} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Redemptions" value={String(historyTotal)} />
        <Stat label="Value redeemed" value={formatCurrency(historyValue)} tone="text-leaf" />
      </div>

      <div className="mb-5 flex flex-col gap-4 rounded-xl3 bg-paper p-5 shadow-soft">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by coupon code…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Campaign">
            <Select value={campaignId} onChange={setCampaignId} options={campaignOptions} />
          </Field>
          <div className="sm:col-span-2">
            <DateRangeFilter
              from={range.from}
              to={range.to}
              onChange={setRange}
              fromLabel="Redeemed from"
              toLabel="Redeemed to"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={history}
        rowKey={(h) => h.historyId}
        loading={historyLoading}
        onRowClick={(h) => navigate(ADMIN_PATHS.couponDetail(h.couponCode))}
        empty={
          <EmptyState
            icon="📊"
            title={filtered ? 'No matching redemptions' : 'Nothing redeemed yet'}
            message={
              filtered
                ? 'Try a different code, campaign or date range.'
                : 'Redemptions appear here as soon as a customer uses a coupon.'
            }
          />
        }
      />

      <Pagination
        total={historyTotal}
        limit={historyQuery.limit ?? COUPON_PAGE_SIZE}
        offset={historyQuery.offset ?? 0}
        onPageChange={(page) => dispatch(setHistoryPage(page))}
        noun="redemptions"
      />
    </PageBody>
  );
}
