import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { PaymentMethod, PaymentStatus } from '@/types';

interface PaymentState {
  method: PaymentMethod | null;
  status: PaymentStatus;
  error: string | null;
}

const initialState: PaymentState = { method: null, status: 'idle', error: null };

/** Simulated terminal auth. Replace with paymentApi.authorize() against the backend. */
export const processPayment = createAsyncThunk(
  'payment/process',
  async (method: PaymentMethod) => {
    await new Promise((r) => setTimeout(r, 2200));
    if (method === 'counter') return { approved: true } as const;
    return { approved: true } as const;
  },
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
