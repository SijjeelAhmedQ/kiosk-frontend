import type { PaymentMethod } from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';
import { USE_MOCK, mockDelay } from './config';

export const paymentApi = {
  authorize: async (orderNumber: string, method: PaymentMethod): Promise<{ approved: boolean }> => {
    if (USE_MOCK) return mockDelay({ approved: true }, 1800);
    const { data } = await axiosClient.post<{ data: { approved: boolean } }>(ENDPOINTS.payments, {
      orderNumber,
      method,
    });
    return data.data;
  },
};
