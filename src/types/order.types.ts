import type { CartLine } from './cart.types';

export type OrderType = 'dine_in' | 'take_away';
export type PaymentMethod = 'card' | 'wallet' | 'counter';
export type PaymentStatus = 'idle' | 'processing' | 'approved' | 'declined';

export interface OrderSummary {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;

  /** Taken off by coupons. Only moves once a coupon is redeemed after placing. */
  couponDiscount?: number;
  /** total - couponDiscount. This, not total, is what the payment charges. */
  amountDue?: number;
}

export type OrderStatus = 'placed' | 'paid' | 'payment_failed' | 'cancelled';

export interface PlacedOrder {
  /** Needed to redeem a coupon against the order just placed. */
  orderId: number;
  orderNumber: string;
  orderType: OrderType;
  lines: CartLine[];
  summary: OrderSummary;
  paymentMethod: PaymentMethod;
  placedAt: string;
  status?: OrderStatus;
}

/**
 * What the client posts to place an order.
 *
 * `summary` is sent for traceability only — the database re-prices the whole
 * cart from dbo.Products, so a tampered kiosk cannot change what is charged.
 */
export interface PlaceOrderInput {
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
  summary: OrderSummary;
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

/** Receipt line — carries the product's current photo, which lines do not store. */
export interface OrderLineDetail extends CartLine {
  imgBase64?: string | null;
}

/** A past order as the staff history screen shows it. */
export interface OrderDetail extends PlacedOrder {
  businessDate: string;
  taxRate: number;
  kioskId: string;
  lines: OrderLineDetail[];
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
  couponDiscount: number;
  amountDue: number;
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
