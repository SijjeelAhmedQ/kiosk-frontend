import type { ApiError, CouponValidation } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDay } from '@/utils/couponDisplay';

/**
 * What the customer is told when a coupon will not go on.
 *
 * Two parts, because a refusal is two facts: what happened, and what to do
 * about it. The server's own `reasonMessage` is one terse sentence written to
 * be correct rather than useful — "Coupon is not applicable." is true and tells
 * someone standing at a Friends Kitchen terminal nothing. The API also sends back the coupon, so
 * the same refusal can name the item, the date or the balance the customer
 * needs, and that is what turns it into an instruction.
 *
 * `hint` is left off when there is genuinely nothing the customer can do; a
 * made-up next step is worse than none.
 */
export interface CouponNotice {
  title: string;
  hint?: string;
}

/** Nothing on the menu is a "campaign" to the person paying. */
const OFFER_ENDED: CouponNotice = {
  title: 'This coupon is no longer being accepted.',
  hint: 'The offer behind it has ended. Please ask a member of staff.',
};

/** Shown when the field is empty — the button is disabled, Enter is not. */
export const COUPON_CODE_REQUIRED: CouponNotice = {
  title: 'Enter your coupon code first.',
  hint: 'It is printed on your coupon, like GIFT-3A9F2C10B4.',
};

/**
 * A rejected validation → what to show under the field.
 *
 * `orderTotal` is only needed by the balance case, which Friends Kitchen does not
 * normally reach: it validates with `allowPartial`, so a small coupon pays what
 * it can instead of being refused. Handled anyway — the flag is one call site
 * away from being turned off.
 */
export const couponRejection = (v: CouponValidation, orderTotal?: number): CouponNotice => {
  const item = v.productName;

  switch (v.reasonCode) {
    case 'COUPON_CODE_REQUIRED':
      return COUPON_CODE_REQUIRED;

    case 'COUPON_NOT_FOUND':
      return {
        // Echoing the code back is the whole point: nearly every one of these is
        // a mistyped character, and the customer cannot spot it in their head.
        title: `We don’t recognise the code ${v.couponCode}.`,
        hint: 'Check it against your coupon and enter it again.',
      };

    case 'COUPON_EXPIRED':
      return {
        title: v.expiryDate
          ? `This coupon expired on ${formatDay(v.expiryDate)}.`
          : 'This coupon has expired.',
        hint: 'Expired coupons cannot be used. You can carry on without one.',
      };

    case 'COUPON_CANCELLED':
      return {
        title: 'This coupon has been cancelled.',
        hint: 'Please ask a member of staff if you think that is wrong.',
      };

    case 'COUPON_ALREADY_REDEEMED':
      return {
        title:
          v.couponType === 'value'
            ? 'This coupon has already been spent in full — nothing is left on it.'
            : 'This coupon has already been used.',
        hint: 'You can carry on without a coupon.',
      };

    case 'CAMPAIGN_INACTIVE':
    case 'CAMPAIGN_EXPIRED':
      return OFFER_ENDED;

    case 'CAMPAIGN_NOT_STARTED':
      return {
        title: 'This coupon cannot be used yet.',
        hint: 'The offer it belongs to has not started. Check the dates on your coupon.',
      };

    case 'COUPON_PRODUCT_UNAVAILABLE':
      return {
        title: item ? `${item} is not available right now.` : 'The item this coupon is for is not available right now.',
        hint: 'The coupon will work again once it is back on the menu.',
      };

    /* The one refusal the customer can actually fix at the screen, so it says
       the item's name twice over: once as the reason, once as the instruction. */
    case 'COUPON_NOT_APPLICABLE':
      return item
        ? {
            title: `This coupon is for ${item}, and there is none in your order.`,
            hint: `Add ${item} to your order, then apply the coupon again.`,
          }
        : {
            title: 'This coupon does not cover anything in your order.',
            hint: 'Add the item it is for, then apply the coupon again.',
          };

    case 'INSUFFICIENT_COUPON_BALANCE':
      return {
        title:
          v.remainingBalance !== null && orderTotal
            ? `This coupon has ${formatCurrency(v.remainingBalance)} left, which does not cover the ${formatCurrency(orderTotal)} due.`
            : 'This coupon does not have enough left to cover this order.',
        hint: 'Please ask a member of staff.',
      };

    default:
      /* An unmapped code still gets the server's sentence rather than a shrug —
         the API is the newer of the two, so it may know a reason this does not. */
      return {
        title: v.reasonMessage ?? 'This coupon cannot be used on this order.',
        hint: 'Check the code, or carry on without a coupon.',
      };
  }
};

/**
 * A thrown request → what to show under the field.
 *
 * Separate from the above because these are failures, not verdicts: validation
 * answers `valid: false` with a reason, so anything that lands here is either
 * the network or a redemption that the server refused outright.
 */
export const couponFailure = (error: unknown, fallback: CouponNotice): CouponNotice => {
  const apiError = error as ApiError | undefined;

  switch (apiError?.code) {
    case 'COUPON_ALREADY_APPLIED':
      return { title: 'This coupon is already on this order.' };

    case 'ORDER_MISSING_COUPON_PRODUCT':
      return {
        title: 'The item this coupon is for is no longer in your order.',
        hint: 'Add it back, then apply the coupon again.',
      };

    case 'ORDER_ALREADY_PAID':
      return { title: 'This order has already been paid for.' };

    case 'COUPON_NOT_FOUND':
    case 'COUPON_EXPIRED':
    case 'COUPON_CANCELLED':
    case 'COUPON_ALREADY_REDEEMED':
    case 'CAMPAIGN_INACTIVE':
      /* The same conditions validation reports, arriving from the redeem call
         instead — the coupon lapsed between checkout and payment. */
      return { title: apiError.message, hint: 'You can carry on without a coupon.' };

    /* No code at all means it never reached the API. Say that plainly rather
       than blaming the coupon, which is very likely fine. */
    default:
      return apiError?.code ? { title: apiError.message ?? fallback.title, hint: fallback.hint } : fallback;
  }
};

/** The two Friends Kitchen falls back to when a request never got an answer. */
export const COUPON_CHECK_FAILED: CouponNotice = {
  title: 'We could not check that coupon just now.',
  hint: 'Please try again in a moment, or carry on without one.',
};

export const COUPON_REDEEM_FAILED: CouponNotice = {
  title: 'The coupon could not be applied to this order.',
  hint: 'Please ask a member of staff before trying again.',
};
