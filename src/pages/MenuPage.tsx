import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { addLine } from '@/redux/slices/cartSlice';
import { fetchProducts, setSearch } from '@/redux/slices/productsSlice';
import { fetchCategories } from '@/redux/slices/categoriesSlice';
import { selectProductsByCategory } from '@/redux/selectors';
import { OrderLayout } from '@/layouts/OrderLayout';
import { ProductCard } from '@/components/cards/ProductCard';
import { SearchBar } from '@/components/controls/SearchBar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ProductDetailModal } from './ProductDetailModal';
import { cn } from '@/utils/cn';
import type { Product } from '@/types';

/**
 * Mosaic rhythm: every odd-numbered product — 1st, 3rd, 5th, 7th … — gets the
 * tall treatment. `index` is 0-based, so odd positions are the even indices.
 */
const isTallSlot = (index: number) => index % 2 === 0;

export default function MenuPage() {
  const dispatch = useAppDispatch();
  const { activeId, items: categories, loading } = useAppSelector((s) => s.categories);
  const productsLoading = useAppSelector((s) => s.products.loading);
  const productsLoaded = useAppSelector((s) => s.products.items.length > 0);
  const search = useAppSelector((s) => s.products.search);
  const [active, setActive] = useState<Product | null>(null);

  /**
   * The menu asks for its own data.
   *
   * The order-type screen used to fetch on the way past, which worked for
   * exactly as long as tapping it was the only way in. Voice sets the order
   * type and navigates straight here, and that landed on "Nothing here yet" —
   * so the fetch lives with the screen that needs it, and every door works.
   *
   * Decided at first render rather than inside the effect, so the first paint
   * is the spinner and not a momentary empty grid.
   */
  const [bootstrapping, setBootstrapping] = useState(() => !categories.length || !productsLoaded);

  const requested = useRef(false);
  useEffect(() => {
    if (requested.current || !bootstrapping) return;
    requested.current = true; // survives StrictMode's second mount, so the catalogue is fetched once
    // Anything already in flight — the splash screen's categories — counts as
    // asked for; dispatching over it would only run the same request twice.
    const pending = [
      categories.length || loading ? null : dispatch(fetchCategories()),
      productsLoaded || productsLoading ? null : dispatch(fetchProducts()),
    ].filter(Boolean);
    Promise.all(pending).finally(() => setBootstrapping(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCategory = categories.find((c) => c.id === activeId);
  const visible = useAppSelector(useMemo(() => selectProductsByCategory(activeId), [activeId]));

  if (bootstrapping || loading || productsLoading) {
    return (
      <OrderLayout showSidebar={false} showBasket={false}>
        <LoadingScreen label="Loading the menu…" />
      </OrderLayout>
    );
  }

  return (
    <OrderLayout>
      <div className="flex min-h-full flex-col">
        {/* Canvas header — title, count and search travel with the grid. */}
        <div className="glass sticky top-0 z-20 px-8 pb-5 pt-6">
          <h1 className="font-display text-fk-2xl font-extrabold text-ink">
            {search ? 'Search results' : activeCategory?.name ?? 'Menu'}
          </h1>
          <div className="mt-4 flex items-center justify-between gap-6">
            <p className="shrink-0 text-fk-sm text-ash">
              {visible.length} item{visible.length === 1 ? '' : 's'}
              {search ? ` matching “${search}”` : ' · tap to customise'}
            </p>
            <div className="w-[400px] shrink-0">
              <SearchBar value={search} onChange={(v) => dispatch(setSearch(v))} />
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="🔎" title="Nothing here yet" message="Try another category or clear your search." />
        ) : (
          // Fixed row unit + row spans give the mosaic; `dense` keeps the
          // tall cards from leaving holes further down the grid.
          <div className="grid auto-rows-[168px] grid-flow-row-dense grid-cols-3 gap-6 px-8 pb-8 pt-8">
            {visible.map((p, i) => {
              const tall = isTallSlot(i);
              return (
                <div
                  key={p.id}
                  className={cn('animate-slide-up', tall ? 'row-span-3' : 'row-span-2')}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <ProductCard product={p} onSelect={setActive} tall={tall} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProductDetailModal
        product={active}
        onClose={() => setActive(null)}
        onAdd={(draft) => dispatch(addLine(draft))}
      />
    </OrderLayout>
  );
}
