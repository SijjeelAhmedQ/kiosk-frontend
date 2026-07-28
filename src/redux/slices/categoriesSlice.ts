import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Category } from '@/types';
import { categoryApi } from '@/services/api/categoryApi';

interface CategoriesState {
  items: Category[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = { items: [], activeId: null, loading: false, error: null };

export const fetchCategories = createAsyncThunk('categories/fetch', () => categoryApi.getAll());

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setActiveCategory: (s, a: PayloadAction<string>) => { s.activeId = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchCategories.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchCategories.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
        if (!s.activeId && a.payload.length) s.activeId = a.payload[0].id;
      })
     .addCase(fetchCategories.rejected, (s, a) => { s.loading = false; s.error = a.error.message ?? 'Failed to load menu'; });
  },
});

export const { setActiveCategory } = categoriesSlice.actions;
export default categoriesSlice.reducer;
