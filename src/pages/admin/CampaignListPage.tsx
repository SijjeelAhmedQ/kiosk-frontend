import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Campaign, CouponType } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  CAMPAIGN_PAGE_SIZE,
  clearCampaignError,
  deleteCampaign,
  fetchCampaigns,
  setCampaignActive,
  setCampaignPage,
  setCampaignQuery,
} from '@/redux/slices/campaignsSlice';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchBar } from '@/components/controls/SearchBar';
import {
  AlertBanner,
  CampaignStateBadge,
  type Column,
  CouponTypeBadge,
  DataTable,
  PageBody,
  PageHeader,
  Pagination,
} from '@/components/admin';
import { Modal } from '@/components/common/Modal';
import { formatCurrency } from '@/utils/currency';
import { formatDayTime } from '@/utils/couponDisplay';
import { cn } from '@/utils/cn';
import { ADMIN_PATHS } from '@/routes/paths';

type StatusFilter = 'all' | 'active' | 'inactive';
type TypeFilter = 'all' | CouponType;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'product', label: 'Product' },
  { value: 'value', label: 'Value' },
];

export default function CampaignListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, total, query, loading, saving, error } = useAppSelector((s) => s.campaigns);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  // Filters are held in the store so they survive opening a campaign and
  // coming back; this effect is the one place that pushes the local controls in.
  useEffect(() => {
    dispatch(
      setCampaignQuery({
        search: debouncedSearch || undefined,
        isActive: status === 'all' ? undefined : status === 'active',
        couponType: type === 'all' ? undefined : type,
      }),
    );
  }, [dispatch, debouncedSearch, status, type]);

  useEffect(() => {
    void dispatch(fetchCampaigns(query));
  }, [dispatch, query]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const result = await dispatch(deleteCampaign(pendingDelete.campaignId));
    // Only close on success — on a refusal the reason belongs on screen.
    if (deleteCampaign.fulfilled.match(result)) setPendingDelete(null);
  };

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-ink">{c.name}</p>
          {c.description && <p className="mt-0.5 truncate text-xs text-ash">{c.description}</p>}
        </div>
      ),
    },
    { key: 'type', header: 'Type', width: 'w-32', render: (c) => <CouponTypeBadge type={c.couponType} /> },
    { key: 'state', header: 'Status', width: 'w-32', render: (c) => <CampaignStateBadge state={c.state} /> },
    {
      key: 'window',
      header: 'Runs',
      width: 'w-52',
      render: (c) => (
        <span className="whitespace-nowrap text-xs text-ash">
          {formatDayTime(c.startDate)} → {formatDayTime(c.expiryDate)}
        </span>
      ),
    },
    {
      key: 'coupons',
      header: 'Coupons',
      align: 'right',
      width: 'w-32',
      render: (c) => (
        <span className="tabular-nums">
          <span className="font-semibold text-ink">{c.redeemedCount}</span>
          <span className="text-ash"> / {c.couponCount}</span>
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value left',
      align: 'right',
      width: 'w-36',
      render: (c) =>
        c.couponType === 'value' ? (
          <span className="tabular-nums font-semibold text-ink">
            {formatCurrency(c.remainingValue)}
          </span>
        ) : (
          <span className="text-ash">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-72',
      render: (c) => (
        // Row clicks open the editor, so every button here has to stop the event.
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <RowAction onClick={() => navigate(ADMIN_PATHS.campaignGenerate(c.campaignId))}>
            Generate
          </RowAction>
          <RowAction
            onClick={() =>
              void dispatch(setCampaignActive({ campaignId: c.campaignId, isActive: !c.isActive }))
            }
            disabled={saving}
          >
            {c.isActive ? 'Deactivate' : 'Activate'}
          </RowAction>
          <RowAction tone="danger" onClick={() => setPendingDelete(c)}>
            Delete
          </RowAction>
        </div>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Campaigns"
        subtitle="Every coupon belongs to a campaign. Deactivating one stops all of its coupons at once."
        actions={
          <Button size="md" onClick={() => navigate(ADMIN_PATHS.campaignNew)}>
            New campaign
          </Button>
        }
      />

      <AlertBanner message={error} onDismiss={() => dispatch(clearCampaignError())} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-[260px] flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search campaigns by name or description…"
          />
        </div>
        <FilterRow options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <FilterRow options={TYPE_FILTERS} value={type} onChange={setType} />
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(c) => c.campaignId}
        loading={loading}
        onRowClick={(c) => navigate(ADMIN_PATHS.campaignEdit(c.campaignId))}
        empty={
          <EmptyState
            icon="🎯"
            title={search || status !== 'all' || type !== 'all' ? 'No matching campaigns' : 'No campaigns yet'}
            message={
              search || status !== 'all' || type !== 'all'
                ? 'Try a different search or clear the filters.'
                : 'Create a campaign first — coupons are always issued against one.'
            }
            action={
              <Button size="md" onClick={() => navigate(ADMIN_PATHS.campaignNew)}>
                New campaign
              </Button>
            }
          />
        }
      />

      <Pagination
        total={total}
        limit={query.limit ?? CAMPAIGN_PAGE_SIZE}
        offset={query.offset ?? 0}
        onPageChange={(page) => dispatch(setCampaignPage(page))}
        noun="campaigns"
      />

      <Modal open={Boolean(pendingDelete)} size="md" onClose={() => setPendingDelete(null)}>
        <div className="flex flex-col gap-5 p-8">
          <h2 className="font-display text-xl font-extrabold text-ink">
            Delete “{pendingDelete?.name}”?
          </h2>
          <p className="text-sm leading-relaxed text-ash">
            This also deletes the {pendingDelete?.couponCount ?? 0} coupon(s) printed for it. If any
            of them have already been redeemed the campaign cannot be deleted at all — deactivate it
            instead, which stops redemption but keeps the history.
          </p>

          {/* A refusal from the API lands in `error`, so it shows up right here. */}
          <AlertBanner message={error} onDismiss={() => dispatch(clearCampaignError())} />

          <div className="flex justify-end gap-3">
            <Button size="md" variant="secondary" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button size="md" variant="danger" disabled={saving} onClick={() => void confirmDelete()}>
              {saving ? 'Deleting…' : 'Delete campaign'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageBody>
  );
}

function FilterRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1.5 rounded-full bg-paper p-1.5 shadow-soft">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'press rounded-full px-4 py-2 font-display text-xs font-bold transition-colors duration-150',
            option.value === value ? 'bg-ink text-white' : 'text-charcoal hover:bg-cream',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function RowAction({
  tone = 'default',
  disabled,
  onClick,
  children,
}: {
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'press rounded-full px-3.5 py-2 font-display text-xs font-bold transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger'
          ? 'bg-flame-soft text-flame hover:bg-flame hover:text-white'
          : 'bg-cream text-charcoal hover:bg-mist',
      )}
    >
      {children}
    </button>
  );
}
