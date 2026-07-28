import type { Category } from '@/types';
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
      title={collapsed ? category.name : undefined}
      aria-label={category.name}
      className={cn(
        'press flex w-full items-center rounded-2xl text-left transition-colors',
        collapsed ? 'justify-center p-2' : 'gap-4 px-4 py-4',
        active ? 'bg-flame-soft' : 'hover:bg-mist/50',
      )}
    >
      <span
        className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl2 text-kiosk-lg',
          active ? 'bg-flame text-white' : 'bg-mist/60',
        )}
      >
        {category.icon}
      </span>
      {!collapsed && (
        <span className={cn('font-display text-kiosk-sm font-bold', active ? 'text-flame' : 'text-charcoal')}>
          {category.name}
        </span>
      )}
    </button>
  );
}
