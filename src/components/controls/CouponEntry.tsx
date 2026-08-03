import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { clearCoupon, dismissCouponReason, validateCoupon } from '@/redux/slices/couponRedemptionSlice';
import { addLine } from '@/redux/slices/cartSlice';
import { selectCartLines } from '@/redux/selectors';
import { productApi } from '@/services/api/productApi';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/LoadingScreen';
import { defaultLineModifiers } from '@/utils/modifierRules';
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
 * A product coupon adds its free item to the cart on the spot, per the spec. The
 * item goes in at full price and the redemption discounts it back off, so the
 * order lines still record what was actually served.
 */
export function CouponEntry({ orderTotal }: CouponEntryProps) {
  const dispatch = useAppDispatch();
  const { status, applied, reason, error } = useAppSelector((s) => s.couponRedemption);
  const cartLines = useAppSelector(selectCartLines);
  const [code, setCode] = useState('');

  const busy = status === 'validating';

  const apply = async () => {
    const couponCode = normalise(code).trim();
    if (!couponCode || busy) return;

    const result = await dispatch(validateCoupon({ couponCode, orderAmount: orderTotal }));
    if (!validateCoupon.fulfilled.match(result) || !result.payload.valid) return;

    const validation = result.payload;
    setCode('');

    // A product coupon is only worth anything if its item is in the order, so
    // put it there rather than making the customer go and find it.
    if (validation.couponType === 'product' && validation.productId) {
      const alreadyInCart = cartLines.some((line) => line.productId === validation.productId);
      if (!alreadyInCart) {
        // Nobody picks options for this one, so it has to arrive with whatever
        // its required groups demand — a free shake still needs a size, and the
        // order is refused outright without one.
        const options = await productApi
          .getProductModifiers(validation.productId)
          .catch(() => ({ groups: [], modifiers: [] }));

        dispatch(
          addLine({
            productId: validation.productId,
            name: validation.productName ?? 'Free item',
            image: validation.productImage ?? '',
            basePrice: validation.productPrice ?? 0,
            quantity: 1,
            isMeal: false,
            mealUpcharge: 0,
            modifiers: defaultLineModifiers(options.groups, options.modifiers),
          }),
        );
      }
    }
  };

  if (applied) {
    // The estimate was worked out against the total at the time it was applied;
    // the server caps the real draw at what the order owes, so cap the display
    // the same way rather than promising more than the order is worth.
    const discount = couponDiscount(applied, orderTotal);

    return (
      <div className="mt-5 rounded-2xl bg-leaf-soft p-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-kiosk-base leading-none">✓</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-kiosk-sm font-extrabold text-leaf">
              {applied.couponType === 'product'
                ? `${applied.productName ?? 'Free item'} is on us`
                : `Coupon applied — ${formatCurrency(discount)} off`}
            </p>
            <p className="mt-1 truncate font-mono text-kiosk-xs text-leaf/80">{applied.couponCode}</p>
            {/* Spelling out "tax included" because the free line still shows in
                the subtotal above — otherwise the discount looks short. */}
            {applied.couponType === 'product' && (
              <p className="mt-1.5 text-kiosk-xs text-leaf/80">
                {formatCurrency(discount)} off, tax included
              </p>
            )}
            {applied.couponType === 'value' && applied.remainingBalance !== null && (
              <p className="mt-1.5 text-kiosk-xs text-leaf/80">
                {formatCurrency(Math.max(0, applied.remainingBalance - discount))} will be left on it
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearCoupon())}
            className="press shrink-0 rounded-full bg-white/60 px-4 py-2 font-display text-kiosk-xs font-bold text-leaf transition-colors hover:bg-white"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className="font-display text-kiosk-xs font-bold uppercase tracking-[0.1em] text-ash">
        Coupon
      </p>

      <div className="mt-2.5 flex gap-2.5">
        <div
          className={cn(
            'flex h-16 min-w-0 flex-1 items-center rounded-full bg-mist px-5 transition-all duration-200',
            'focus-within:bg-paper focus-within:shadow-card',
          )}
        >
          <input
            value={code}
            onChange={(e) => {
              setCode(normalise(e.target.value));
              if (reason || error) dispatch(dismissCouponReason());
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') void apply(); }}
            placeholder="Enter code"
            aria-label="Coupon code"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent font-mono text-kiosk-sm font-semibold uppercase tracking-wide text-charcoal outline-none placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ash"
          />
        </div>

        <Button
          size="md"
          variant="secondary"
          className="shrink-0"
          disabled={!code.trim() || busy}
          onClick={() => void apply()}
        >
          {busy ? <Spinner size={22} /> : 'Apply'}
        </Button>
      </div>

      {(reason || error) && (
        <p role="alert" className="mt-2.5 flex items-start gap-2 text-kiosk-xs font-medium text-flame animate-fade-in">
          <span className="leading-none">⚠️</span>
          <span>{reason ?? error}</span>
        </p>
      )}
    </div>
  );
}
