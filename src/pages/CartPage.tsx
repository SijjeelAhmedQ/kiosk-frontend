import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { incrementLine, decrementLine, removeLine, clearCart } from '@/redux/slices/cartSlice';
import { selectCartLines, selectCartSummary } from '@/redux/selectors';
import { OrderLayout } from '@/layouts/OrderLayout';
import { CartItem } from '@/components/cards/CartItem';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { StepBar } from '@/components/common/StepBar';
import { formatCurrency } from '@/utils/currency';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectCartLines);
  const { subtotal, tax, total, itemCount } = useAppSelector(selectCartSummary);

  // Cart lines snapshot the emoji only, so the photo comes from the live menu.
  const products = useAppSelector((s) => s.products.items);
  const artworkByProduct = useMemo(
    () => new Map(products.map((p) => [p.id, p.imgBase64 ?? null])),
    [products],
  );

  if (lines.length === 0) {
    return (
      <OrderLayout showSidebar={false} showBasket={false}>
        <div className="flex h-full flex-col p-8">
          <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">Your order</h1>
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            message="Add something from the menu to get started."
            action={<Button size="lg" onClick={() => navigate(PATHS.menu)}>Browse menu</Button>}
          />
        </div>
      </OrderLayout>
    );
  }

  return (
    <OrderLayout showSidebar={false} showBasket={false}>
      {/* Items scroll on the left; the money stays pinned on the right. */}
      <div className="mx-auto flex h-full w-full max-w-[1400px] gap-8 p-8">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">Your order</h1>
              <StepBar current={0} className="mt-4" />
            </div>
            <button
              onClick={() => dispatch(clearCart())}
              className="press rounded-full bg-mist px-6 py-3 font-display text-kiosk-sm font-bold text-ash transition-colors hover:bg-flame-soft hover:text-flame"
            >
              Clear all
            </button>
          </div>

          <div className="no-scrollbar mt-6 flex-1 space-y-3.5 overflow-y-auto pb-4">
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
        </section>

        <aside className="flex w-[420px] shrink-0 flex-col">
          <div className="sticky top-0 rounded-xl3 bg-paper p-7 shadow-card">
            <h2 className="font-display text-kiosk-lg font-extrabold text-ink">Summary</h2>

            <div className="mt-5">
              <Row label={`Subtotal · ${itemCount} item${itemCount === 1 ? '' : 's'}`} value={formatCurrency(subtotal)} />
              <Row label={`Tax (${(APP.taxRate * 100).toFixed(2)}%)`} value={formatCurrency(tax)} />
            </div>

            <div className="my-5 h-px bg-mist" />
            <Row label="Total" value={formatCurrency(total)} strong />

            <Button size="xl" fullWidth className="mt-7" onClick={() => navigate(PATHS.checkout)}>
              Checkout
            </Button>
            <Button variant="secondary" size="lg" fullWidth className="mt-3" onClick={() => navigate(PATHS.menu)}>
              Add more items
            </Button>
          </div>
        </aside>
      </div>
    </OrderLayout>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className={cn(strong ? 'font-display text-kiosk-lg font-bold text-ink' : 'text-kiosk-sm text-ash')}>
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums',
          strong ? 'font-display text-kiosk-2xl font-extrabold text-ink' : 'text-kiosk-sm font-medium text-charcoal',
        )}
      >
        {value}
      </span>
    </div>
  );
}
