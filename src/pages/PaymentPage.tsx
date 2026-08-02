import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { processPayment, resetPayment } from '@/redux/slices/paymentSlice';
import { setPlacedOrder } from '@/redux/slices/ordersSlice';
import { clearCart } from '@/redux/slices/cartSlice';
import { clearCoupon, redeemCoupon } from '@/redux/slices/couponRedemptionSlice';
import { selectCartLines, selectCartSummary } from '@/redux/selectors';
import { orderApi } from '@/services/api/orderApi';
import { Button } from '@/components/common/Button';
import { formatCurrency } from '@/utils/currency';
import type { ApiError } from '@/types';
import { PATHS } from '@/routes/paths';

export default function PaymentPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const method = useAppSelector((s) => s.payment.method);
  const status = useAppSelector((s) => s.payment.status);
  const orderType = useAppSelector((s) => s.settings.orderType);
  const lines = useAppSelector(selectCartLines);
  const summary = useAppSelector(selectCartSummary);
  const { total } = summary;
  const coupon = useAppSelector((s) => s.couponRedemption);
  const [error, setError] = useState<string | null>(null);
  // What the terminal is being asked for, once any coupon has come off.
  const [charging, setCharging] = useState(
    total - (coupon.applied ? Math.min(coupon.applied.applicableAmount, total) : 0),
  );
  // Placing an order is not idempotent, and StrictMode runs effects twice in
  // dev — without this guard the customer is charged for two orders.
  const started = useRef(false);

  useEffect(() => {
    if (!method || !orderType) { navigate(PATHS.checkout); return; }
    if (started.current) return;
    started.current = true;

    // Deliberately no abort-on-unmount: money is in flight, so this has to run
    // to completion even though StrictMode unmounts and remounts the page.
    (async () => {
      try {
        // The order must exist before it can be paid for — the backend
        // authorizes against its order number.
        const placed = await orderApi.place({ orderType, lines, summary, paymentMethod: method });

        /* The coupon comes off between placing and paying, so the terminal is
           only ever asked for what is actually left. `status === 'applied'`
           means validated but not yet spent — the guard is what stops a retry
           after a declined payment from drawing the balance a second time. */
        let discount = 0;
        if (coupon.applied && coupon.status === 'applied') {
          const redemption = await dispatch(redeemCoupon({ orderId: placed.orderId }));
          if (redeemCoupon.fulfilled.match(redemption)) {
            discount = redemption.payload.redeemedAmount;
            setCharging(redemption.payload.amountDue);
          } else {
            // The coupon lapsed between checkout and here. Rather than strand
            // the customer, the order stands and the full amount is charged.
            setCharging(placed.summary.total);
          }
        }

        const result = await dispatch(processPayment({ orderNumber: placed.orderNumber, method }));

        if (processPayment.fulfilled.match(result) && result.payload.approved) {
          dispatch(
            setPlacedOrder({
              ...placed,
              // The order was placed before the coupon was applied, so its own
              // summary still says nothing was taken off. Correct it for the receipt.
              summary: {
                ...placed.summary,
                couponDiscount: discount,
                amountDue: placed.summary.total - discount,
              },
            }),
          );
          dispatch(clearCart());
          dispatch(clearCoupon());
          dispatch(resetPayment());
          navigate(PATHS.complete);
          return;
        }
        setError('Payment was declined. Please try a different method.');
      } catch (err) {
        setError((err as ApiError)?.message ?? 'We could not reach the till. Please try again.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-cream animate-fade-in">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-flame-soft text-[3.25rem] animate-pop-in">
          ⚠️
        </div>
        <div className="flex max-w-[720px] flex-col items-center gap-3 text-center">
          <h1 className="font-display text-kiosk-xl font-extrabold text-ink">Payment didn’t go through</h1>
          <p className="text-kiosk-base leading-relaxed text-ash">{error}</p>

          {/* The coupon was already spent against the order that failed, so it
              will not come off a second attempt. Say so rather than letting the
              customer discover it at the total. */}
          {coupon.status === 'redeemed' && (
            <p className="mt-2 rounded-2xl bg-amber-soft px-6 py-4 text-kiosk-sm leading-relaxed text-amber-dark">
              Your coupon <span className="font-mono font-bold">{coupon.applied?.couponCode}</span> was
              already applied to that order. Please ask a member of staff before trying again.
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <Button size="xl" variant="secondary" onClick={() => navigate(PATHS.cart)} className="min-w-[220px]">
            Back to cart
          </Button>
          <Button size="xl" onClick={() => { dispatch(resetPayment()); navigate(PATHS.checkout); }} className="min-w-[220px]">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 bg-cream animate-fade-in">
      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* concentric pulses stand in for "talking to the terminal" */}
        <span className="absolute h-32 w-32 animate-ring-pulse rounded-full bg-flame/20" />
        <span className="absolute h-32 w-32 animate-ring-pulse rounded-full bg-flame/20" style={{ animationDelay: '0.7s' }} />
        <span className="relative flex h-32 w-32 items-center justify-center rounded-full bg-paper text-[3.25rem] shadow-card">
          {method === 'card' ? '💳' : method === 'wallet' ? '📱' : '🧾'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-display text-kiosk-xl font-extrabold text-ink">
          {status === 'processing' ? 'Processing payment…' : 'Please wait…'}
        </h1>
        <p className="text-kiosk-base text-ash">
          {method === 'counter' ? 'Confirming your order' : `Charging ${formatCurrency(charging)} — follow the terminal`}
        </p>
        <span className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-mist">
          <span className="skeleton block h-full w-full rounded-full" />
        </span>
        <p className="mt-2 text-kiosk-xs text-ash">Please don’t leave this screen</p>
      </div>
    </div>
  );
}
