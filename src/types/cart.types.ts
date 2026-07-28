import type { Modifier } from './product.types';

export interface CartLineModifier {
  modifierId: string;
  name: string;
  priceDelta: number;
}

export interface CartLine {
  lineId: string;            // uuid per line (same product w/ diff mods = diff line)
  productId: string;
  name: string;
  image: string;
  basePrice: number;
  quantity: number;
  isMeal: boolean;
  mealUpcharge: number;
  modifiers: CartLineModifier[];
  unitPrice: number;         // basePrice + mealUpcharge + sum(modifiers)
  lineTotal: number;         // unitPrice * quantity
}

export type CartLineDraft = Omit<CartLine, 'lineId' | 'unitPrice' | 'lineTotal'> & {
  selectedModifiers?: Modifier[];
};
