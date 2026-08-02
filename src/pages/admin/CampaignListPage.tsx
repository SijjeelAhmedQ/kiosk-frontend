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
  CouponTypeBadge,
  ListRow,
  ListView,
  PageBody,
  PageHeader,
  Pagination,
  RowTile,
} from '@/components/admin';
import { Modal } from '@/components/common/Modal';
import { formatCurrency } from '@/utils/currency';
import {
  CAMPAIGN_STATE_STYLES,
  COUPON_TYPE_ICON,
  formatDayTime,
  relativeWhen,
} from '@/utils/couponDisplay';
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

  return (
    <PageBody fill>
      {/* Header and filters hold their height; the list takes what is left and
          scrolls inside itself. */}
      <div className="shrink-0">
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
      </div>

      <ListView
        fill
        rows={items}
        rowKey={(c) => c.campaignId}
        loading={loading}
        renderRow={(c) => (
          <CampaignCard
            campaign={c}
            saving={saving}
            onOpen={() => navigate(ADMIN_PATHS.campaignEdit(c.campaignId))}
            onGenerate={() => navigate(ADMIN_PATHS.campaignGenerate(c.campaignId))}
            onToggleActive={() =>
              void dispatch(setCampaignActive({ campaignId: c.campaignId, isActive: !c.isActive }))
            }
            onDelete={() => setPendingDelete(c)}
          />
        )}
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

      <div className="shrink-0">
        <Pagination
          total={total}
          limit={query.limit ?? CAMPAIGN_PAGE_SIZE}
          offset={query.offset ?? 0}
          onPageChange={(page) => dispatch(setCampaignPage(page))}
        />
      </div>

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

interface CampaignCardProps {
  campaign: Campaign;
  saving: boolean;
  onOpen: () => void;
  onGenerate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

/**
 * One campaign as a card.
 *
 * The window is the thing an admin actually scans for now that it carries a
 * time, so it gets its own line rather than a column squeezed to `w-52` — and
 * the relative phrase beside it answers "is this the one running right now?"
 * without any date arithmetic in the reader's head.
 */
function CampaignCard({
  campaign,
  saving,
  onOpen,
  onGenerate,
  onToggleActive,
  onDelete,
}: CampaignCardProps) {
  const isValue = campaign.couponType === 'value';
  // How much of the campaign has been taken up — the one number that says
  // whether it is working, and the same bar language the coupon rows use.
  const redeemedFraction =
    campaign.couponCount > 0 ? campaign.redeemedCount / campaign.couponCount : 0;

  return (
    <ListRow
      accent={CAMPAIGN_STATE_STYLES[campaign.state].accent}
      openLabel={`Edit ${campaign.name}`}
      onOpen={onOpen}
      lead={<RowTile>{COUPON_TYPE_ICON[campaign.couponType]}</RowTile>}
      title={
        <>
          <p className="truncate font-display text-base font-extrabold text-ink">{campaign.name}</p>
          <CampaignStateBadge state={campaign.state} />
          <CouponTypeBadge type={campaign.couponType} />
        </>
      }
      subtitle={campaign.description || undefined}
      meta={
        <>
          <span>
            {formatDayTime(campaign.startDate)} → {formatDayTime(campaign.expiryDate)}
          </span>
          <span className="opacity-70">
            ({campaign.state === 'scheduled'
              ? `starts ${relativeWhen(campaign.startDate)}`
              : `ends ${relativeWhen(campaign.expiryDate)}`}
            )
          </span>
        </>
      }
      trailing={
        <div className="w-40">
          <p className="tabular-nums text-sm">
            <span className="font-display font-extrabold text-ink">{campaign.redeemedCount}</span>
            <span className="text-ash"> / {campaign.couponCount} redeemed</span>
          </p>
          <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-mist">
            <span
              className="block h-full rounded-full bg-leaf transition-all duration-300"
              style={{ width: `${Math.round(redeemedFraction * 100)}%` }}
            />
          </span>
          <p className="mt-2 text-xs text-ash">
            {isValue ? `${formatCurrency(campaign.remainingValue)} left` : 'No balance to carry'}
          </p>
        </div>
      }
      actions={
        <>
          <RowAction onClick={onGenerate}>Generate</RowAction>
          <RowAction onClick={onToggleActive} disabled={saving}>
            {campaign.isActive ? 'Deactivate' : 'Activate'}
          </RowAction>
          <RowAction tone="danger" onClick={onDelete}>
            Delete
          </RowAction>
        </>
      }
    />
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
