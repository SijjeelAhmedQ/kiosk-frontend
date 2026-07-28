import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OrderType } from '@/types';
import type { LanguageCode } from '@/constants/app.constants';

interface SettingsState {
  language: LanguageCode;
  orderType: OrderType | null;
}

const initialState: SettingsState = { language: 'en', orderType: null };

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage: (s, a: PayloadAction<LanguageCode>) => { s.language = a.payload; },
    setOrderType: (s, a: PayloadAction<OrderType>) => { s.orderType = a.payload; },
    resetSession: (s) => { s.orderType = null; },
  },
});

export const { setLanguage, setOrderType, resetSession } = settingsSlice.actions;
export default settingsSlice.reducer;
