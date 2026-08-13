import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setMethod } from '@/redux/slices/paymentSlice';
import { selectCartSummary } from '@/redux/selectors';
import { OrderLayout } from '@/layouts/OrderLayout';
import { Button } from '@/components/common/Button';
import { StepBar } from '@/components/common/StepBar';
import { CouponEntry } from '@/components/controls/CouponEntry';
import { PAYMENT_METHODS, SETTLED_BY_COUPON } from '@/constants/order.constants';
import { couponDiscount } from '@/utils/couponDiscount';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';
import { PATHS } from '@/routes/paths';
import { dismissCouponNotice } from '@/redux/slices/couponRedemptionSlice';

const HINT: Record<string, string> = {
  counter: 'Pay the cashier when you collect',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { subtotal, tax, total, itemCount } = useAppSelector(selectCartSummary);
  const appliedCoupon = useAppSelector((s) => s.couponRedemption.applied);
  /* In the store rather than in component state: the voice picks a payment
     method through the same action, and a choice held locally would leave the
     screen showing one thing while the order carried another. */
  const method = useAppSelector((s) => s.payment.method);

  /* An estimate only — the server recomputes the draw when the coupon is
     redeemed, and caps it at what the order actually owes. Capping here too
     keeps the button from promising a discount bigger than the order. The
     server quotes a free item with its tax already on it. */
  const discount = couponDiscount(appliedCoupon, total);
  const dueNow = Math.max(0, total - discount);

  /* The coupon paid for the whole thing. Asking "how would you like to pay?"
     for nothing is a step that can only be got wrong, so the picker goes away
     and the order is placed on the spot. */
  const fullyCovered = Boolean(appliedCoupon) && dueNow === 0;

  const proceed = () => {
    /* An order still has to carry a method — the till records how it was
       settled either way, and a zero draw at the counter is what "the coupon
       paid for it" looks like in the day's takings. */
    const settleAs = fullyCovered ? SETTLED_BY_COUPON : method;
    if (!settleAs) return;
    dispatch(setMethod(settleAs));
    navigate(PATHS.payment);
  };

  useEffect(() => {
    dispatch(dismissCouponNotice());
  }, []);

  /* Pre-selected when Friends Kitchen only offers one way to pay — making the
     customer tap the single option just to enable the button is a step that
     carries no decision. */
  useEffect(() => {
    if (!method && PAYMENT_METHODS.length === 1) dispatch(setMethod(PAYMENT_METHODS[0].value));
  }, [method, dispatch]);

  return (
    <OrderLayout showSidebar={false} showBasket={false}>
      <div className="mx-auto flex h-full w-full max-w-[1400px] gap-8 p-8">
        <section className="flex min-w-0 flex-1 flex-col">
          <h1 className="font-display text-fk-2xl font-extrabold text-ink">Checkout</h1>
          <StepBar current={1} className="mt-4" />

          {fullyCovered ? (
            <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-6 rounded-xl3 bg-leaf-soft p-10 text-center animate-fade-in">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/70 text-[2.75rem] leading-none animate-pop-in">
                ✓
              </span>
              <div className="flex flex-col gap-3">
                <h2 className="font-display text-fk-lg font-extrabold text-leaf">
                  Nothing left to pay
                </h2>
                <p className="max-w-[28rem] text-fk-sm leading-relaxed text-leaf/80">
                  Your coupon covers this order in full, tax included. Place it and collect your
                  number — there is nothing to settle at the counter.
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-8 font-display text-fk-lg font-extrabold text-ink">
                How would you like to pay?
              </h2>
              {/* overflow-y-auto also clips the x-axis, so pull the box out and pad it
                  back in — otherwise the card shadow/ring is sliced off both edges. */}
              <div className="no-scrollbar -mx-4 mt-4 flex-1 space-y-3 overflow-y-auto px-4 pb-6 pt-2">
                {PAYMENT_METHODS.map((p) => {
                  const on = method === p.value;
                  return (
                    <button
                      key={p.value}
                      data-testid={`payment-method-${p.value}`}
                      onClick={() => dispatch(setMethod(p.value))}
                      className={cn(
                        'press flex w-full items-center gap-5 rounded-xl3 px-6 py-6 text-left transition-all duration-200 ease-smooth',
                        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10',
                        on ? 'bg-paper shadow-card ring-2 ring-ink' : 'bg-paper shadow-soft hover:shadow-card',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-fk-xl transition-colors duration-200',
                          on ? 'bg-flame-soft' : 'bg-mist',
                        )}
                      >
                        {p.icon}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-display text-fk-base font-extrabold text-ink">
                          {p.label}
                        </span>
                        <span className="mt-1 text-fk-xs text-ash">{HINT[p.value]}</span>
                      </span>
                      <span
                        className={cn(
                          'ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fk-xs font-bold transition-all duration-200 ease-spring',
                          on ? 'scale-110 bg-ink text-white' : 'bg-mist',
                        )}
                      >
                        {on && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="flex w-[420px] shrink-0 flex-col">
          <div className="sticky top-0 rounded-xl3 bg-paper p-7 shadow-card">
            <h2 className="font-display text-fk-lg font-extrabold text-ink">Summary</h2>

            <div className="mt-5 flex justify-between text-fk-sm text-ash">
              <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
              <span className="font-medium tabular-nums text-charcoal">{formatCurrency(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-fk-sm text-ash">
              <span>Tax</span>
              <span className="font-medium tabular-nums text-charcoal">{formatCurrency(tax)}</span>
            </div>

            {discount > 0 && (
              <div className="mt-2 flex justify-between text-fk-sm text-leaf animate-fade-in">
                <span>Coupon</span>
                <span className="font-medium tabular-nums">−{formatCurrency(discount)}</span>
              </div>
            )}

            <div className="my-5 h-px bg-mist" />

            <div className="flex items-baseline justify-between">
              <span className="font-display text-fk-lg font-bold text-ink">
                {discount > 0 ? 'To pay' : 'Total'}
              </span>
              <span className="flex items-baseline gap-3">
                {discount > 0 && (
                  <span className="font-display text-fk-base font-bold tabular-nums text-ash line-through">
                    {formatCurrency(total)}
                  </span>
                )}
                <span data-testid="checkout-due" className="font-display text-fk-2xl font-extrabold tabular-nums text-ink">
                  {formatCurrency(dueNow)}
                </span>
              </span>
            </div>

            <CouponEntry orderTotal={total} />

            <Button
              data-testid="checkout-proceed"
              size="xl"
              fullWidth
              className="mt-7"
              disabled={!fullyCovered && !method}
              onClick={proceed}
            >
              {fullyCovered
                ? 'Place order'
                : method
                  ? `Pay ${formatCurrency(dueNow)}`
                  : 'Pick a payment method'}
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
