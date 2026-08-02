export const ENDPOINTS = {
  categories: '/categories',
  products: '/products',
  productsByCategory: (id: string) => `/categories/${id}/products`,
  productDetail: (id: string) => `/products/${id}`,
  productModifiers: (id: string) => `/products/${id}/modifiers`,
  modifierGroups: '/modifier-groups',
  modifiers: '/modifiers',
  orders: '/orders',
  orderDetail: (orderId: number) => `/orders/${orderId}`,
  orderByNumber: (orderNumber: string) => `/orders/number/${orderNumber}`,
  payments: '/payments',

  /* Menu maintenance. Under /admin so the kiosk's own /categories and /products
     keep their shape — the admin list carries inactive rows, which would be a
     bug if the menu ever read it by accident. */
  adminCategories: '/admin/categories',
  adminCategoryDetail: (id: string) => `/admin/categories/${encodeURIComponent(id)}`,
  adminProducts: '/admin/products',
  adminProductDetail: (id: string) => `/admin/products/${encodeURIComponent(id)}`,
  adminProductStatus: (id: string) => `/admin/products/${encodeURIComponent(id)}/status`,

  // Campaigns — the admin side of coupon management.
  campaigns: '/campaigns',
  campaignDetail: (id: number) => `/campaigns/${id}`,
  campaignStatus: (id: number) => `/campaigns/${id}/status`,
  campaignCoupons: (id: number) => `/campaigns/${id}/coupons`,

  // Coupons. /history sits above /:code on the server, so a coupon can never
  // be codenamed "history" and shadow it.
  coupons: '/coupons',
  couponHistory: '/coupons/history',
  couponValidate: '/coupons/validate',
  couponRedeem: '/coupons/redeem',
  couponDetail: (code: string) => `/coupons/${encodeURIComponent(code)}`,
  couponCancel: (code: string) => `/coupons/${encodeURIComponent(code)}/cancel`,
} as const;
