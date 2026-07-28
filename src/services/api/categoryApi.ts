import type { Category } from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';
import { USE_MOCK, mockDelay } from './config';
import { categories } from '@/data/menu';

export const categoryApi = {
  getAll: async (): Promise<Category[]> => {
    if (USE_MOCK) return mockDelay(categories);
    const { data } = await axiosClient.get<{ data: Category[] }>(ENDPOINTS.categories);
    return data.data;
  },
};
