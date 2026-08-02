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
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 bg-cream animate-fade-in">
      {/* Shaped like the receipt the customer is about to be handed. */}
      <div className="relative w-[520px] overflow-hidden rounded-xl4 bg-paper shadow-card animate-slide-up">
        <div className="flex flex-col items-center gap-5 px-12 pb-10 pt-12">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-28 w-28 animate-ring-pulse rounded-full bg-leaf/25" />
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-leaf text-[2.75rem] text-white animate-pop-in">
              ✓
            </span>
          </div>
          <h1 className="font-display text-kiosk-xl font-extrabold text-ink">Order confirmed</h1>
          <p className="text-center text-kiosk-base text-ash">Thanks — your food is on the way</p>
        </div>

        {/* Perforation: notches punched out of both edges, dashes between. */}
        <div className="relative h-8">
          <span className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-cream" />
          <span className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-cream" />
          <span className="absolute inset-x-8 top-1/2 border-t-2 border-dashed border-mist" />
        </div>

        <div className="flex flex-col items-center gap-1 px-12 pb-12 pt-4">
          <span className="text-kiosk-xs uppercase tracking-[0.14em] text-ash">Your order number</span>
          <span className="my-2 font-display text-[5.5rem] font-extrabold leading-none tabular-nums text-flame">
            {order.orderNumber}
          </span>
          <span className="text-kiosk-sm text-ash">
            {formatCurrency(order.summary.amountDue ?? order.summary.total)} ·{' '}
            {order.summary.itemCount} item{order.summary.itemCount === 1 ? '' : 's'}
          </span>
          {Boolean(order.summary.couponDiscount) && (
            <span className="mt-1 text-kiosk-xs font-medium text-leaf">
              Coupon saved you {formatCurrency(order.summary.couponDiscount ?? 0)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button size="xl" onClick={finish} className="min-w-[360px]">
          Start new order
        </Button>
        <p className="text-kiosk-xs text-ash">Listen for your number at the counter</p>
      </div>
    </div>
  );
}
