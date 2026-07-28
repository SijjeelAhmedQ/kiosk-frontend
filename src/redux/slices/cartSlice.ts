import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartLine, CartLineDraft } from '@/types';
import { unitPriceOf, lineTotalOf } from '@/utils/priceCalculator';
import { uid } from '@/utils/id';

interface CartState {
  lines: CartLine[];
}

const initialState: CartState = { lines: [] };

const recompute = (line: CartLine): CartLine => {
  const unit = unitPriceOf(line.basePrice, line.mealUpcharge, line.modifiers);
  return { ...line, unitPrice: unit, lineTotal: lineTotalOf(unit, line.quantity) };
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addLine: (s, a: PayloadAction<CartLineDraft>) => {
      const draft = a.payload;
      const line: CartLine = recompute({
        ...draft,
        lineId: uid('line'),
        unitPrice: 0,
        lineTotal: 0,
      });
      s.lines.push(line);
    },
    incrementLine: (s, a: PayloadAction<string>) => {
      const line = s.lines.find((l) => l.lineId === a.payload);
      if (line) { line.quantity += 1; Object.assign(line, recompute(line)); }
    },
    decrementLine: (s, a: PayloadAction<string>) => {
      const idx = s.lines.findIndex((l) => l.lineId === a.payload);
      if (idx === -1) return;
      const line = s.lines[idx];
      if (line.quantity <= 1) { s.lines.splice(idx, 1); return; }
      line.quantity -= 1;
      Object.assign(line, recompute(line));
    },
    removeLine: (s, a: PayloadAction<string>) => {
      s.lines = s.lines.filter((l) => l.lineId !== a.payload);
    },
    clearCart: (s) => { s.lines = []; },
  },
});

export const { addLine, incrementLine, decrementLine, removeLine, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
