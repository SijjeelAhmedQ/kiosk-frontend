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
        <header className="flex items-start gap-5 border-b border-mist px-8 py-6">
          <div className="flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-cream">
            <span className="text-kiosk-xs text-ash">Order</span>
            <span className="font-display text-kiosk-xl font-extrabold text-ink">#{order.orderNumber}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('rounded-full px-3 py-1 font-display text-kiosk-xs font-bold', badge.className)}>
                {badge.label}
              </span>
              <span className="text-kiosk-sm text-ash">
                {order.orderType === 'dine_in' ? '🍽️ Dine in' : '🥡 Take away'}
              </span>
            </div>
            <p className="mt-2 text-kiosk-sm text-ash">
              {formatWhen(order.placedAt)} · {order.kioskId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-kiosk-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto px-8 py-6">
          <h3 className="font-display text-kiosk-base font-bold text-charcoal">Items</h3>
          <div className="mt-3 flex flex-col gap-3">
            {order.lines.map((line) => (
              <div key={line.lineId} className="flex gap-4 rounded-2xl border-2 border-mist bg-paper px-5 py-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl2 bg-mist/40 p-1.5">
                  <ProductImage
                    product={{ image: line.image, imgBase64: line.imgBase64 }}
                    imgClassName="max-h-full max-w-full object-contain"
                    fallbackClassName="text-[2.5rem] leading-none"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-kiosk-base font-bold text-charcoal">
                      {line.quantity}× {line.name}
                    </span>
                    {line.isMeal && (
                      <span className="rounded-full bg-amber-soft px-2 py-0.5 font-display text-kiosk-xs font-bold text-amber">
                        Meal
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-kiosk-xs text-ash">
                    {formatCurrency(line.basePrice)} base
                    {line.mealUpcharge > 0 && ` · +${formatCurrency(line.mealUpcharge)} meal`}
                  </div>

                  {line.modifiers.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {line.modifiers.map((m) => (
                        <li
                          key={m.modifierId}
                          className="rounded-full bg-cream px-3 py-1 text-kiosk-xs text-charcoal"
                        >
                          {m.name}
                          {m.priceDelta > 0 && ` +${formatCurrency(m.priceDelta)}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-kiosk-base font-bold text-ink">
                    {formatCurrency(line.lineTotal)}
                  </div>
                  <div className="text-kiosk-xs text-ash">{formatCurrency(line.unitPrice)} each</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border-2 border-mist bg-paper px-6 py-5">
            <Row label={`Subtotal · ${summary.itemCount} item${summary.itemCount === 1 ? '' : 's'}`} value={summary.subtotal} />
            <Row label={`Tax (${(order.taxRate * 100).toFixed(2)}%)`} value={summary.tax} />
            <div className="my-3 border-t border-mist" />
            <div className="flex items-baseline justify-between">
              <span className="font-display text-kiosk-lg font-bold text-charcoal">Total</span>
              <span className="font-display text-kiosk-xl font-bold text-flame">{formatCurrency(summary.total)}</span>
            </div>
          </div>

          <h3 className="mt-8 font-display text-kiosk-base font-bold text-charcoal">Payment</h3>
          {order.payments.length === 0 ? (
            <p className="mt-2 text-kiosk-sm text-ash">No payment attempt recorded yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {order.payments.map((p) => (
                <div
                  key={p.transactionRef}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border-2 border-mist bg-paper px-5 py-4"
                >
                  <span className="font-display text-kiosk-sm font-bold text-charcoal">
                    {p.method === 'card' ? '💳 Card' : p.method === 'wallet' ? '📱 Wallet' : '🧾 Counter'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 font-display text-kiosk-xs font-bold',
                      p.status === 'approved' ? 'bg-leaf/15 text-leaf' : 'bg-flame-soft text-flame',
                    )}
                  >
                    {p.status === 'approved' ? 'Approved' : 'Declined'}
                  </span>
                  <span className="text-kiosk-sm text-charcoal">{formatCurrency(p.amount)}</span>
                  <span className="ml-auto text-kiosk-xs text-ash">{formatWhen(p.processedAt)}</span>
                  <span className="w-full font-mono text-kiosk-xs text-ash">{p.transactionRef}</span>
                  {p.failureReason && (
                    <span className="w-full text-kiosk-xs text-flame">{p.failureReason}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-mist bg-cream px-8 py-5">
          <Button fullWidth onClick={onClose}>Close</Button>
        </footer>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-kiosk-sm text-ash">
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
