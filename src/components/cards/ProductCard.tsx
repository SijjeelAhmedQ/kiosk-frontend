import type { Product } from '@/types';
import { ProductImage } from './ProductImage';
import { formatCurrency, formatCalories } from '@/utils/currency';
import { cn } from '@/utils/cn';

const badgeStyle: Record<string, string> = {
  new: 'bg-ink text-white',
  popular: 'bg-amber text-ink',
  deal: 'bg-leaf text-white',
};
const badgeLabel: Record<string, string> = { new: 'New', popular: 'Popular', deal: 'Deal' };

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  return (
    <button
      onClick={() => onSelect(product)}
      className={cn(
        'press lift group relative flex h-full w-full flex-col overflow-hidden rounded-xl3 bg-paper text-left',
        'shadow-soft transition-all duration-300 ease-smooth hover:shadow-lift',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15',
      )}
    >
      {product.badge && (
        <span
          className={cn(
            'absolute left-5 top-5 z-10 rounded-full px-3.5 py-1.5 font-display text-kiosk-xs font-bold',
            badgeStyle[product.badge],
          )}
        >
          {badgeLabel[product.badge]}
        </span>
      )}

      {/*
        Most items ship an emoji rather than a photo, so both sit on the same
        round "plate". It gives the grid one silhouette instead of a mix of
        full-bleed photos and floating glyphs.
      */}
      <div className="relative flex h-[240px] shrink-0 items-center justify-center">
        <span className="absolute h-44 w-44 rounded-full bg-cream transition-transform duration-500 ease-spring group-hover:scale-105" />
        <ProductImage
          product={product}
          imgClassName="relative h-40 w-40 rounded-full object-cover shadow-soft transition-transform duration-500 ease-smooth group-hover:scale-[1.06]"
          fallbackClassName="relative text-[5.5rem] leading-none transition-transform duration-500 ease-spring group-hover:scale-[1.12]"
        />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6">
        <h3 className="line-clamp-2 min-h-[2.4em] font-display text-kiosk-base font-extrabold leading-snug text-ink">
          {product.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[2.7em] text-kiosk-xs leading-relaxed text-ash">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-kiosk-lg font-extrabold leading-none text-ink">
              {formatCurrency(product.price)}
            </span>
            <span className="mt-2 text-kiosk-xs text-ash">{formatCalories(product.calories)}</span>
          </div>

          {/* Explicit affordance — makes the whole card read as "tap to add". */}
          <span
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber text-[1.9rem] font-bold leading-none text-ink',
              'shadow-brand transition-all duration-300 ease-spring group-hover:scale-110 group-hover:rotate-90',
            )}
            aria-hidden="true"
          >
            +
          </span>
        </div>
      </div>
    </button>
  );
}
