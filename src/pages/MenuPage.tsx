import { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { addLine } from '@/redux/slices/cartSlice';
import { setSearch } from '@/redux/slices/productsSlice';
import { selectProductsByCategory } from '@/redux/selectors';
import { OrderLayout } from '@/layouts/OrderLayout';
import { ProductCard } from '@/components/cards/ProductCard';
import { SearchBar } from '@/components/controls/SearchBar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ProductDetailModal } from './ProductDetailModal';
import type { Product } from '@/types';

export default function MenuPage() {
  const dispatch = useAppDispatch();
  const { activeId, items: categories, loading } = useAppSelector((s) => s.categories);
  const productsLoading = useAppSelector((s) => s.products.loading);
  const search = useAppSelector((s) => s.products.search);
  const [active, setActive] = useState<Product | null>(null);

  const activeCategory = categories.find((c) => c.id === activeId);
  const visible = useAppSelector(useMemo(() => selectProductsByCategory(activeId), [activeId]));

  if (loading || productsLoading) {
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
          <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">
            {search ? 'Search results' : activeCategory?.name ?? 'Menu'}
          </h1>
          <div className="mt-4 flex items-center justify-between gap-6">
            <p className="shrink-0 text-kiosk-sm text-ash">
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
          <div className="grid grid-cols-3 gap-6 px-8 pb-8 pt-2">
            {visible.map((p, i) => (
              <div
                key={p.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <ProductCard product={p} onSelect={setActive} />
              </div>
            ))}
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
