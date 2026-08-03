import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setMethod } from '@/redux/slices/paymentSlice';
import { selectCartSummary } from '@/redux/selectors';
import { OrderLayout } from '@/layouts/OrderLayout';
import { Button } from '@/components/common/Button';
import { StepBar } from '@/components/common/StepBar';
import { CouponEntry } from '@/components/controls/CouponEntry';
import { PAYMENT_METHODS } from '@/constants/order.constants';
import type { PaymentMethod } from '@/types';
import { couponDiscount } from '@/utils/couponDiscount';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';
import { PATHS } from '@/routes/paths';

const HINT: Record<string, string> = {
  counter: 'Pay the cashier when you collect',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { subtotal, tax, total, itemCount } = useAppSelector(selectCartSummary);
  const appliedCoupon = useAppSelector((s) => s.couponRedemption.applied);
  const [method, setLocal] = useState<PaymentMethod | null>(null);

  /* An estimate only — the server recomputes the draw when the coupon is
     redeemed, and caps it at what the order actually owes. Capping here too
     keeps the button from promising a discount bigger than the order. A free
     item comes off with its tax; see utils/couponDiscount. */
  const discount = couponDiscount(appliedCoupon, total);
  const dueNow = Math.max(0, total - discount);

  const proceed = () => {
    if (!method) return;
    dispatch(setMethod(method));
    navigate(PATHS.payment);
  };

  return (
    <OrderLayout showSidebar={false} showBasket={false}>
      <div className="mx-auto flex h-full w-full max-w-[1400px] gap-8 p-8">
        <section className="flex min-w-0 flex-1 flex-col">
          <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">Checkout</h1>
          <StepBar current={1} className="mt-4" />

          <h2 className="mt-8 font-display text-kiosk-lg font-extrabold text-ink">How would you like to pay?</h2>
          {/* overflow-y-auto also clips the x-axis, so pull the box out and pad it
              back in — otherwise the card shadow/ring is sliced off both edges. */}
          <div className="no-scrollbar -mx-4 mt-4 flex-1 space-y-3 overflow-y-auto px-4 pb-6 pt-2">
            {PAYMENT_METHODS.map((p) => {
              const on = method === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setLocal(p.value)}
                  className={cn(
                    'press flex w-full items-center gap-5 rounded-xl3 px-6 py-6 text-left transition-all duration-200 ease-smooth',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10',
                    on ? 'bg-paper shadow-card ring-2 ring-ink' : 'bg-paper shadow-soft hover:shadow-card',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-kiosk-xl transition-colors duration-200',
                      on ? 'bg-flame-soft' : 'bg-mist',
                    )}
                  >
                    {p.icon}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-kiosk-base font-extrabold text-ink">{p.label}</span>
                    <span className="mt-1 text-kiosk-xs text-ash">{HINT[p.value]}</span>
                  </span>
                  <span
                    className={cn(
                      'ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-kiosk-xs font-bold transition-all duration-200 ease-spring',
                      on ? 'scale-110 bg-ink text-white' : 'bg-mist',
                    )}
                  >
                    {on && '✓'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex w-[420px] shrink-0 flex-col">
          <div className="sticky top-0 rounded-xl3 bg-paper p-7 shadow-card">
            <h2 className="font-display text-kiosk-lg font-extrabold text-ink">Summary</h2>

            <div className="mt-5 flex justify-between text-kiosk-sm text-ash">
              <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
              <span className="font-medium tabular-nums text-charcoal">{formatCurrency(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-kiosk-sm text-ash">
              <span>Tax</span>
              <span className="font-medium tabular-nums text-charcoal">{formatCurrency(tax)}</span>
            </div>

            {discount > 0 && (
              <div className="mt-2 flex justify-between text-kiosk-sm text-leaf animate-fade-in">
                <span>Coupon</span>
                <span className="font-medium tabular-nums">−{formatCurrency(discount)}</span>
              </div>
            )}

            <div className="my-5 h-px bg-mist" />

            <div className="flex items-baseline justify-between">
              <span className="font-display text-kiosk-lg font-bold text-ink">
                {discount > 0 ? 'To pay' : 'Total'}
              </span>
              <span className="flex items-baseline gap-3">
                {discount > 0 && (
                  <span className="font-display text-kiosk-base font-bold tabular-nums text-ash line-through">
                    {formatCurrency(total)}
                  </span>
                )}
                <span className="font-display text-kiosk-2xl font-extrabold tabular-nums text-ink">
                  {formatCurrency(dueNow)}
                </span>
              </span>
            </div>

            <CouponEntry orderTotal={total} />

            <Button size="xl" fullWidth className="mt-7" disabled={!method} onClick={proceed}>
              {method ? `Pay ${formatCurrency(dueNow)}` : 'Pick a payment method'}
            </Button>
            <Button variant="secondary" size="lg" fullWidth className="mt-3" onClick={() => navigate(PATHS.cart)}>
              Back to order
            </Button>
          </div>
        </aside>
      </div>
    </OrderLayout>
  );
}
