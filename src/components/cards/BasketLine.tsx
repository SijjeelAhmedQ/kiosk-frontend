import type { CartLine } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { QuantitySelector } from '@/components/controls/QuantitySelector';
import { ProductImage } from './ProductImage';

interface BasketLineProps {
  line: CartLine;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  /** The product's photo, looked up by the panel — cart lines only snapshot the emoji. */
  imgBase64?: string | null;
}

/**
 * The dense sibling of {@link CartItem}: same controls, sized for the ~400px
 * basket rail rather than a full page.
 */
export function BasketLine({ line, onInc, onDec, onRemove, imgBase64 }: BasketLineProps) {
  return (
    <div className="flex gap-3 rounded-2xl bg-cream p-3 animate-fade-in">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl2 bg-paper p-1.5">
        <ProductImage
          product={{ image: line.image, imgBase64 }}
          imgClassName="max-h-full max-w-full object-contain"
          fallbackClassName="text-[2rem] leading-none"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h4 className="min-w-0 font-display text-kiosk-sm font-extrabold leading-snug text-ink">
            {line.name}
            {line.isMeal && (
              <span className="ml-1.5 inline-block rounded-full bg-amber-soft px-2 py-0.5 align-middle text-[0.7rem] font-bold text-amber-dark">
                Meal
              </span>
            )}
          </h4>
          <button
            onClick={() => onRemove(line.lineId)}
            className="press -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-kiosk-xs text-ash transition-colors hover:bg-flame-soft hover:text-flame"
            aria-label="Remove item"
          >
            ✕
          </button>
        </div>

        {line.modifiers.length > 0 && (
          <p className="mt-0.5 truncate text-[0.8rem] text-ash">
            {line.modifiers.map((m) => m.name).join(' · ')}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantitySelector
            value={line.quantity}
            onChange={(n) => (n > line.quantity ? onInc(line.lineId) : onDec(line.lineId))}
            size="sm"
            min={1}
          />
          <span className="font-display text-kiosk-sm font-extrabold tabular-nums text-ink">
            {formatCurrency(line.lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
