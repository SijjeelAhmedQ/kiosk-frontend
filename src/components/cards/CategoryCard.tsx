import type { Category } from '@/types';
import { ProductImage } from './ProductImage';
import { cn } from '@/utils/cn';

interface CategoryCardProps {
  category: Category;
  active: boolean;
  onSelect: (id: string) => void;
  collapsed?: boolean;
}

export function CategoryCard({ category, active, onSelect, collapsed = false }: CategoryCardProps) {
  return (
    <button
      onClick={() => onSelect(category.id)}
      aria-label={category.name}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'press group shrink-0 transition-all duration-200 ease-smooth',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10',
        collapsed
          ? // Tile: icon over label, the whole tile is the target.
            'flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-3'
          : 'flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left',
        active ? 'bg-ink' : 'hover:bg-cream',
      )}
    >
      {/*
        No tile behind the artwork — just a sizing box. Selection is carried by
        the row itself, so the image needs no frame of its own.
      */}
      <span
        className={cn(
          'flex shrink-0 items-center justify-center',
          collapsed ? 'h-14 w-14 text-kiosk-lg' : 'h-12 w-12 text-kiosk-base',
        )}
      >
        {/* Inline artwork wins, then an image URL, then the emoji in `icon`. */}
        <ProductImage
          product={{ image: category.icon, imgBase64: category.imgBase64 || category.image }}
          imgClassName="max-h-full max-w-full object-contain"
        />
      </span>

      <span
        className={cn(
          'font-display transition-colors duration-200',
          collapsed
            ? // Two lines rather than an ellipsis — the rail is narrow enough that
              // "Sweets & Treats" truncated to "Sweets & Tr…" tells you nothing.
              'line-clamp-2 w-full break-words text-center text-[0.8rem] font-bold leading-tight'
            : 'truncate text-kiosk-sm font-bold',
          active ? 'text-white' : 'text-ash group-hover:text-ink',
        )}
      >
        {category.name}
      </span>
    </button>
  );
}
