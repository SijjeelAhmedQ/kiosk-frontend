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
  CopyButton,
  CouponStatusBadge,
  DateRangeFilter,
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
import { formatCurrency } from '@/utils/currency';
import {
  COUPON_STATUS_STYLES,
  COUPON_STATUSES,
  COUPON_TYPE_ICON,
  formatDayTime,
  relativeWhen,
  spentFraction,
} from '@/utils/couponDisplay';
import { formatWhen } from '@/utils/orderDisplay';
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

  return (
    <PageBody>
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

      <ListView
        rows={items}
        rowKey={(c) => c.couponId}
        loading={loading}
        renderRow={(c) => (
          <CouponCard
            coupon={c}
            onOpen={() => navigate(ADMIN_PATHS.couponDetail(c.couponCode))}
          />
        )}
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

      <Pagination
        total={total}
        limit={query.limit ?? COUPON_PAGE_SIZE}
        offset={query.offset ?? 0}
        onPageChange={(page) => dispatch(setCouponPage(page))}
        noun="coupons"
      />
    </PageBody>
  );
}

/**
 * One coupon as a card.
 *
 * The code leads, because it is what someone is holding a printout of and
 * matching against the screen — so it gets the size a heading gets, with the
 * copy button next to it rather than buried in a column.
 */
function CouponCard({ coupon, onOpen }: { coupon: Coupon; onOpen: () => void }) {
  const isValue = coupon.couponType === 'value';

  return (
    <ListRow
      accent={COUPON_STATUS_STYLES[coupon.status].accent}
      openLabel={`Open coupon ${coupon.couponCode}`}
      onOpen={onOpen}
      lead={<RowTile>{COUPON_TYPE_ICON[coupon.couponType]}</RowTile>}
      title={
        <>
          <code className="font-mono text-base font-bold tracking-tight text-ink">
            {coupon.couponCode}
          </code>
          <CopyButton value={coupon.couponCode} label="coupon code" />
          <CouponStatusBadge status={coupon.status} />
        </>
      }
      subtitle={coupon.campaignName}
      meta={
        <>
          <span>Issued {formatWhen(coupon.issuedAt)}</span>
          {coupon.customerId && <span className="opacity-70">· {coupon.customerId}</span>}
          {coupon.redemptionCount > 0 && (
            <span className="rounded-full bg-cream px-2 py-0.5 tabular-nums">
              used ×{coupon.redemptionCount}
            </span>
          )}
        </>
      }
      trailing={
        // Two columns rather than one: what the coupon is worth and when it
        // stops being worth it are the two questions asked of this list, and
        // side by side they fill the card instead of hugging its right edge.
        <div className="flex items-center gap-8">
          <div className="w-44 text-left">
            {isValue ? (
              <ValueBar original={coupon.originalAmount} remaining={coupon.remainingBalance} />
            ) : (
              <>
                <p className="truncate text-sm font-semibold text-ink">
                  {coupon.productName ?? 'Item off the menu'}
                </p>
                <p className="mt-1.5 text-xs text-ash">one free item</p>
              </>
            )}
          </div>

          {/* Wide enough for "04-Aug-2026, 4:59 am" on one line — broken over
              three it stops reading as a moment in time. */}
          <div className="w-48">
            <p className="text-xs text-ash">Expires</p>
            <p className="mt-1.5 whitespace-nowrap text-sm font-semibold tabular-nums text-charcoal">
              {formatDayTime(coupon.expiryDate)}
            </p>
            <p className="mt-1 text-xs text-ash">{relativeWhen(coupon.expiryDate)}</p>
          </div>
        </div>
      }
    />
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
