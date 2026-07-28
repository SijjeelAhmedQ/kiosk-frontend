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

  const featured = items.filter((c) => c.featured);
  const rest = items.filter((c) => !c.featured);

  const renderCard = (c: (typeof items)[number]) => (
    <CategoryCard
      key={c.id}
      category={c}
      active={c.id === activeId}
      collapsed={collapsed}
      onSelect={(id) => dispatch(setActiveCategory(id))}
    />
  );

  return (
    <aside
      className={cn(
        'no-scrollbar flex shrink-0 flex-col gap-3 overflow-y-auto border-r border-mist bg-white p-3 transition-[width] duration-200',
        collapsed ? 'w-24' : 'w-64',
      )}
    >
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-end')}>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="press flex h-10 w-10 items-center justify-center rounded-xl2 text-ash transition-colors hover:bg-mist/50"
        >
          <Chevron className={cn('h-6 w-6 transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
      </div>

      {featured.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-mist">{featured.map(renderCard)}</div>
      )}

      <div className="divide-y divide-mist overflow-hidden rounded-lg border border-mist">
        {rest.map(renderCard)}
      </div>
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
