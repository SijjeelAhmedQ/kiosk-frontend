import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { processPayment, resetPayment } from '@/redux/slices/paymentSlice';
import { setPlacedOrder } from '@/redux/slices/ordersSlice';
import { clearCart } from '@/redux/slices/cartSlice';
import { selectCartLines, selectCartSummary } from '@/redux/selectors';
import { orderApi } from '@/services/api/orderApi';
import { Spinner } from '@/components/common/LoadingScreen';
import { formatCurrency } from '@/utils/currency';
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

  useEffect(() => {
    if (!method || !orderType) { navigate(PATHS.checkout); return; }
    let cancelled = false;
    (async () => {
      const result = await dispatch(processPayment(method));
      if (cancelled) return;
      if (processPayment.fulfilled.match(result) && result.payload.approved) {
        const placed = await orderApi.place({ orderType, lines, summary, paymentMethod: method });
        dispatch(setPlacedOrder(placed));
        dispatch(clearCart());
        dispatch(resetPayment());
        navigate(PATHS.complete);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
