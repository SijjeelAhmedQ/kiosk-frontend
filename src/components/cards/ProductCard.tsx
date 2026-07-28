import type { Product } from '@/types';
import { formatCurrency, formatCalories } from '@/utils/currency';
import { cn } from '@/utils/cn';

const badgeStyle: Record<string, string> = {
  new: 'bg-amber text-ink',
  popular: 'bg-flame text-white',
  deal: 'bg-leaf text-white',
};
const badgeLabel: Record<string, string> = { new: 'New', popular: 'Popular', deal: 'Deal' };

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="press group relative flex flex-col overflow-hidden rounded-xl2 border-2 border-mist bg-paper text-left shadow-card transition-colors hover:border-flame/40"
    >
      {product.badge && (
        <span className={cn('absolute left-4 top-4 z-10 rounded-full px-4 py-1 font-display text-kiosk-xs font-bold', badgeStyle[product.badge])}>
          {badgeLabel[product.badge]}
        </span>
      )}
      <div className="flex h-44 items-center justify-center bg-gradient-to-b from-mist/40 to-cream text-[5.5rem]">
        <span className="transition-transform duration-300 group-hover:scale-110">{product.image}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <h3 className="font-display text-kiosk-base font-bold leading-tight text-charcoal">{product.name}</h3>
        <p className="line-clamp-2 text-kiosk-xs text-ash">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-kiosk-lg font-bold text-flame">{formatCurrency(product.price)}</span>
          <span className="text-kiosk-xs text-ash">{formatCalories(product.calories)}</span>
        </div>
      </div>
    </button>
  );
}
