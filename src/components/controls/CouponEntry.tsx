import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  clearCoupon,
  dismissCouponNotice,
  rejectCoupon,
  validateCoupon,
} from '@/redux/slices/couponRedemptionSlice';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/LoadingScreen';
import { COUPON_CODE_REQUIRED } from '@/utils/couponMessage';
import { couponDiscount } from '@/utils/couponDiscount';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';

/** Codes are printed uppercase with a dash; anything else is a slip on the keypad. */
const normalise = (raw: string): string =>
  raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);

interface CouponEntryProps {
  /** The order total the coupon is being checked against. */
  orderTotal: number;
}

/**
 * Coupon entry at checkout.
 *
 * Applying a coupon here only *validates* it — nothing is spent until the order
 * exists and PaymentPage redeems it. That is what makes "Back to order" safe.
 *
 * A product coupon is judged against the cart the customer actually built: it
 * applies only if one of the products it is valid for is already in there, and
 * comes back as "Coupon is not applicable." otherwise. Nothing is added to the
 * cart on the customer's behalf — a coupon that silently put a burger in the
 * order would be selling them the burger, not discounting one.
 */
export function CouponEntry({ orderTotal }: CouponEntryProps) {
  const dispatch = useAppDispatch();
  const { status, applied, notice } = useAppSelector((s) => s.couponRedemption);
  const [code, setCode] = useState('');

  const busy = status === 'validating';

  const apply = async () => {
    const couponCode = normalise(code).trim();
    if (busy) return;

    /* Enter on an empty field used to do nothing at all, which reads as a
       broken Friends Kitchen rather than a missing code. The button stays disabled — this
       is only for the keypad path. */
    if (!couponCode) {
      dispatch(rejectCoupon(COUPON_CODE_REQUIRED));
      return;
    }

    // The thunk reads the cart itself, so what gets validated is the live cart.
    const result = await dispatch(validateCoupon({ couponCode, orderAmount: orderTotal }));
    if (!validateCoupon.fulfilled.match(result) || !result.payload.valid) return;

    setCode('');
  };

  if (applied) {
    // The estimate was worked out against the total at the time it was applied;
    // the server caps the real draw at what the order owes, so cap the display
    // the same way rather than promising more than the order is worth.
    const discount = couponDiscount(applied, orderTotal);

    return (
      <div data-testid="coupon-applied" className="mt-5 rounded-2xl bg-leaf-soft p-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-fk-base leading-none">✓</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-fk-sm font-extrabold text-leaf">
              {applied.couponType === 'product'
                ? `${applied.productName ?? 'Free item'} is on us`
                : `Coupon applied — ${formatCurrency(discount)} off`}
            </p>
            <p className="mt-1 truncate font-mono text-fk-xs text-leaf/80">{applied.couponCode}</p>
            {/* Spelling out "tax included" because the free line still shows in
                the subtotal above — otherwise the discount looks short. */}
            {applied.couponType === 'product' && (
              <p className="mt-1.5 text-fk-xs text-leaf/80">
                {formatCurrency(discount)} off, tax included
              </p>
            )}
            {applied.couponType === 'value' && applied.remainingBalance !== null && (
              <p className="mt-1.5 text-fk-xs text-leaf/80">
                {formatCurrency(Math.max(0, applied.remainingBalance - discount))} will be left on it
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearCoupon())}
            className="press shrink-0 rounded-full bg-white/60 px-4 py-2 font-display text-fk-xs font-bold text-leaf transition-colors hover:bg-white"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className="font-display text-fk-xs font-bold uppercase tracking-[0.1em] text-ash">
        Coupon
      </p>

      <div className="mt-2.5 flex gap-2.5">
        <div
          className={cn(
            'flex h-16 min-w-0 flex-1 items-center rounded-full bg-mist px-5 transition-all duration-200',
            'focus-within:bg-paper focus-within:shadow-card',
            /* The message below says what went wrong; the ring says where. The
               fill stays as it was — a field the customer is being asked to
               retype should still look like somewhere to type. */
            notice && 'ring-2 ring-flame/50',
          )}
        >
          <input
            data-testid="coupon-input"
            value={code}
            onChange={(e) => {
              setCode(normalise(e.target.value));
              if (notice) dispatch(dismissCouponNotice());
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') void apply(); }}
            placeholder="Enter code"
            aria-label="Coupon code"
            aria-invalid={Boolean(notice)}
            aria-describedby={notice ? 'coupon-notice' : undefined}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent font-mono text-fk-sm font-semibold uppercase tracking-wide text-charcoal outline-none placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ash"
          />
        </div>

        <Button
          data-testid="coupon-apply"
          size="md"
          variant="secondary"
          className="shrink-0"
          disabled={!code.trim() || busy}
          onClick={() => void apply()}
        >
          {busy ? <Spinner size={22} /> : 'Apply'}
        </Button>
      </div>

      {/* A refusal is read standing up, at arm's length, by someone who wants to
          get on with it: the reason large enough to read at a glance, and what
          to do about it directly under it. */}
      {notice && (
        <div
          id="coupon-notice"
          data-testid="coupon-notice"
          role="alert"
          className="mt-2.5 flex items-start gap-2.5 rounded-2xl bg-flame-soft px-4 py-3 animate-fade-in"
        >
          <span className="mt-0.5 text-fk-sm leading-none">⚠️</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-fk-sm font-bold text-flame-dark">{notice.title}</p>
            {notice.hint && (
              <p className="mt-1 text-fk-xs leading-snug text-flame-dark/80">{notice.hint}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
