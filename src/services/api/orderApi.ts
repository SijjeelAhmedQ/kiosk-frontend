import type { PlacedOrder } from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';
import { USE_MOCK, mockDelay } from './config';

export const orderApi = {
  place: async (order: Omit<PlacedOrder, 'orderNumber' | 'placedAt'>): Promise<PlacedOrder> => {
    if (USE_MOCK) {
      const orderNumber = String(Math.floor(100 + Math.random() * 900));
      return mockDelay({ ...order, orderNumber, placedAt: new Date().toISOString() }, 600);
    }
    const { data } = await axiosClient.post<{ data: PlacedOrder }>(ENDPOINTS.orders, order);
    return data.data;
  },
};
