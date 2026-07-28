import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { clearOrder } from '@/redux/slices/ordersSlice';
import { resetSession } from '@/redux/slices/settingsSlice';
import { Button } from '@/components/common/Button';
import { formatCurrency } from '@/utils/currency';
import { PATHS } from '@/routes/paths';

export default function OrderCompletePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const order = useAppSelector((s) => s.orders.current);

  const finish = () => {
    dispatch(clearOrder());
    dispatch(resetSession());
    navigate(PATHS.splash);
  };

  // auto-reset kiosk after 15s on the confirmation screen
  useEffect(() => {
    const t = setTimeout(finish, 15000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!order) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-cream">
        <p className="text-kiosk-lg text-ash">No recent order.</p>
        <Button onClick={() => navigate(PATHS.splash)}>Start over</Button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-8 overflow-hidden bg-ink text-white animate-fade-in">
      <div className="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-leaf/25 blur-[120px]" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-leaf text-[4rem] animate-scale-in">✓</div>
        <h1 className="font-display text-kiosk-2xl font-extrabold">Order confirmed</h1>
        <p className="text-kiosk-lg text-white/70">Thanks — your food is on the way</p>

        <div className="mt-4 flex flex-col items-center gap-1 rounded-xl3 bg-white/10 px-16 py-8">
          <span className="text-kiosk-sm text-white/60">Your order number</span>
          <span className="font-display text-kiosk-3xl font-extrabold text-amber">#{order.orderNumber}</span>
          <span className="mt-2 text-kiosk-base text-white/70">{formatCurrency(order.summary.total)} · {order.summary.itemCount} items</span>
        </div>
      </div>

      <Button size="xl" variant="secondary" onClick={finish} className="relative z-10 mt-4 min-w-[320px]">
        Start new order
      </Button>
    </div>
  );
}
