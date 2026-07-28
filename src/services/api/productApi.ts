import type { Product, ModifierGroup, Modifier } from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';
import { USE_MOCK, mockDelay } from './config';
import { products, modifierGroups, modifiers } from '@/data/menu';

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
  // Modifiers ship with the menu payload in mock mode.
  getModifierGroups: async (ids: string[]): Promise<ModifierGroup[]> =>
    mockDelay(modifierGroups.filter((g) => ids.includes(g.id))),
  getModifiers: async (ids: string[]): Promise<Modifier[]> =>
    mockDelay(modifiers.filter((m) => ids.includes(m.id))),
};
