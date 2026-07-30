import type { OrderType, PaymentMethod } from '@/types';

export const ORDER_TYPES: { value: OrderType; label: string; icon: string }[] = [
  { value: 'dine_in', label: 'Dine In', icon: '🍽️' },
  { value: 'take_away', label: 'Take Away', icon: '🥡' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'counter', label: 'Pay at Counter', icon: '🧾' },
];

/**
 * Display only. The backend re-prices every line from the `MealUpcharge` row in
 * dbo.AppSettings when the order is placed, so this must be kept in step with
 * that setting or the kiosk quotes a price it does not charge.
 */
export const MEAL_UPGRADE_PRICE = 200;
