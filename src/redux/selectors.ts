import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { summarize } from '@/utils/priceCalculator';

export const selectCartLines = (s: RootState) => s.cart.lines;

export const selectCartSummary = createSelector(selectCartLines, (lines) => summarize(lines));

export const selectCartCount = createSelector(selectCartLines, (lines) =>
  lines.reduce((acc, l) => acc + l.quantity, 0),
);

export const selectProductsByCategory = (categoryId: string | null) =>
  createSelector(
    (s: RootState) => s.products.items,
    (s: RootState) => s.products.search,
    (items, search) => {
      const q = search.trim().toLowerCase();
      return items.filter((p) => {
        // "Featured Favorites" is a curated cross-category shelf, not a real categoryId.
        const inCat =
          categoryId === 'featured' ? p.badge === 'popular' : categoryId ? p.categoryId === categoryId : true;
        const inSearch = q ? p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) : true;
        return q ? inSearch : inCat;
      });
    },
  );
