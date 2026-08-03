import type { AppliedCoupon } from '@/types';
import { APP } from '@/constants/app.constants';

/** Tax the kiosk adds on top of a shelf price — prices are all tax-exclusive. */
export const taxOn = (amount: number): number => Math.round(amount * APP.taxRate);

/**
 * What a coupon takes off this order.
 *
 * A product coupon means the item is *free*, not "free before tax". The API
 * reports its `applicableAmount` as the shelf price, and the cart taxes the free
 * line along with everything else — so the tax on that line has to come off with
 * it, or the customer is charged for something they were given.
 *
 * A value coupon is a wallet: it is worth its face value against the whole bill,
 * tax included, so nothing is added to it.
 *
 * Either way the result is capped at the order — a coupon never pays out change.
 */
export const couponDiscount = (
  applied: AppliedCoupon | null,
  orderTotal: number,
  /** What the server actually drew, once redemption has said so. */
  amount: number = applied?.applicableAmount ?? 0,
): number => {
  if (!applied) return 0;
  const off = applied.couponType === 'product' ? amount + taxOn(amount) : amount;
  return Math.min(off, orderTotal);
};
