import { configureStore } from '@reduxjs/toolkit';
import settings from './slices/settingsSlice';
import categories from './slices/categoriesSlice';
import products from './slices/productsSlice';
import cart from './slices/cartSlice';
import payment from './slices/paymentSlice';
import orders from './slices/ordersSlice';

export const store = configureStore({
  reducer: { settings, categories, products, cart, payment, orders },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
