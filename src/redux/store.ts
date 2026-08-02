import { configureStore } from '@reduxjs/toolkit';
import settings from './slices/settingsSlice';
import categories from './slices/categoriesSlice';
import products from './slices/productsSlice';
import cart from './slices/cartSlice';
import payment from './slices/paymentSlice';
import orders from './slices/ordersSlice';
import catalogAdmin from './slices/catalogAdminSlice';
import campaigns from './slices/campaignsSlice';
import coupons from './slices/couponsSlice';
import couponRedemption from './slices/couponRedemptionSlice';

export const store = configureStore({
  reducer: {
    settings, categories, products, cart, payment, orders,
    // The menu, twice over: `categories`/`products` are what the kiosk shows a
    // customer, `catalogAdmin` is the same tables as the back office maintains
    // them — inactive rows and all.
    catalogAdmin,
    // Coupons split three ways: the two admin slices are back office, while
    // couponRedemption is the coupon the customer is spending right now.
    campaigns, coupons, couponRedemption,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
