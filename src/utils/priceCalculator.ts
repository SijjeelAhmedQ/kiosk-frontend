import type { CartLine, CartLineModifier } from '@/types';
import { APP } from '@/constants/app.constants';

export const sumModifiers = (mods: CartLineModifier[]): number =>
  mods.reduce((acc, m) => acc + m.priceDelta, 0);

export const unitPriceOf = (
  basePrice: number,
  mealUpcharge: number,
  mods: CartLineModifier[],
): number => Math.round(basePrice + mealUpcharge + sumModifiers(mods));

export const lineTotalOf = (unitPrice: number, qty: number): number =>
  Math.round(unitPrice * qty);

export const summarize = (lines: CartLine[]) => {
  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const tax = Math.round(subtotal * APP.taxRate);
  const total = subtotal + tax;
  const itemCount = lines.reduce((acc, l) => acc + l.quantity, 0);
  return { subtotal, tax, total, itemCount };
};
