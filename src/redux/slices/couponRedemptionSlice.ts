import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AppliedCoupon, CouponRedemption, CouponValidation } from '@/types';
import { couponApi } from '@/services/api/couponApi';
import { errorMessage } from '@/utils/apiError';

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
  /** Why the code was refused — shown to the customer verbatim. */
  reason: string | null;
  /** A transport or server failure, as opposed to an unusable coupon. */
  error: string | null;
  /** What is left to pay once the coupon has been taken off. */
  amountDue: number | null;
}

const initialState: CouponRedemptionState = {
  status: 'idle',
  applied: null,
  reason: null,
  error: null,
  amountDue: null,
};

export const validateCoupon = createAsyncThunk<
  CouponValidation,
  { couponCode: string; orderAmount?: number },
  { rejectValue: string }
>('couponRedemption/validate', async ({ couponCode, orderAmount }, { rejectWithValue }) => {
  try {
    // `true` matches the redeem below: the kiosk lets a small coupon pay what
    // it can, so validation has to judge it the same way.
    return await couponApi.validate(couponCode, orderAmount, true);
  } catch (err) {
    // Only network/server faults land here — an expired or spent coupon comes
    // back as a successful response with valid: false.
    return rejectWithValue(errorMessage(err, 'Could not check that coupon.'));
  }
});

export const redeemCoupon = createAsyncThunk<
  CouponRedemption,
  { orderId: number },
  { state: { couponRedemption: CouponRedemptionState }; rejectValue: string }
>('couponRedemption/redeem', async ({ orderId }, { getState, rejectWithValue }) => {
  const applied = getState().couponRedemption.applied;
  if (!applied) return rejectWithValue('No coupon has been applied.');

  try {
    return await couponApi.redeem({
      couponCode: applied.couponCode,
      orderId,
      // The kiosk wants wallet behaviour: a small coupon pays what it can and
      // the card covers the rest, rather than being refused outright.
      allowPartial: true,
    });
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'The coupon could not be applied to this order.'));
  }
});

const couponRedemptionSlice = createSlice({
  name: 'couponRedemption',
  initialState,
  reducers: {
    /** Called when the order finishes or is abandoned — coupons never carry
        over from one customer to the next. */
    clearCoupon: () => initialState,
    dismissCouponReason: (s) => {
      s.reason = null;
      s.error = null;
      if (s.status === 'rejected' || s.status === 'failed') s.status = 'idle';
    },
  },
  extraReducers: (b) => {
    b.addCase(validateCoupon.pending, (s) => {
        s.status = 'validating';
        s.reason = null;
        s.error = null;
      })
     .addCase(validateCoupon.fulfilled, (s, a) => {
        const v = a.payload;
        if (!v.valid) {
          s.status = 'rejected';
          s.applied = null;
          s.reason = v.reasonMessage ?? 'That coupon cannot be used.';
          return;
        }
        s.status = 'applied';
        s.reason = null;
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
        s.error = a.payload ?? 'Could not check that coupon.';
      })

     .addCase(redeemCoupon.pending, (s) => { s.status = 'redeeming'; s.error = null; })
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
        s.error = a.payload ?? 'The coupon could not be applied to this order.';
      });
  },
});

export const { clearCoupon, dismissCouponReason } = couponRedemptionSlice.actions;

export default couponRedemptionSlice.reducer;
