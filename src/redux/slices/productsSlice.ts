import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Product } from '@/types';
import { productApi } from '@/services/api/productApi';

interface ProductsState {
  items: Product[];
  loading: boolean;
  error: string | null;
  search: string;
}

const initialState: ProductsState = { items: [], loading: false, error: null, search: '' };

export const fetchProducts = createAsyncThunk('products/fetch', () => productApi.getAll());

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSearch: (s, a: { payload: string }) => { s.search = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchProducts.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchProducts.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
     .addCase(fetchProducts.rejected, (s, a) => { s.loading = false; s.error = a.error.message ?? 'Failed to load products'; });
  },
});

export const { setSearch } = productsSlice.actions;
export default productsSlice.reducer;
