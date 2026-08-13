import type {
  CatalogDeleted,
  CategoryAdmin,
  CategoryCreateInput,
  CategoryUpdateInput,
  ProductAdmin,
  ProductAdminQuery,
  ProductCreateInput,
  ProductUpdateInput,
} from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';

/**
 * Menu maintenance. No mock branch, like campaignApi: the menu only exists in
 * the database, so a standalone Friends Kitchen has nothing to maintain.
 */
export const catalogAdminApi = {
  // ------------------------------------------------------------------------
  // Categories
  // ------------------------------------------------------------------------
  listCategories: async (): Promise<CategoryAdmin[]> => {
    const { data } = await axiosClient.get<{ data: CategoryAdmin[] }>(ENDPOINTS.adminCategories);
    return data.data;
  },

  getCategory: async (id: string): Promise<CategoryAdmin> => {
    const { data } = await axiosClient.get<{ data: CategoryAdmin }>(
      ENDPOINTS.adminCategoryDetail(id),
    );
    return data.data;
  },

  createCategory: async (input: CategoryCreateInput): Promise<CategoryAdmin> => {
    const { data } = await axiosClient.post<{ data: CategoryAdmin }>(
      ENDPOINTS.adminCategories,
      input,
    );
    return data.data;
  },

  updateCategory: async (id: string, input: CategoryUpdateInput): Promise<CategoryAdmin> => {
    const { data } = await axiosClient.put<{ data: CategoryAdmin }>(
      ENDPOINTS.adminCategoryDetail(id),
      input,
    );
    return data.data;
  },

  /** Refused by the API while the category still holds products. */
  deleteCategory: async (id: string): Promise<CatalogDeleted> => {
    const { data } = await axiosClient.delete<{ data: CatalogDeleted }>(
      ENDPOINTS.adminCategoryDetail(id),
    );
    return data.data;
  },

  // ------------------------------------------------------------------------
  // Products
  // ------------------------------------------------------------------------
  listProducts: async (query: ProductAdminQuery = {}): Promise<ProductAdmin[]> => {
    const { data } = await axiosClient.get<{ data: ProductAdmin[] }>(ENDPOINTS.adminProducts, {
      params: query,
    });
    return data.data;
  },

  getProduct: async (id: string): Promise<ProductAdmin> => {
    const { data } = await axiosClient.get<{ data: ProductAdmin }>(
      ENDPOINTS.adminProductDetail(id),
    );
    return data.data;
  },

  createProduct: async (input: ProductCreateInput): Promise<ProductAdmin> => {
    const { data } = await axiosClient.post<{ data: ProductAdmin }>(
      ENDPOINTS.adminProducts,
      input,
    );
    return data.data;
  },

  updateProduct: async (id: string, input: ProductUpdateInput): Promise<ProductAdmin> => {
    const { data } = await axiosClient.put<{ data: ProductAdmin }>(
      ENDPOINTS.adminProductDetail(id),
      input,
    );
    return data.data;
  },

  /** The list's on/off switch, without opening the whole form. */
  setProductActive: async (id: string, isActive: boolean): Promise<ProductAdmin> => {
    const { data } = await axiosClient.patch<{ data: ProductAdmin }>(
      ENDPOINTS.adminProductStatus(id),
      { isActive },
    );
    return data.data;
  },

  /** Refused once the product appears on an order line or a coupon. */
  deleteProduct: async (id: string): Promise<CatalogDeleted> => {
    const { data } = await axiosClient.delete<{ data: CatalogDeleted }>(
      ENDPOINTS.adminProductDetail(id),
    );
    return data.data;
  },
};
