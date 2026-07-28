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

export type OrderStatus = 'placed' | 'paid' | 'payment_failed' | 'cancelled';

export interface PlacedOrder {
  orderNumber: string;
  orderType: OrderType;
  lines: CartLine[];
  summary: OrderSummary;
  paymentMethod: PaymentMethod;
  placedAt: string;
  status?: OrderStatus;
}

/** A payment attempt recorded against an order. */
export interface OrderPayment {
  method: PaymentMethod;
  status: 'approved' | 'declined';
  amount: number;
  transactionRef: string;
  failureReason: string | null;
  processedAt: string;
}

/** A past order as the staff history screen shows it. */
export interface OrderDetail extends PlacedOrder {
  orderId: number;
  businessDate: string;
  taxRate: number;
  kioskId: string;
  payments: OrderPayment[];
}

/** One row in the history list — enough to render without loading the lines. */
export interface OrderListItem {
  orderId: number;
  orderNumber: string;
  businessDate: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  kioskId: string;
  placedAt: string;
  itemsPreview: string;      // "2× Ember Stack, 1× Flame Fries"
}

export interface OrderListPage {
  items: OrderListItem[];
  total: number;             // orders matching the filter, ignoring paging
  revenue: number;
  limit: number;
  offset: number;
}

export interface OrderListQuery {
  from?: string;             // business date, inclusive (YYYY-MM-DD)
  to?: string;
  status?: OrderStatus;
  orderNumber?: string;
  limit?: number;
  offset?: number;
}
