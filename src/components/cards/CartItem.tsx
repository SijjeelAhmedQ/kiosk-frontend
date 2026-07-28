import type { CartLine } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { QuantitySelector } from '@/components/controls/QuantitySelector';

interface CartItemProps {
  line: CartLine;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ line, onInc, onDec, onRemove }: CartItemProps) {
  return (
    <div className="flex gap-4 rounded-xl2 border-2 border-mist bg-paper p-5">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-mist/40 text-[3rem]">
        {line.image}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-kiosk-base font-bold text-charcoal">
              {line.name}{line.isMeal && <span className="ml-2 rounded-full bg-amber-soft px-3 py-0.5 text-kiosk-xs font-bold text-amber">Meal</span>}
            </h4>
            {line.modifiers.length > 0 && (
              <p className="mt-1 text-kiosk-xs text-ash">{line.modifiers.map((m) => m.name).join(' · ')}</p>
            )}
          </div>
          <button onClick={() => onRemove(line.lineId)} className="press text-kiosk-base text-ash" aria-label="Remove item">🗑️</button>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <QuantitySelector value={line.quantity} onChange={(n) => (n > line.quantity ? onInc(line.lineId) : onDec(line.lineId))} size="md" min={1} />
          <span className="font-display text-kiosk-lg font-bold text-charcoal">{formatCurrency(line.lineTotal)}</span>
        </div>
      </div>
    </div>
  );
}
