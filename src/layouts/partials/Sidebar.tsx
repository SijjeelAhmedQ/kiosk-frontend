import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setActiveCategory } from '@/redux/slices/categoriesSlice';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { cn } from '@/utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const dispatch = useAppDispatch();
  const { items, activeId } = useAppSelector((s) => s.categories);

  return (
    <aside
      className={cn(
        'no-scrollbar flex shrink-0 flex-col gap-1 overflow-y-auto border-r border-mist bg-cream p-4 transition-[width] duration-200',
        collapsed ? 'w-24' : 'w-72',
      )}
    >
      <div className={cn('flex items-center pb-2 pt-1', collapsed ? 'justify-center' : 'justify-between px-2')}>
        {!collapsed && (
          <p className="font-display text-kiosk-xs font-bold uppercase tracking-wide text-ash">Menu</p>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="press flex h-10 w-10 items-center justify-center rounded-xl2 text-ash transition-colors hover:bg-mist/50"
        >
          <Chevron className={cn('h-6 w-6 transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
      </div>

      {items.map((c) => (
        <CategoryCard
          key={c.id}
          category={c}
          active={c.id === activeId}
          collapsed={collapsed}
          onSelect={(id) => dispatch(setActiveCategory(id))}
        />
      ))}
    </aside>
  );
}

// Points left (collapse); rotated 180° to point right (expand) when collapsed.
function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
