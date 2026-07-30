import type { Product } from '@/types';
import { ProductImage } from './ProductImage';
import { PlusIcon } from '../common/icons';
import { formatCurrency, formatCalories } from '@/utils/currency';
import { cn } from '@/utils/cn';

const badgeStyle: Record<string, string> = {
  new: 'bg-ink text-white',
  popular: 'bg-amber text-ink',
  deal: 'bg-flame text-white',
};
const badgeLabel: Record<string, string> = { new: 'New', popular: 'Popular', deal: 'Deal' };

interface ProductCardProps {
  product: Product;
  onSelect: (p: Product) => void;
  /** Taller mosaic slot: bigger plate, and room for the description. */
  tall?: boolean;
}

export function ProductCard({ product, onSelect, tall = false }: ProductCardProps) {
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
            'absolute left-4 top-4 z-10 rounded-full px-3 py-1 font-display text-[0.78rem] font-bold uppercase tracking-wide',
            badgeStyle[product.badge],
          )}
        >
          {badgeLabel[product.badge]}
        </span>
      )}

      {/*
        The whole photo, never cropped — `contain` inside a padded box, so tall
        and wide artwork both fit rather than being masked to a shape.
      */}
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden',
          tall ? 'min-h-0 flex-1 p-6' : 'h-[186px] shrink-0 p-5',
        )}
      >
        <ProductImage
          product={product}
          imgClassName="max-h-full max-w-full object-contain transition-transform duration-500 ease-smooth group-hover:scale-[1.06]"
          fallbackClassName={cn(
            'leading-none transition-transform duration-500 ease-spring group-hover:scale-[1.12]',
            tall ? 'text-[6.5rem]' : 'text-[4.25rem]',
          )}
        />
      </div>

      <div
        className={cn(
          'flex flex-col',
          tall ? 'shrink-0 px-6 pb-6' : 'flex-1 px-5 pb-5',
        )}
      >
        <h3
          className={cn(
            'font-display font-extrabold leading-snug text-ink',
            tall ? 'line-clamp-2 text-kiosk-base' : 'line-clamp-1 text-kiosk-sm',
          )}
        >
          {product.name}
        </h3>

        {/* Clamped rather than dropped in the compact slot — it has room for two lines. */}
        <p
          className={cn(
            'line-clamp-2 text-ash',
            tall ? 'mt-2 text-kiosk-xs leading-relaxed' : 'mt-1.5 text-[0.85rem] leading-snug',
          )}
        >
          {product.description}
        </p>

        <div className={cn('mt-auto flex items-end justify-between gap-3', tall ? 'pt-5' : 'pt-3')}>
          <div className="flex min-w-0 flex-col">
            <span
              className={cn(
                'font-display font-extrabold leading-none text-ink',
                tall ? 'text-kiosk-lg' : 'text-kiosk-base',
              )}
            >
              {formatCurrency(product.price)}
            </span>
            <span className="mt-2 text-[0.8rem] text-ash">{formatCalories(product.calories)}</span>
          </div>

          {/* Explicit affordance — makes the whole card read as "tap to add". */}
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-amber text-ink',
              'shadow-brand transition-all duration-300 ease-spring group-hover:scale-110 group-hover:rotate-90',
              tall ? 'h-14 w-14' : 'h-12 w-12',
            )}
            aria-hidden="true"
          >
            <PlusIcon className={tall ? 'h-7 w-7' : 'h-6 w-6'} />
          </span>
        </div>
      </div>
    </button>
  );
}
