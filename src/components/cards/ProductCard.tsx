import type { Product } from '@/types';
import { formatCurrency, formatCalories } from '@/utils/currency';
import { cn } from '@/utils/cn';

const badgeStyle: Record<string, string> = {
  new: 'bg-amber text-ink',
  popular: 'bg-amber text-ink',
  deal: 'bg-leaf text-white',
};
const badgeLabel: Record<string, string> = { new: 'New', popular: 'Popular', deal: 'Deal' };

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="press group relative flex flex-col items-center gap-3 rounded-xl2 bg-paper p-4 text-center transition-colors hover:bg-mist/30"
    >
      {product.protein != null ? (
        <span className="absolute left-2 top-2 z-10 rounded bg-amber px-2 py-1 text-center font-display text-kiosk-xs font-bold leading-tight text-ink">
          Protein
          <br />
          {product.protein}g
        </span>
      ) : (
        product.badge && (
          <span className={cn('absolute left-2 top-2 z-10 rounded px-2 py-1 font-display text-kiosk-xs font-bold leading-tight', badgeStyle[product.badge])}>
            {badgeLabel[product.badge]}
          </span>
        )
      )}
      <div className="flex h-40 items-center justify-center text-[5.5rem]">
        <span className="transition-transform duration-300 group-hover:scale-110">{product.image}</span>
      </div>
      {product.limitedTime && (
        <span className="font-display text-kiosk-xs font-bold uppercase tracking-tight text-flame">
          Limited Time Only
        </span>
      )}
      <h3 className="font-display text-kiosk-sm font-bold leading-tight text-charcoal">{product.name}</h3>
      <div className="flex items-center gap-2">
        <span className="font-display text-kiosk-sm font-bold text-flame">{formatCurrency(product.price)}</span>
        <span className="text-kiosk-xs text-ash">{formatCalories(product.calories)}</span>
      </div>
    </button>
  );
}
