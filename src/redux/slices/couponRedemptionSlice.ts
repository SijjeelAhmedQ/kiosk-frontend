import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppliedCoupon, CartLine, CouponRedemption, CouponValidation } from '@/types';
import { couponApi } from '@/services/api/couponApi';
import { decrementLine, removeLine, clearCart } from '@/redux/slices/cartSlice';
import type { CouponNotice } from '@/utils/couponMessage';
import {
  COUPON_CHECK_FAILED,
  COUPON_REDEEM_FAILED,
  couponFailure,
  couponRejection,
} from '@/utils/couponMessage';

/**
 * The coupon the customer is using on *this* order.
 *
 * Redemption needs an orderId, and no order exists while the customer is still
 * at checkout — so the flow is two-phase:
 *
 *   1. `validateCoupon`  — read-only. Confirms the code and works out what it
 *                          would take off. Nothing is spent yet.
 *   2. `redeemCoupon`    — called immediately after the order is placed, with
 *                          the new orderId. This is what actually spends it.
 *
 * Between the two the customer can back out and nothing has been consumed,
 * which is what makes the back button safe on the checkout screen.
 */
type RedemptionStatus =
  | 'idle'
  | 'validating'
  | 'applied'      // validated, not yet spent
  | 'rejected'     // the code is no good; `reason` says why
  | 'redeeming'
  | 'redeemed'
  | 'failed';      // redemption itself failed after the order was placed

interface CouponRedemptionState {
  status: RedemptionStatus;
  applied: AppliedCoupon | null;
  /**
   * Why the code did not go on — shown under the field verbatim.
   *
   * One field for both a refused coupon and a failed request, because the
   * customer is reading the same line either way; `status` already says which
   * of the two it was for anything that needs to know.
   */
  notice: CouponNotice | null;
  /** What is left to pay once the coupon has been taken off. */
  amountDue: number | null;
}

const initialState: CouponRedemptionState = {
  status: 'idle',
  applied: null,
  notice: null,
  amountDue: null,
};

export const validateCoupon = createAsyncThunk<
  CouponValidation,
  { couponCode: string; orderAmount?: number },
  { state: { cart: { lines: CartLine[] } }; rejectValue: CouponNotice }
>('couponRedemption/validate', async ({ couponCode, orderAmount }, { getState, rejectWithValue }) => {
  // Read the cart here rather than taking it from the caller: a product coupon
  // is judged against what is in the cart, so it has to be the live cart and
  // not whatever the component happened to render with.
  const cartLines = getState().cart.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }));

  try {
    // `true` matches the redeem below: Friends Kitchen lets a small coupon pay what
    // it can, so validation has to judge it the same way.
    return await couponApi.validate(couponCode, orderAmount, true, cartLines);
  } catch (err) {
    // Only network/server faults land here — an expired or spent coupon comes
    // back as a successful response with valid: false.
    return rejectWithValue(couponFailure(err, COUPON_CHECK_FAILED));
  }
});

export const redeemCoupon = createAsyncThunk<
  CouponRedemption,
  { orderId: number },
  { state: { couponRedemption: CouponRedemptionState }; rejectValue: CouponNotice }
>('couponRedemption/redeem', async ({ orderId }, { getState, rejectWithValue }) => {
  const applied = getState().couponRedemption.applied;
  if (!applied) return rejectWithValue({ title: 'No coupon has been applied.' });

  try {
    return await couponApi.redeem({
      couponCode: applied.couponCode,
      orderId,
      // Friends Kitchen wants wallet behaviour: a small coupon pays what it can and
      // the card covers the rest, rather than being refused outright.
      allowPartial: true,
    });
  } catch (err) {
    return rejectWithValue(couponFailure(err, COUPON_REDEEM_FAILED));
  }
});

const couponRedemptionSlice = createSlice({
  name: 'couponRedemption',
  initialState,
  reducers: {
    /** Called when the order finishes or is abandoned — coupons never carry
        over from one customer to the next. */
    clearCoupon: () => initialState,
    /** Typing again clears the last refusal — see CouponEntry. */
    dismissCouponNotice: (s) => {
      s.notice = null;
      if (s.status === 'rejected' || s.status === 'failed') s.status = 'idle';
    },
    /** Applying an empty field, which never reaches the API. */
    rejectCoupon: (s, a: PayloadAction<CouponNotice>) => {
      s.status = 'rejected';
      s.applied = null;
      s.notice = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(validateCoupon.pending, (s) => {
        s.status = 'validating';
        s.notice = null;
      })
     .addCase(validateCoupon.fulfilled, (s, a) => {
        const v = a.payload;
        if (!v.valid) {
          s.status = 'rejected';
          s.applied = null;
          /* The server's own `reasonMessage` is the fallback inside here, not
             the message: it is written to be correct, and the customer needs
             one that names the item, the date or the balance involved. */
          s.notice = couponRejection(v, a.meta.arg.orderAmount);
          return;
        }
        s.status = 'applied';
        s.notice = null;
        s.applied = {
          couponCode: v.couponCode,
          couponType: v.couponType!,
          applicableAmount: v.applicableAmount,
          remainingBalance: v.remainingBalance,
          productId: v.productId,
          productName: v.productName,
          redeemedAmount: null,
        };
      })
     .addCase(validateCoupon.rejected, (s, a) => {
        s.status = 'rejected';
        s.applied = null;
        s.notice = a.payload ?? COUPON_CHECK_FAILED;
      })

     .addCase(redeemCoupon.pending, (s) => { s.status = 'redeeming'; s.notice = null; })
     .addCase(redeemCoupon.fulfilled, (s, a) => {
        s.status = 'redeemed';
        s.amountDue = a.payload.amountDue;
        if (s.applied) {
          s.applied.redeemedAmount = a.payload.redeemedAmount;
          s.applied.remainingBalance = a.payload.remainingBalance;
        }
      })
     .addCase(redeemCoupon.rejected, (s, a) => {
        /* The order is already placed at this point, so the coupon is dropped
           and the customer pays the full amount rather than being stuck. */
        s.status = 'failed';
        s.notice = a.payload ?? COUPON_REDEEM_FAILED;
      })

     /* A product coupon was judged against the cart, so taking things out of
        the cart can make it inapplicable — and a validated coupon still showing
        "Cheeseburger is on us" after the cheeseburger is gone is a promise the
        redemption will refuse to keep.

        Only the mutations that can *remove* something invalidate it: adding or
        incrementing a line can never turn an applicable coupon inapplicable.
        Dropping it costs the customer one re-entry; leaving it stale costs them
        a failed redemption at the payment screen. */
     .addMatcher(
        (a) => (
          removeLine.match(a) || decrementLine.match(a) || clearCart.match(a)
        ),
        (s) => (s.status === 'applied' && s.applied?.couponType === 'product' ? initialState : s),
      );
  },
});

export const { clearCoupon, dismissCouponNotice, rejectCoupon } = couponRedemptionSlice.actions;

export default couponRedemptionSlice.reducer;
