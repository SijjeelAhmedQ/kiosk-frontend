import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PlacedOrder } from '@/types';

interface OrdersState {
  current: PlacedOrder | null;
}

const initialState: OrdersState = { current: null };

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setPlacedOrder: (s, a: PayloadAction<PlacedOrder>) => { s.current = a.payload; },
    clearOrder: (s) => { s.current = null; },
  },
});

export const { setPlacedOrder, clearOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
