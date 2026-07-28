import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setMethod } from '@/redux/slices/paymentSlice';
import { selectCartSummary } from '@/redux/selectors';
import { OrderLayout } from '@/layouts/OrderLayout';
import { Button } from '@/components/common/Button';
import { PAYMENT_METHODS } from '@/constants/order.constants';
import type { PaymentMethod } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';
import { PATHS } from '@/routes/paths';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { subtotal, tax, total, itemCount } = useAppSelector(selectCartSummary);
  const [method, setLocal] = useState<PaymentMethod | null>(null);

  const proceed = () => {
    if (!method) return;
    dispatch(setMethod(method));
    navigate(PATHS.payment);
  };

  return (
    <OrderLayout showSidebar={false} showCartBar={false}>
      <div className="mx-auto flex h-full w-full max-w-[900px] flex-col p-8">
        <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">Checkout</h1>

        <div className="mt-6 rounded-xl2 border-2 border-mist bg-paper p-6">
          <div className="flex justify-between text-kiosk-base text-ash"><span>{itemCount} items</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="mt-1 flex justify-between text-kiosk-base text-ash"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
          <div className="my-3 border-t border-mist" />
          <div className="flex justify-between">
            <span className="font-display text-kiosk-lg font-bold text-charcoal">Total</span>
            <span className="font-display text-kiosk-xl font-bold text-flame">{formatCurrency(total)}</span>
          </div>
        </div>

        <h2 className="mt-8 font-display text-kiosk-lg font-bold text-charcoal">Payment method</h2>
        <div className="mt-4 space-y-4">
          {PAYMENT_METHODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setLocal(p.value)}
              className={cn(
                'press flex w-full items-center gap-5 rounded-xl2 border-2 px-6 py-5 text-left transition-colors',
                method === p.value ? 'border-flame bg-flame-soft' : 'border-mist bg-paper',
              )}
            >
              <span className="text-kiosk-2xl">{p.icon}</span>
              <span className="font-display text-kiosk-base font-bold text-charcoal">{p.label}</span>
              <span className={cn('ml-auto flex h-8 w-8 items-center justify-center rounded-full border-2', method === p.value ? 'border-flame bg-flame text-white' : 'border-mist')}>
                {method === p.value && '✓'}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex gap-4 pt-8">
          <Button variant="secondary" size="xl" onClick={() => navigate(PATHS.cart)} className="min-w-[200px]">← Back</Button>
          <Button size="xl" fullWidth disabled={!method} onClick={proceed}>
            Pay {formatCurrency(total)} →
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}
