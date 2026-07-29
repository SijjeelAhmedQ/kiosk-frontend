import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { incrementLine, decrementLine, removeLine, clearCart } from '@/redux/slices/cartSlice';
import { selectCartLines, selectCartSummary } from '@/redux/selectors';
import { OrderLayout } from '@/layouts/OrderLayout';
import { CartItem } from '@/components/cards/CartItem';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCurrency } from '@/utils/currency';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectCartLines);
  const { subtotal, tax, total } = useAppSelector(selectCartSummary);

  // Cart lines snapshot the emoji only, so the photo comes from the live menu.
  const products = useAppSelector((s) => s.products.items);
  const artworkByProduct = useMemo(
    () => new Map(products.map((p) => [p.id, p.imgBase64 ?? null])),
    [products],
  );

  return (
    <OrderLayout showSidebar={false} showCartBar={false}>
      <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">Your order</h1>
          {lines.length > 0 && (
            <button onClick={() => dispatch(clearCart())} className="press font-display text-kiosk-sm font-bold text-ash">
              Clear all
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            message="Add something from the menu to get started."
            action={<Button size="lg" onClick={() => navigate(PATHS.menu)}>Browse menu</Button>}
          />
        ) : (
          <>
            <div className="no-scrollbar mt-6 flex-1 space-y-4 overflow-y-auto pb-4">
              {lines.map((l) => (
                <CartItem
                  key={l.lineId}
                  line={l}
                  imgBase64={artworkByProduct.get(l.productId)}
                  onInc={(id) => dispatch(incrementLine(id))}
                  onDec={(id) => dispatch(decrementLine(id))}
                  onRemove={(id) => dispatch(removeLine(id))}
                />
              ))}
            </div>

            <div className="mt-4 rounded-xl2 border-2 border-mist bg-paper p-6">
              <Row label="Subtotal" value={formatCurrency(subtotal)} />
              <Row label={`Tax (${(APP.taxRate * 100).toFixed(2)}%)`} value={formatCurrency(tax)} />
              <div className="my-3 border-t border-mist" />
              <Row label="Total" value={formatCurrency(total)} strong />
              <div className="mt-6 flex gap-4">
                <Button variant="secondary" size="xl" onClick={() => navigate(PATHS.menu)} className="min-w-[220px]">
                  ← Add more
                </Button>
                <Button size="xl" fullWidth onClick={() => navigate(PATHS.checkout)}>
                  Checkout →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </OrderLayout>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={strong ? 'font-display text-kiosk-lg font-bold text-charcoal' : 'text-kiosk-base text-ash'}>{label}</span>
      <span className={strong ? 'font-display text-kiosk-xl font-bold text-flame' : 'text-kiosk-base text-charcoal'}>{value}</span>
    </div>
  );
}
