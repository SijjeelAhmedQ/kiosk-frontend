import type { CartLine } from './cart.types';

export type OrderType = 'dine_in' | 'take_away';
export type PaymentMethod = 'card' | 'wallet' | 'counter';
export type PaymentStatus = 'idle' | 'processing' | 'approved' | 'declined';

export interface OrderSummary {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface PlacedOrder {
  orderNumber: string;
  orderType: OrderType;
  lines: CartLine[];
  summary: OrderSummary;
  paymentMethod: PaymentMethod;
  placedAt: string;
}
