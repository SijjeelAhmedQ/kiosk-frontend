import type { CartLine } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { QuantitySelector } from '@/components/controls/QuantitySelector';
import { ProductImage } from './ProductImage';

interface CartItemProps {
  line: CartLine;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  /** The product's photo, looked up by the page — cart lines only snapshot the emoji. */
  imgBase64?: string | null;
}

export function CartItem({ line, onInc, onDec, onRemove, imgBase64 }: CartItemProps) {
  return (
    <div className="flex gap-5 rounded-xl3 bg-paper p-5 shadow-soft animate-fade-in">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream p-3">
        <ProductImage
          product={{ image: line.image, imgBase64 }}
          imgClassName="max-h-full max-w-full object-contain"
          fallbackClassName="text-[3.25rem] leading-none"
        />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-display text-fk-base font-extrabold text-ink">
              {line.name}
              {line.isMeal && (
                <span className="ml-2 inline-block rounded-full bg-amber-soft px-3 py-0.5 align-middle text-fk-xs font-bold text-amber-dark">
                  Meal
                </span>
              )}
            </h4>
            {line.modifiers.length > 0 && (
              <p className="mt-1.5 text-fk-xs leading-relaxed text-ash">
                {line.modifiers.map((m) => m.name).join(' · ')}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(line.lineId)}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ash transition-colors hover:bg-flame-soft hover:text-flame"
            aria-label="Remove item"
          >
            <TrashIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          <QuantitySelector
            value={line.quantity}
            onChange={(n) => (n > line.quantity ? onInc(line.lineId) : onDec(line.lineId))}
            size="md"
            min={1}
          />
          <span className="font-display text-fk-lg font-extrabold text-ink">
            {formatCurrency(line.lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}
