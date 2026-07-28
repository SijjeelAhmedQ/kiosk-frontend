export const PATHS = {
  splash: '/',
  orderType: '/order-type',
  menu: '/menu',
  cart: '/cart',
  checkout: '/checkout',
  payment: '/payment',
  complete: '/complete',
  orders: '/orders',        // staff-facing order history
} as const;

export type PathKey = keyof typeof PATHS;
