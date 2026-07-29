import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { incrementLine, decrementLine, removeLine, clearCart } from '@/redux/slices/cartSlice';
import { selectCartLines, selectCartSummary, selectCartCount } from '@/redux/selectors';
import { BasketLine } from '@/components/cards/BasketLine';
import { Button } from '@/components/common/Button';
import { formatCurrency } from '@/utils/currency';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';

/**
 * The order, kept on screen the whole time the customer browses. Replaces the
 * old bottom summary bar: nothing is hidden behind a navigation step, so the
 * running total is always answerable at a glance.
 */
export function BasketPanel() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectCartLines);
  const count = useAppSelector(selectCartCount);
  const { subtotal, tax, total } = useAppSelector(selectCartSummary);

  // Cart lines snapshot the emoji only, so the photo comes from the live menu.
  const products = useAppSelector((s) => s.products.items);
  const artworkByProduct = useMemo(
    () => new Map(products.map((p) => [p.id, p.imgBase64 ?? null])),
    [products],
  );

  return (
    <aside className="flex w-[400px] shrink-0 flex-col bg-paper">
      <header className="flex items-center justify-between px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-kiosk-lg font-extrabold text-ink">Your order</h2>
          {count > 0 && (
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-ink px-2.5 font-display text-kiosk-xs font-bold text-white">
              <span key={count} className="animate-pop-in tabular-nums">{count}</span>
            </span>
          )}
        </div>
        {count > 0 && (
          <button
            onClick={() => dispatch(clearCart())}
            className="press rounded-full px-3 py-2 font-display text-kiosk-xs font-bold text-ash transition-colors hover:bg-flame-soft hover:text-flame"
          >
            Clear
          </button>
        )}
      </header>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-cream text-[2.75rem]">🛍️</div>
          <p className="font-display text-kiosk-base font-extrabold text-ink">Nothing added yet</p>
          <p className="text-kiosk-xs leading-relaxed text-ash">
            Tap any dish on the left and it will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-6 pb-4">
            {lines.map((l) => (
              <BasketLine
                key={l.lineId}
                line={l}
                imgBase64={artworkByProduct.get(l.productId)}
                onInc={(id) => dispatch(incrementLine(id))}
                onDec={(id) => dispatch(decrementLine(id))}
                onRemove={(id) => dispatch(removeLine(id))}
              />
            ))}
          </div>

          <footer className="shrink-0 px-6 pb-6 pt-4 shadow-bar">
            <div className="flex justify-between text-kiosk-sm text-ash">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums text-charcoal">{formatCurrency(subtotal)}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-kiosk-sm text-ash">
              <span>Tax ({(APP.taxRate * 100).toFixed(2)}%)</span>
              <span className="font-medium tabular-nums text-charcoal">{formatCurrency(tax)}</span>
            </div>

            <div className="my-4 h-px bg-mist" />

            <div className="flex items-baseline justify-between">
              <span className="font-display text-kiosk-base font-bold text-ink">Total</span>
              <span className="font-display text-kiosk-xl font-extrabold tabular-nums text-ink">
                {formatCurrency(total)}
              </span>
            </div>

            <Button size="xl" fullWidth className="mt-5" onClick={() => navigate(PATHS.checkout)}>
              Checkout
            </Button>
            <button
              onClick={() => navigate(PATHS.cart)}
              className="press mt-3 w-full rounded-full py-3 font-display text-kiosk-xs font-bold text-ash transition-colors hover:bg-cream hover:text-ink"
            >
              Review full order
            </button>
          </footer>
        </>
      )}
    </aside>
  );
}
