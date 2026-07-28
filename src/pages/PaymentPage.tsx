import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { processPayment, resetPayment } from '@/redux/slices/paymentSlice';
import { setPlacedOrder } from '@/redux/slices/ordersSlice';
import { clearCart } from '@/redux/slices/cartSlice';
import { selectCartLines, selectCartSummary } from '@/redux/selectors';
import { orderApi } from '@/services/api/orderApi';
import { Spinner } from '@/components/common/LoadingScreen';
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
  const [error, setError] = useState<string | null>(null);
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
        const result = await dispatch(processPayment({ orderNumber: placed.orderNumber, method }));

        if (processPayment.fulfilled.match(result) && result.payload.approved) {
          dispatch(setPlacedOrder(placed));
          dispatch(clearCart());
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
        <div className="text-[6rem]">⚠️</div>
        <div className="flex max-w-[720px] flex-col items-center gap-3 text-center">
          <h1 className="font-display text-kiosk-xl font-bold text-charcoal">Payment didn’t go through</h1>
          <p className="text-kiosk-base text-ash">{error}</p>
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
      <div className="text-[6rem]">{method === 'card' ? '💳' : method === 'wallet' ? '📱' : '🧾'}</div>
      <div className="flex flex-col items-center gap-4">
        <Spinner size={64} />
        <h1 className="font-display text-kiosk-xl font-bold text-charcoal">
          {status === 'processing' ? 'Processing payment…' : 'Please wait…'}
        </h1>
        <p className="text-kiosk-base text-ash">
          {method === 'counter' ? 'Confirming your order' : `Charging ${formatCurrency(total)} — follow the terminal`}
        </p>
      </div>
    </div>
  );
}
