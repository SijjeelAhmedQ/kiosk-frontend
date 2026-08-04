import type { AppliedCoupon } from '@/types';

/**
 * What a coupon takes off this order.
 *
 * Both server amounts are already tax-inclusive: `applicableAmount` from
 * validation quotes the free item *with* its tax, and `redeemedAmount` is what
 * the redemption actually drew against a tax-inclusive order total. Nothing is
 * added here — a free item is free, and the database is what says by how much.
 *
 * All that is left is the cap: a coupon never pays out change.
 */
export const couponDiscount = (
  applied: AppliedCoupon | null,
  orderTotal: number,
  /** What the server actually drew, once redemption has said so. */
  amount: number = applied?.applicableAmount ?? 0,
): number => {
  if (!applied) return 0;
  return Math.min(Math.max(0, amount), orderTotal);
};
