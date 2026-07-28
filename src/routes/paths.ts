export const PATHS = {
  splash: '/',
  orderType: '/order-type',
  menu: '/menu',
  cart: '/cart',
  checkout: '/checkout',
  payment: '/payment',
  complete: '/complete',
} as const;

export type PathKey = keyof typeof PATHS;
