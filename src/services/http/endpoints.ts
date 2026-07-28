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
} as const;
