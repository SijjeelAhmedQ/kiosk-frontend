import type {
  Coupon,
  CouponDetail,
  CouponHistoryPage,
  CouponHistoryQuery,
  CouponListPage,
  CouponListQuery,
  CouponRedeemInput,
  CouponRedemption,
  CouponValidation,
} from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';

export const couponApi = {
  // ------------------------------------------------------------------------
  // Kiosk-facing
  // ------------------------------------------------------------------------
  /**
   * Checks a code without changing anything.
   *
   * Note this does NOT reject for an unusable coupon — an expired or spent
   * coupon resolves with `valid: false` and a `reasonMessage` to show the
   * customer. Only network and server faults reject.
   *
   * Pass `orderAmount` to have the balance checked against a specific order;
   * `applicableAmount` then says what the coupon would actually cover.
   *
   * `allowPartial` must match what the eventual `redeem` call will pass —
   * otherwise a ₹500 coupon on a ₹2000 order reads as invalid here and is
   * then accepted at redemption.
   */
  validate: async (
    couponCode: string,
    orderAmount?: number,
    allowPartial = false,
  ): Promise<CouponValidation> => {
    const { data } = await axiosClient.post<{ data: CouponValidation }>(
      ENDPOINTS.couponValidate,
      { couponCode, orderAmount, allowPartial },
    );
    return data.data;
  },

  /**
   * Commits the coupon against an order that is placed but not yet paid.
   * Rejects with an ApiError if the coupon has since expired, been spent, or
   * already been applied to this order.
   */
  redeem: async (input: CouponRedeemInput): Promise<CouponRedemption> => {
    const { data } = await axiosClient.post<{ data: CouponRedemption }>(
      ENDPOINTS.couponRedeem,
      input,
    );
    return data.data;
  },

  // ------------------------------------------------------------------------
  // Admin-facing
  // ------------------------------------------------------------------------
  list: async (query: CouponListQuery = {}): Promise<CouponListPage> => {
    const { data } = await axiosClient.get<{ data: CouponListPage }>(ENDPOINTS.coupons, {
      params: query,
    });
    return data.data;
  },

  /** The coupon and its full ledger, in one call. */
  getByCode: async (couponCode: string): Promise<CouponDetail> => {
    const { data } = await axiosClient.get<{ data: CouponDetail }>(
      ENDPOINTS.couponDetail(couponCode),
    );
    return data.data;
  },

  /** A partly spent coupon can be cancelled — the balance left is forfeited. */
  cancel: async (couponCode: string, note?: string): Promise<Coupon> => {
    const { data } = await axiosClient.post<{ data: Coupon }>(
      ENDPOINTS.couponCancel(couponCode),
      { note },
    );
    return data.data;
  },

  history: async (query: CouponHistoryQuery = {}): Promise<CouponHistoryPage> => {
    const { data } = await axiosClient.get<{ data: CouponHistoryPage }>(
      ENDPOINTS.couponHistory,
      { params: query },
    );
    return data.data;
  },
};
