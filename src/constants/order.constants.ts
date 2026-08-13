import type { OrderType, PaymentMethod } from '@/types';

export const ORDER_TYPES: { value: OrderType; label: string; icon: string }[] = [
  { value: 'dine_in', label: 'Dine In', icon: '🍽️' },
  { value: 'take_away', label: 'Take Away', icon: '🥡' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'counter', label: 'Pay at Counter', icon: '🧾' },
];

/**
 * What a fully-covered order is settled as.
 *
 * Nothing is charged, but the order still needs a method: 'counter' is the one
 * that means "no terminal was involved", which is exactly what happened. Shared
 * so the checkout screen and the voice settle such an order identically.
 */
export const SETTLED_BY_COUPON: PaymentMethod = 'counter';

/**
 * Display only. The backend re-prices every line from the `MealUpcharge` row in
 * dbo.AppSettings when the order is placed, so this must be kept in step with
 * that setting or Friends Kitchen quotes a price it does not charge.
 */
export const MEAL_UPGRADE_PRICE = 200;
