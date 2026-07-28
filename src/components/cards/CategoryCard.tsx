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
        'press relative flex w-full items-center text-left transition-colors',
        collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3',
        active ? 'bg-flame-soft' : 'hover:bg-mist/40',
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-1 bg-flame" />}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center text-kiosk-lg">
        {category.icon}
      </span>
      {!collapsed && (
        <span className={cn('font-display text-kiosk-xs font-bold leading-snug', active ? 'text-flame' : 'text-charcoal')}>
          {category.name}
        </span>
      )}
    </button>
  );
}
