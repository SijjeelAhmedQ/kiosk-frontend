import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setActiveCategory } from '@/redux/slices/categoriesSlice';
import { setSearch } from '@/redux/slices/productsSlice';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { PATHS } from '@/routes/paths';
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
  const navigate = useNavigate();
  const { items, activeId } = useAppSelector((s) => s.categories);
  /* A search spans every category, so leaving one tile lit says the grid is
     filtered to it when it is not. Nothing is selected while searching. */
  const searching = useAppSelector((s) => Boolean(s.products.search));

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
          active={!searching && c.id === activeId}
          collapsed={collapsed}
          /* Clearing the query is what makes the tap do something: while a
             search is running the grid ignores the category entirely, so
             picking one without this is a tap with no visible effect. */
          onSelect={(id) => {
            dispatch(setActiveCategory(id));
            dispatch(setSearch(''));
          }}
        />
      ))}

      {/* Anchored at the bottom of the rail so neither competes with the categories.
          Back sits above Collapse: leaving the menu is the rarer tap, but it is a
          navigation, and the toggle is only a view preference. */}
      <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-mist pt-3">
        <button
          onClick={() => navigate(PATHS.splash)}
          aria-label="Back to start"
          title="Back to start"
          className={cn(
            'press flex shrink-0 items-center gap-3 rounded-2xl bg-cream text-ash transition-colors hover:text-ink',
            collapsed ? 'h-12 justify-center' : 'h-12 px-4',
          )}
        >
          <ArrowLeft className="h-5 w-5" />
          {!collapsed && <span className="font-display text-fk-xs font-bold">Back</span>}
        </button>

        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Show category names' : 'Shrink to icons'}
          title={collapsed ? 'Show category names' : 'Shrink to icons'}
          className={cn(
            'press flex shrink-0 items-center gap-3 rounded-2xl bg-cream text-ash transition-colors hover:text-ink',
            collapsed ? 'h-12 justify-center' : 'h-12 px-4',
          )}
        >
          <Chevron className={cn('h-5 w-5 transition-transform duration-300 ease-spring', collapsed && 'rotate-180')} />
          {!collapsed && <span className="font-display text-fk-xs font-bold">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
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
