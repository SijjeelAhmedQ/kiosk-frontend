import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Campaign, Coupon, CouponStatus, CouponType } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  COUPON_PAGE_SIZE,
  clearCouponError,
  fetchCoupons,
  setCouponPage,
  setCouponQuery,
} from '@/redux/slices/couponsSlice';
import { campaignApi } from '@/services/api/campaignApi';
import { useDebounce } from '@/hooks/useDebounce';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchBar } from '@/components/controls/SearchBar';
import {
  AlertBanner,
  type Column,
  CopyButton,
  CouponStatusBadge,
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
import {
  COUPON_STATUS_STYLES,
  COUPON_STATUSES,
  formatDay,
  relativeDay,
  spentFraction,
} from '@/utils/couponDisplay';
import { ADMIN_PATHS } from '@/routes/paths';

/* '' is a real option in these lists, not a placeholder — it is the value the
   filters carry when nothing is selected, and what the query reads as "any". */
const STATUS_OPTIONS: SelectOption<CouponStatus | ''>[] = [
  { value: '', label: 'Any status' },
  ...COUPON_STATUSES.map((s) => ({ value: s, label: COUPON_STATUS_STYLES[s].label })),
];

const TYPE_OPTIONS: SelectOption<CouponType | ''>[] = [
  { value: '', label: 'Any type' },
  { value: 'product', label: 'Product' },
  { value: 'value', label: 'Value' },
];

export default function CouponListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const { items, total, issuedValue, remainingValue, redeemedValue, query, loading, error } =
    useAppSelector((s) => s.coupons);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [campaignId, setCampaignId] = useState<string>(searchParams.get('campaignId') ?? '');
  const [status, setStatus] = useState<CouponStatus | ''>('');
  const [type, setType] = useState<CouponType | ''>('');
  const [range, setRange] = useState<{ from?: string; to?: string }>({});

  /* Campaign options are fetched straight from the API rather than through the
     campaigns slice — that slice holds the *paged* admin list, and borrowing it
     here would fight with whatever filter that page had left behind. */
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  useEffect(() => {
    let cancelled = false;
    void campaignApi
      .list({ limit: 200 })
      .then((page) => { if (!cancelled) setCampaigns(page.items); })
      .catch(() => { /* the filter just stays empty; the list itself still works */ });
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
      setCouponQuery({
        search: debouncedSearch.trim() || undefined,
        campaignId: campaignId ? Number(campaignId) : undefined,
        status: status || undefined,
        couponType: type || undefined,
        from: range.from,
        to: range.to,
      }),
    );
  }, [dispatch, debouncedSearch, campaignId, status, type, range.from, range.to]);

  useEffect(() => {
    void dispatch(fetchCoupons(query));
  }, [dispatch, query]);

  const filtered = Boolean(debouncedSearch || campaignId || status || type || range.from || range.to);

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => (
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <code className="font-mono text-sm font-semibold text-ink">{c.couponCode}</code>
            <p className="mt-0.5 truncate text-xs text-ash">{c.campaignName}</p>
          </div>
          <CopyButton value={c.couponCode} label="coupon code" />
        </div>
      ),
    },
    { key: 'type', header: 'Type', width: 'w-32', render: (c) => <CouponTypeBadge type={c.couponType} /> },
    {
      key: 'worth',
      header: 'Worth',
      width: 'w-56',
      render: (c) =>
        c.couponType === 'value' ? (
          <ValueBar original={c.originalAmount} remaining={c.remainingBalance} />
        ) : (
          <span className="truncate text-sm text-charcoal">{c.productName ?? '—'}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-40',
      render: (c) => <CouponStatusBadge status={c.status} />,
    },
    {
      key: 'expiry',
      header: 'Expires',
      width: 'w-44',
      render: (c) => (
        <span className="whitespace-nowrap text-xs text-ash">
          {formatDay(c.expiryDate)}
          <span className="ml-1.5 opacity-70">({relativeDay(c.expiryDate)})</span>
        </span>
      ),
    },
    {
      key: 'used',
      header: 'Used',
      align: 'right',
      width: 'w-24',
      render: (c) => <span className="tabular-nums text-charcoal">{c.redemptionCount}</span>,
    },
  ];

  return (
    <PageBody fill>
      {/* Everything above the table keeps its height; the table absorbs the
          rest and scrolls, so the page itself never does. */}
      <div className="shrink-0">
        <PageHeader
          title="Coupons"
          subtitle="Every code issued, and what is left on it. Codes are matched from the start, so typing the prefix is enough."
        />

        <AlertBanner message={error} onDismiss={() => dispatch(clearCouponError())} />

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Coupons" value={String(total)} />
          <Stat label="Issued value" value={formatCurrency(issuedValue)} />
          <Stat label="Redeemed" value={formatCurrency(redeemedValue)} tone="text-leaf" />
          <Stat label="Outstanding" value={formatCurrency(remainingValue)} tone="text-amber-dark" />
        </div>

        <div className="mb-5 flex flex-col gap-4 rounded-xl3 bg-paper p-5 shadow-soft">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by coupon code…" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Campaign">
              <Select value={campaignId} onChange={setCampaignId} options={campaignOptions} />
            </Field>

            <Field label="Status">
              <Select<CouponStatus | ''>
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
              />
            </Field>

            <Field label="Type">
              <Select<CouponType | ''> value={type} onChange={setType} options={TYPE_OPTIONS} />
            </Field>

            <DateRangeFilter
              from={range.from}
              to={range.to}
              onChange={setRange}
              fromLabel="Issued from"
              toLabel="Issued to"
            />
          </div>
        </div>
      </div>

      <DataTable
        fill
        columns={columns}
        rows={items}
        rowKey={(c) => c.couponId}
        loading={loading}
        onRowClick={(c) => navigate(ADMIN_PATHS.couponDetail(c.couponCode))}
        empty={
          <EmptyState
            icon="🎟️"
            title={filtered ? 'No matching coupons' : 'No coupons yet'}
            message={
              filtered
                ? 'Try a different code, campaign or status.'
                : 'Open a campaign and generate some — coupons are always issued against one.'
            }
          />
        }
      />

      <div className="shrink-0">
        <Pagination
          total={total}
          limit={query.limit ?? COUPON_PAGE_SIZE}
          offset={query.offset ?? 0}
          onPageChange={(page) => dispatch(setCouponPage(page))}
          noun="coupons"
        />
      </div>
    </PageBody>
  );
}

/** Balance left, with a bar so a half-spent coupon is obvious at a glance. */
function ValueBar({ original, remaining }: { original: number | null; remaining: number | null }) {
  const spent = spentFraction(original, remaining);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="tabular-nums text-sm">
        <span className="font-semibold text-ink">{formatCurrency(remaining ?? 0)}</span>
        <span className="text-ash"> / {formatCurrency(original ?? 0)}</span>
      </span>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <span
          className="block h-full rounded-full bg-amber transition-all duration-300"
          style={{ width: `${Math.round((1 - spent) * 100)}%` }}
        />
      </span>
    </div>
  );
}
