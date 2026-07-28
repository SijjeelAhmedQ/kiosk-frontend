import type { Product, ModifierGroup, Modifier } from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';
import { USE_MOCK, mockDelay } from './config';
import { products, modifierGroups, modifiers } from '@/data/menu';

/** Groups plus every modifier inside them — one payload for the detail modal. */
export interface ProductModifiers {
  groups: ModifierGroup[];
  modifiers: Modifier[];
}

export const productApi = {
  getAll: async (): Promise<Product[]> => {
    if (USE_MOCK) return mockDelay(products);
    const { data } = await axiosClient.get<{ data: Product[] }>(ENDPOINTS.products);
    return data.data;
  },
  getById: async (id: string): Promise<Product | undefined> => {
    if (USE_MOCK) return mockDelay(products.find((p) => p.id === id));
    const { data } = await axiosClient.get<{ data: Product }>(ENDPOINTS.productDetail(id));
    return data.data;
  },
  getModifierGroups: async (ids: string[]): Promise<ModifierGroup[]> => {
    if (!ids.length) return [];
    if (USE_MOCK) return mockDelay(modifierGroups.filter((g) => ids.includes(g.id)));
    const { data } = await axiosClient.get<{ data: ModifierGroup[] }>(ENDPOINTS.modifierGroups, {
      params: { ids: ids.join(',') },
    });
    return data.data;
  },
  getModifiers: async (ids: string[]): Promise<Modifier[]> => {
    if (!ids.length) return [];
    if (USE_MOCK) return mockDelay(modifiers.filter((m) => ids.includes(m.id)));
    const { data } = await axiosClient.get<{ data: Modifier[] }>(ENDPOINTS.modifiers, {
      params: { ids: ids.join(',') },
    });
    return data.data;
  },
  /** Everything the product detail modal needs, in a single request. */
  getProductModifiers: async (productId: string): Promise<ProductModifiers> => {
    if (USE_MOCK) {
      const product = products.find((p) => p.id === productId);
      const groups = modifierGroups.filter((g) => product?.modifierGroupIds.includes(g.id));
      const wanted = new Set(groups.flatMap((g) => g.modifierIds));
      return mockDelay({ groups, modifiers: modifiers.filter((m) => wanted.has(m.id)) });
    }
    const { data } = await axiosClient.get<{ data: ProductModifiers }>(
      ENDPOINTS.productModifiers(productId),
    );
    return data.data;
  },
};
