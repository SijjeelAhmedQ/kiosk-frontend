import type { OrderDetail } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { ProductImage } from '@/components/cards/ProductImage';
import { formatCurrency } from '@/utils/currency';
import { STATUS_STYLES, formatWhen } from '@/utils/orderDisplay';
import { cn } from '@/utils/cn';

interface Props {
  order: OrderDetail | null;
  onClose: () => void;
}

/** Read-only receipt for a past order: what was ordered, and how it was paid. */
export function OrderDetailModal({ order, onClose }: Props) {
  if (!order) return null;

  const badge = STATUS_STYLES[order.status ?? 'placed'];
  const { summary } = order;

  return (
    <Modal open onClose={onClose}>
      <div className="flex max-h-[88vh] flex-col">
        <header className="flex items-start gap-5 bg-paper px-8 pb-6 pt-7">
          <div className="flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-cream leading-none">
            <span className="text-fk-xs text-ash">Order</span>
            <span className="mt-1.5 font-display text-fk-xl font-extrabold tabular-nums text-ink">
              {order.orderNumber}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('rounded-full px-3.5 py-1 font-display text-fk-xs font-bold', badge.className)}>
                {badge.label}
              </span>
              <span className="text-fk-sm text-ash">
                {order.orderType === 'dine_in' ? '🍽️ Dine in' : '🥡 Take away'}
              </span>
            </div>
            <p className="mt-2 text-fk-sm text-ash">
              {formatWhen(order.placedAt)} · {order.terminalId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="press flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mist text-fk-base text-charcoal transition-colors hover:bg-ash/30"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto bg-cream px-8 py-6">
          <h3 className="font-display text-fk-base font-extrabold text-ink">Items</h3>
          <div className="mt-3 flex flex-col gap-3">
            {order.lines.map((line) => (
              <div key={line.lineId} className="flex gap-4 rounded-2xl bg-paper px-5 py-4 shadow-soft">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl2 p-1.5">
                  <ProductImage
                    product={{ image: line.image, imgBase64: line.imgBase64 }}
                    imgClassName="max-h-full max-w-full object-contain"
                    fallbackClassName="text-[2.5rem] leading-none"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-fk-base font-extrabold text-ink">
                      {line.quantity}× {line.name}
                    </span>
                    {line.isMeal && (
                      <span className="rounded-full bg-amber-soft px-2.5 py-0.5 font-display text-fk-xs font-bold text-amber-dark">
                        Meal
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-fk-xs text-ash">
                    {formatCurrency(line.basePrice)} base
                    {line.mealUpcharge > 0 && ` · +${formatCurrency(line.mealUpcharge)} meal`}
                  </div>

                  {line.modifiers.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {line.modifiers.map((m) => (
                        <li key={m.modifierId} className="rounded-full bg-cream px-3 py-1 text-fk-xs text-charcoal">
                          {m.name}
                          {m.priceDelta > 0 && ` +${formatCurrency(m.priceDelta)}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0 text-right leading-none">
                  <div className="font-display text-fk-base font-extrabold tabular-nums text-ink">
                    {formatCurrency(line.lineTotal)}
                  </div>
                  <div className="mt-1.5 text-fk-xs text-ash">{formatCurrency(line.unitPrice)} each</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-paper px-6 py-5 shadow-soft">
            <Row label={`Subtotal · ${summary.itemCount} item${summary.itemCount === 1 ? '' : 's'}`} value={summary.subtotal} />
            <Row label={`Tax (${(order.taxRate * 100).toFixed(2)}%)`} value={summary.tax} />
            {Boolean(summary.couponDiscount) && (
              <Row label="Coupon" value={-(summary.couponDiscount ?? 0)} />
            )}
            <div className="my-4 h-px bg-mist" />
            <div className="flex items-baseline justify-between">
              {/* Total is what the food cost; when a coupon was used, what was
                  charged is the smaller number underneath it. */}
              <span className="font-display text-fk-lg font-bold text-ink">
                {summary.couponDiscount ? 'Charged' : 'Total'}
              </span>
              <span className="flex items-baseline gap-3">
                {Boolean(summary.couponDiscount) && (
                  <span className="font-display text-fk-sm font-bold tabular-nums text-ash line-through">
                    {formatCurrency(summary.total)}
                  </span>
                )}
                <span className="font-display text-fk-xl font-extrabold tabular-nums text-ink">
                  {formatCurrency(summary.amountDue ?? summary.total)}
                </span>
              </span>
            </div>
          </div>

          <h3 className="mt-8 font-display text-fk-base font-extrabold text-ink">Payment</h3>
          {order.payments.length === 0 ? (
            <p className="mt-2 text-fk-sm text-ash">No payment attempt recorded yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {order.payments.map((p) => (
                <div
                  key={p.transactionRef}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-paper px-5 py-4 shadow-soft"
                >
                  <span className="font-display text-fk-sm font-bold text-charcoal">
                    {p.method === 'card' ? '💳 Card' : p.method === 'wallet' ? '📱 Wallet' : '🧾 Counter'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 font-display text-fk-xs font-bold',
                      p.status === 'approved' ? 'bg-leaf-soft text-leaf' : 'bg-flame-soft text-flame',
                    )}
                  >
                    {p.status === 'approved' ? 'Approved' : 'Declined'}
                  </span>
                  <span className="text-fk-sm tabular-nums text-charcoal">{formatCurrency(p.amount)}</span>
                  <span className="ml-auto text-fk-xs text-ash">{formatWhen(p.processedAt)}</span>
                  <span className="w-full font-mono text-fk-xs text-ash">{p.transactionRef}</span>
                  {p.failureReason && <span className="w-full text-fk-xs text-flame">{p.failureReason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="bg-paper px-8 py-5 shadow-bar">
          <Button fullWidth onClick={onClose}>Close</Button>
        </footer>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-0.5 text-fk-sm text-ash">
      <span>{label}</span>
      <span className="font-medium tabular-nums text-charcoal">{formatCurrency(value)}</span>
    </div>
  );
}
