import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CouponTransaction } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  cancelCoupon,
  clearCouponError,
  clearCurrentCoupon,
  fetchCoupon,
} from '@/redux/slices/couponsSlice';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/LoadingScreen';
import {
  AlertBanner,
  type Column,
  CouponStatusBadge,
  CouponTypeBadge,
  DataTable,
  Field,
  PageBody,
  PageHeader,
  Stat,
  TextInput,
} from '@/components/admin';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCurrency } from '@/utils/currency';
import { formatDay, relativeDay, spentFraction } from '@/utils/couponDisplay';
import { formatWhen } from '@/utils/orderDisplay';
import { ADMIN_PATHS } from '@/routes/paths';

const TRANSACTION_LABEL: Record<CouponTransaction['transactionType'], string> = {
  redeem: 'Redeemed',
  reverse: 'Reversed',
  cancel: 'Cancelled',
};

export default function CouponDetailPage() {
  const { couponCode = '' } = useParams<{ couponCode: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { current, currentTransactions, loading, saving, error } = useAppSelector((s) => s.coupons);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    dispatch(clearCouponError());
    void dispatch(fetchCoupon(couponCode));
    return () => { dispatch(clearCurrentCoupon()); };
  }, [dispatch, couponCode]);

  const confirmCancel = async () => {
    const result = await dispatch(cancelCoupon({ couponCode, note: note.trim() || undefined }));
    if (cancelCoupon.fulfilled.match(result)) {
      setCancelOpen(false);
      setNote('');
    }
  };

  if (loading && !current) {
    return (
      <PageBody>
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner size={52} />
        </div>
      </PageBody>
    );
  }

  if (!current) {
    return (
      <PageBody>
        <PageHeader title="Coupon" backTo={ADMIN_PATHS.coupons} />
        <AlertBanner message={error ?? 'That coupon could not be found.'} />
      </PageBody>
    );
  }

  const isValue = current.couponType === 'value';
  /* Terminal states cannot be cancelled — the API refuses, so the button goes
     rather than offering an action that will only fail. */
  const cancellable = current.status !== 'cancelled' && current.status !== 'fully_redeemed';

  const columns: Column<CouponTransaction>[] = [
    {
      key: 'when',
      header: 'When',
      width: 'w-52',
      render: (t) => <span className="whitespace-nowrap text-xs text-ash">{formatWhen(t.createdAt)}</span>,
    },
    {
      key: 'what',
      header: 'What',
      width: 'w-36',
      render: (t) => (
        <span className="font-display text-xs font-bold text-charcoal">
          {TRANSACTION_LABEL[t.transactionType]}
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      width: 'w-28',
      render: (t) =>
        t.orderNumber ? (
          <span className="font-mono text-sm text-ink">#{t.orderNumber}</span>
        ) : (
          <span className="text-ash">—</span>
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: 'w-32',
      render: (t) => (
        <span className="tabular-nums font-semibold text-ink">{formatCurrency(t.amount)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance after',
      align: 'right',
      width: 'w-36',
      render: (t) =>
        t.balanceAfter === null ? (
          <span className="text-ash">—</span>
        ) : (
          <span className="tabular-nums text-charcoal">{formatCurrency(t.balanceAfter)}</span>
        ),
    },
    {
      key: 'terminal',
      header: 'Terminal',
      width: 'w-32',
      render: (t) => <span className="text-xs text-ash">{t.terminalId}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title={current.couponCode}
        subtitle={
          <>
            from{' '}
            <button
              type="button"
              className="font-semibold text-charcoal underline-offset-2 hover:underline"
              onClick={() => navigate(ADMIN_PATHS.campaignEdit(current.campaignId))}
            >
              {current.campaignName}
            </button>
            {' · '}issued {formatWhen(current.issuedAt)}
          </>
        }
        backTo={ADMIN_PATHS.coupons}
        actions={
          <>
            <CouponTypeBadge type={current.couponType} />
            <CouponStatusBadge status={current.status} />
            {cancellable && (
              <Button size="md" variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel coupon
              </Button>
            )}
          </>
        }
      />

      <AlertBanner message={error} onDismiss={() => dispatch(clearCouponError())} />

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-xl3 bg-paper p-6 shadow-soft">
          {isValue ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-ash">Balance left</p>
                <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">
                  {formatCurrency(current.remainingBalance ?? 0)}
                </p>
                <p className="mt-1 text-sm text-ash">
                  of {formatCurrency(current.originalAmount ?? 0)} issued
                </p>
              </div>
              <span className="block h-2 w-full overflow-hidden rounded-full bg-mist">
                <span
                  className="block h-full rounded-full bg-amber transition-all duration-300"
                  style={{
                    width: `${Math.round((1 - spentFraction(current.originalAmount, current.remainingBalance)) * 100)}%`,
                  }}
                />
              </span>
            </>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-ash">Good for</p>
              <p className="mt-2 font-display text-xl font-extrabold text-ink">
                {current.productName ?? 'Item no longer on the menu'}
              </p>
              <p className="mt-1 text-sm text-ash">
                {current.productPrice !== null
                  ? `worth ${formatCurrency(current.productPrice)}`
                  : 'price unavailable'}
                {current.productIsActive === false && ' · currently off the menu'}
              </p>
            </div>
          )}

          <dl className="mt-2 flex flex-col gap-3 border-t border-mist pt-4 text-sm">
            <Row label="Expires">
              {formatDay(current.expiryDate)}
              <span className="ml-1.5 text-ash">({relativeDay(current.expiryDate)})</span>
            </Row>
            <Row label="Campaign window">
              {formatDay(current.campaignStartDate)} → {formatDay(current.campaignExpiryDate)}
            </Row>
            <Row label="Campaign active">{current.campaignIsActive ? 'Yes' : 'No'}</Row>
            <Row label="Times used">{current.redemptionCount}</Row>
            <Row label="First redeemed">
              {current.redeemedAt ? formatWhen(current.redeemedAt) : 'Never'}
            </Row>
            <Row label="Issued to">{current.customerId ?? 'Bearer'}</Row>
          </dl>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Redemptions" value={String(current.redemptionCount)} />
            <Stat
              label="Spent"
              value={formatCurrency((current.originalAmount ?? 0) - (current.remainingBalance ?? 0))}
              tone="text-leaf"
            />
            <Stat label="Stored status" value={current.storedStatus} />
          </div>

          <DataTable
            columns={columns}
            rows={currentTransactions}
            rowKey={(t) => t.transactionId}
            empty={
              <EmptyState
                icon="🧾"
                title="Never used"
                message="Nothing has been taken off this coupon yet."
              />
            }
          />
        </div>
      </div>

      <Modal open={cancelOpen} size="md" onClose={() => setCancelOpen(false)}>
        <div className="flex flex-col gap-5 p-8">
          <h2 className="font-display text-xl font-extrabold text-ink">
            Cancel {current.couponCode}?
          </h2>
          <p className="text-sm leading-relaxed text-ash">
            {isValue && (current.remainingBalance ?? 0) > 0
              ? `The ${formatCurrency(current.remainingBalance ?? 0)} left on it is forfeited. This cannot be undone, but the ledger will record exactly how much was written off.`
              : 'The coupon can no longer be redeemed. This cannot be undone.'}
          </p>

          <Field label="Reason" hint="Optional — stored against the ledger entry.">
            <TextInput
              value={note}
              maxLength={200}
              placeholder="Reported stolen"
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <AlertBanner message={error} onDismiss={() => dispatch(clearCouponError())} />

          <div className="flex justify-end gap-3">
            <Button size="md" variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep it
            </Button>
            <Button size="md" variant="danger" disabled={saving} onClick={() => void confirmCancel()}>
              {saving ? 'Cancelling…' : 'Cancel coupon'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageBody>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ash">{label}</dt>
      <dd className="text-right font-medium text-charcoal">{children}</dd>
    </div>
  );
}
