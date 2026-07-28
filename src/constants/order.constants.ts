import type { OrderType, PaymentMethod } from '@/types';

export const ORDER_TYPES: { value: OrderType; label: string; icon: string }[] = [
  { value: 'dine_in', label: 'Dine In', icon: '🍽️' },
  { value: 'take_away', label: 'Take Away', icon: '🥡' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { value: 'wallet', label: 'Mobile Wallet', icon: '📱' },
  { value: 'counter', label: 'Pay at Counter', icon: '🧾' },
];

export const MEAL_UPGRADE_PRICE = 1400;
