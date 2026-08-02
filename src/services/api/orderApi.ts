import type {
  OrderDetail,
  OrderListPage,
  OrderListQuery,
  PlaceOrderInput,
  PlacedOrder,
} from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';
import { USE_MOCK, mockDelay } from './config';

const emptyPage: OrderListPage = { items: [], total: 0, revenue: 0, limit: 0, offset: 0 };

export const orderApi = {
  place: async (order: PlaceOrderInput): Promise<PlacedOrder> => {
    if (USE_MOCK) {
      const orderNumber = String(Math.floor(100 + Math.random() * 900));
      return mockDelay(
        { ...order, orderId: Number(orderNumber), orderNumber, placedAt: new Date().toISOString() },
        600,
      );
    }
    const { data } = await axiosClient.post<{ data: PlacedOrder }>(ENDPOINTS.orders, order);
    return data.data;
  },

  /** Order history, newest first. Omit the dates to search every day. */
  list: async (query: OrderListQuery = {}): Promise<OrderListPage> => {
    if (USE_MOCK) return mockDelay(emptyPage);   // history only exists in the database
    const { data } = await axiosClient.get<{ data: OrderListPage }>(ENDPOINTS.orders, {
      params: query,
    });
    return data.data;
  },

  /** Everything about one past order: lines, options and payment attempts. */
  getById: async (orderId: number): Promise<OrderDetail> => {
    const { data } = await axiosClient.get<{ data: OrderDetail }>(ENDPOINTS.orderDetail(orderId));
    return data.data;
  },
};
