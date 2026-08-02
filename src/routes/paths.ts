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

/**
 * Back office. Separate from PATHS because these screens are not part of the
 * customer's journey — they have their own layout, and no OrderTypeGuard.
 */
export const ADMIN_PATHS = {
  root: '/admin',

  // What the kiosk has sold.
  orders: '/admin/orders',

  // The menu.
  categories: '/admin/categories',
  categoryNew: '/admin/categories/new',
  categoryEdit: (id: string) => `/admin/categories/${encodeURIComponent(id)}`,
  products: '/admin/products',
  productNew: '/admin/products/new',
  productEdit: (id: string) => `/admin/products/${encodeURIComponent(id)}`,

  // Coupons.
  campaigns: '/admin/campaigns',
  campaignNew: '/admin/campaigns/new',
  campaignEdit: (id: number | string) => `/admin/campaigns/${id}`,
  campaignGenerate: (id: number | string) => `/admin/campaigns/${id}/generate`,
  coupons: '/admin/coupons',
  couponDetail: (code: string) => `/admin/coupons/${encodeURIComponent(code)}`,
  history: '/admin/history',
} as const;
