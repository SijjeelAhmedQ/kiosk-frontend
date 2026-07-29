import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setActiveCategory } from '@/redux/slices/categoriesSlice';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { cn } from '@/utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * Vertical category rail. Collapsed it is a strip of tiles (icon over label);
 * expanded it becomes a labelled list for anyone who wants to read rather than
 * recognise.
 */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const dispatch = useAppDispatch();
  const { items, activeId } = useAppSelector((s) => s.categories);

  return (
    <aside
      className={cn(
        'no-scrollbar flex shrink-0 flex-col gap-2 overflow-y-auto bg-paper px-3 py-4 transition-[width] duration-300 ease-smooth',
        collapsed ? 'w-[124px]' : 'w-[268px]',
      )}
    >
      {items.map((c) => (
        <CategoryCard
          key={c.id}
          category={c}
          active={c.id === activeId}
          collapsed={collapsed}
          onSelect={(id) => dispatch(setActiveCategory(id))}
        />
      ))}

      {/* Anchored at the bottom of the rail so it never competes with the categories. */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Show category names' : 'Shrink to icons'}
        title={collapsed ? 'Show category names' : 'Shrink to icons'}
        className={cn(
          'press mt-auto flex shrink-0 items-center gap-3 rounded-2xl bg-cream text-ash transition-colors hover:text-ink',
          collapsed ? 'h-12 justify-center' : 'h-12 px-4',
        )}
      >
        <Chevron className={cn('h-5 w-5 transition-transform duration-300 ease-spring', collapsed && 'rotate-180')} />
        {!collapsed && <span className="font-display text-kiosk-xs font-bold">Collapse</span>}
      </button>
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
