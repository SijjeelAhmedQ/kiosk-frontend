export const ENDPOINTS = {
  categories: '/categories',
  products: '/products',
  productsByCategory: (id: string) => `/categories/${id}/products`,
  productDetail: (id: string) => `/products/${id}`,
  orders: '/orders',
  payments: '/payments',
} as const;
