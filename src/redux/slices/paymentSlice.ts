import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { PaymentMethod, PaymentStatus } from '@/types';
import { paymentApi } from '@/services/api/paymentApi';

interface PaymentState {
  method: PaymentMethod | null;
  status: PaymentStatus;
  error: string | null;
}

const initialState: PaymentState = { method: null, status: 'idle', error: null };

/** Authorizes an order that has already been placed — the backend needs its number. */
export const processPayment = createAsyncThunk(
  'payment/process',
  ({ orderNumber, method }: { orderNumber: string; method: PaymentMethod }) =>
    paymentApi.authorize(orderNumber, method),
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setMethod: (s, a: PayloadAction<PaymentMethod>) => { s.method = a.payload; },
    resetPayment: () => initialState,
  },
  extraReducers: (b) => {
    b.addCase(processPayment.pending, (s) => { s.status = 'processing'; s.error = null; })
     .addCase(processPayment.fulfilled, (s, a) => { s.status = a.payload.approved ? 'approved' : 'declined'; })
     .addCase(processPayment.rejected, (s, a) => { s.status = 'declined'; s.error = a.error.message ?? 'Payment failed'; });
  },
});

export const { setMethod, resetPayment } = paymentSlice.actions;
export default paymentSlice.reducer;
