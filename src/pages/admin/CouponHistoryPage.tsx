import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Campaign, CouponHistoryItem } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  COUPON_PAGE_SIZE,
  clearCouponError,
  fetchCouponHistory,
  setHistoryLimit,
  setHistoryPage,
  setHistoryQuery,
} from '@/redux/slices/couponsSlice';
import { campaignApi } from '@/services/api/campaignApi';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchBar } from '@/components/controls/SearchBar';
import {
  AlertBanner,
  CopyButton,
  CouponTypeBadge,
  DateRangeFilter,
  EmptyPanel,
  Field,
  ListRow,
  ListView,
  PageBody,
  PageHeader,
  Pagination,
  RowTile,
  Select,
  Stat,
  StatRow,
  Toolbar,
  type SelectOption,
} from '@/components/admin';
import { formatCurrency } from '@/utils/currency';
import { COUPON_TYPE_ICON } from '@/utils/couponDisplay';
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

  return (
    <PageBody fill>
      {/* Header, figures and filters hold their height; the log takes what is
          left and scrolls inside itself. */}
      <div className="shrink-0">
        <PageHeader
          eyebrow="Coupons"
          icon="📊"
          title="Redemptions"
          subtitle="Every time a coupon paid for something, newest first."
        />

        <AlertBanner message={error} onDismiss={() => dispatch(clearCouponError())} />

        {/* Two figures, not four — stretched over a four-column grid they read
            as a row that failed to load. */}
        <StatRow className="max-w-[34rem] grid-cols-2">
          <Stat
            icon="📊"
            label="Redemptions"
            value={String(historyTotal)}
            hint={filtered ? 'matching the filters' : 'since the kiosk opened'}
          />
          <Stat
            icon="💸"
            label="Value redeemed"
            value={formatCurrency(historyValue)}
            tone="text-leaf"
            hint="taken off customer bills"
          />
        </StatRow>

        <Toolbar>
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
        </Toolbar>
      </div>

      <ListView
        fill
        rows={history}
        rowKey={(h) => h.historyId}
        loading={historyLoading}
        renderRow={(h) => (
          <RedemptionCard
            item={h}
            onOpen={() => navigate(ADMIN_PATHS.couponDetail(h.couponCode))}
          />
        )}
        empty={
          <EmptyPanel
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

      <div className="shrink-0">
        <Pagination
          total={historyTotal}
          limit={historyQuery.limit ?? COUPON_PAGE_SIZE}
          offset={historyQuery.offset ?? 0}
          onPageChange={(page) => dispatch(setHistoryPage(page))}
          onLimitChange={(limit) => dispatch(setHistoryLimit(limit))}
        />
      </div>
    </PageBody>
  );
}

/**
 * One redemption as a card.
 *
 * A ledger entry, so the money leads on the right and the balance it left
 * behind sits under it — the two numbers are only meaningful together, which a
 * pair of columns at opposite ends of a wide table never quite managed.
 */
function RedemptionCard({ item, onOpen }: { item: CouponHistoryItem; onOpen: () => void }) {
  return (
    <ListRow
      accent="bg-leaf"
      openLabel={`Open coupon ${item.couponCode}`}
      onOpen={onOpen}
      lead={<RowTile>{COUPON_TYPE_ICON[item.couponType]}</RowTile>}
      title={
        <>
          <code className="font-mono text-base font-bold tracking-tight text-ink">
            {item.couponCode}
          </code>
          <CopyButton value={item.couponCode} label="coupon code" />
          <CouponTypeBadge type={item.couponType} />
          {item.orderNumber && (
            <span className="rounded-full bg-cream px-3 py-1 font-mono text-xs font-bold text-charcoal">
              #{item.orderNumber}
            </span>
          )}
        </>
      }
      subtitle={item.campaignName}
      meta={
        <>
          <span>{formatWhen(item.redeemedDate)}</span>
          <span className="opacity-70">· {item.terminalId}</span>
          {item.customerId && <span className="opacity-70">· {item.customerId}</span>}
        </>
      }
      trailing={
        // The amount and what it left behind are only meaningful together, so
        // they sit side by side and carry the width the card would otherwise
        // waste between the code and the far edge.
        <div className="flex items-center gap-10">
          <div className="w-48 text-left">
            <p className="text-xs text-ash">Balance after</p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-charcoal">
              {item.remainingBalance === null
                ? 'No balance to carry'
                : formatCurrency(item.remainingBalance)}
            </p>
          </div>

          <div className="w-32">
            <p className="text-xs text-ash">Redeemed</p>
            <p className="mt-1.5 font-display text-lg font-extrabold tabular-nums text-leaf">
              −{formatCurrency(item.redeemedAmount)}
            </p>
          </div>
        </div>
      }
    />
  );
}
