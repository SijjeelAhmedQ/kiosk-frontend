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
      <OrderLayout showSidebar={false} showCartBar={false}>
        <LoadingScreen label="Loading the menu…" />
      </OrderLayout>
    );
  }

  return (
    <OrderLayout>
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between gap-6">
          <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">
            {search ? 'Search results' : activeCategory?.name ?? 'Menu'}
          </h1>
          <div className="w-[420px]">
            <SearchBar value={search} onChange={(v) => dispatch(setSearch(v))} />
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="🔎" title="Nothing here yet" message="Try another category or clear your search." />
        ) : (
          <div className="grid grid-cols-3 gap-6 pb-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onSelect={setActive} />
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
