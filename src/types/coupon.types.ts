/**
 * Campaign and coupon types.
 *
 * These mirror app/schemas/coupon.py on the API one-for-one. Money is `number`
 * in whole rupees and timestamps are UTC ISO strings — the same conventions the
 * order types already use.
 *
 * Campaign and coupon windows are instants, not days: a coupon can be good from
 * 05:00 to 17:00 on a single date. They arrive as `YYYY-MM-DDTHH:mm:ssZ` and are
 * shown in the admin's local time — see utils/couponDisplay.ts.
 */

export type CouponType = 'product' | 'value';

/** What is true about a campaign today, as opposed to the admin's on/off switch. */
export type CampaignState = 'running' | 'scheduled' | 'expired' | 'inactive';

/**
 * `expired` is computed by the API from the expiry date, never stored — so a
 * coupon is expired the moment its date passes, not whenever a job last ran.
 */
export type CouponStatus =
  | 'unused'
  | 'partially_redeemed'
  | 'fully_redeemed'
  | 'expired'
  | 'cancelled';

export type CouponTransactionType = 'redeem' | 'reverse' | 'cancel';

// --------------------------------------------------------------------------
// Campaigns
// --------------------------------------------------------------------------
export interface Campaign {
  campaignId: number;
  name: string;
  description: string;
  couponType: CouponType;
  startDate: string;          // UTC instant — the moment the campaign opens
  expiryDate: string;         // UTC instant — the last moment it is live
  isActive: boolean;
  state: CampaignState;

  couponCount: number;
  redeemedCount: number;
  issuedValue: number;
  remainingValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListPage {
  items: Campaign[];
  total: number;              // campaigns matching the filter, ignoring paging
  limit: number;
  offset: number;
}

export interface CampaignListQuery {
  search?: string;
  isActive?: boolean;
  couponType?: CouponType;
  from?: string;              // campaigns live on or after this date
  to?: string;
  limit?: number;
  offset?: number;
}

/** The create form's payload. */
export interface CampaignCreateInput {
  name: string;
  description: string;
  couponType: CouponType;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
}

/**
 * The edit form's payload. `couponType` is refused by the API once coupons have
 * been issued, so the form locks it rather than letting the save fail.
 */
export interface CampaignUpdateInput {
  name: string;
  description: string;
  couponType?: CouponType;
  startDate: string;
  expiryDate: string;
  isActive?: boolean;
}

// --------------------------------------------------------------------------
// Coupons
// --------------------------------------------------------------------------
export interface Coupon {
  couponId: number;
  couponCode: string;

  campaignId: number;
  campaignName: string;
  campaignIsActive: boolean;
  campaignStartDate: string;   // UTC instant
  campaignExpiryDate: string;  // UTC instant

  couponType: CouponType;
  originalAmount: number | null;    // value coupons only
  remainingBalance: number | null;  // value coupons only

  status: CouponStatus;
  storedStatus: string;             // the raw column, for the audit trail

  expiryDate: string;          // UTC instant — the last moment it is redeemable
  customerId: string | null;
  issuedAt: string;
  redeemedAt: string | null;

  // Product coupons only.
  productId: string | null;
  productQuantity: number | null;
  productName: string | null;
  productPrice: number | null;
  productImage: string | null;
  productImgBase64: string | null;
  productIsActive: boolean | null;

  redemptionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CouponTransaction {
  transactionId: number;
  transactionType: CouponTransactionType;
  orderId: number | null;
  orderNumber: string | null;
  amount: number;
  balanceAfter: number | null;
  customerId: string | null;
  terminalId: string;
  note: string | null;
  createdAt: string;
}

/** One coupon plus everything that ever happened to it. */
export interface CouponDetail {
  coupon: Coupon;
  transactions: CouponTransaction[];
}

export interface CouponListPage {
  items: Coupon[];
  total: number;
  issuedValue: number;
  remainingValue: number;
  redeemedValue: number;
  limit: number;
  offset: number;
}

export interface CouponListQuery {
  campaignId?: number;
  status?: CouponStatus;
  couponType?: CouponType;
  search?: string;            // coupon code, prefix match
  from?: string;              // issued on or after
  to?: string;
  limit?: number;
  offset?: number;
}

/** The generate form's payload. `campaignId` goes in the URL, not the body. */
export interface CouponGenerateInput {
  quantity: number;
  amount?: number;            // value campaigns
  productId?: string;         // product campaigns
  expiryDate?: string;        // UTC instant; defaults to the campaign's expiry
  codePrefix?: string;
  customerId?: string;
}

// --------------------------------------------------------------------------
// Validation and redemption
// --------------------------------------------------------------------------
/**
 * The answer to "is this code any good?".
 *
 * An unusable coupon is a successful response with `valid: false` and a reason —
 * not a thrown ApiError. The kiosk shows `reasonMessage` to the customer.
 */
export interface CouponValidation {
  valid: boolean;
  reasonCode: string | null;
  reasonMessage: string | null;

  couponCode: string;
  couponType: CouponType | null;
  originalAmount: number | null;
  remainingBalance: number | null;
  expiryDate: string | null;
  status: CouponStatus | null;

  campaignId: number | null;
  campaignName: string | null;

  productId: string | null;
  productName: string | null;
  productPrice: number | null;
  productImage: string | null;
  productImgBase64: string | null;

  /** What the coupon would take off, were it used right now. */
  applicableAmount: number;
}

export interface CouponRedeemInput {
  couponCode: string;
  orderId: number;
  /** Value coupons: how much to draw. Omit to cover whatever is still due. */
  amount?: number;
  /** Draw what is there and leave the rest for the card. The kiosk sets this. */
  allowPartial?: boolean;
  customerId?: string;
}

export interface CouponRedemption {
  couponCode: string;
  couponType: CouponType;
  status: CouponStatus;
  originalAmount: number | null;
  remainingBalance: number | null;
  productId: string | null;
  productName: string | null;

  redeemedAmount: number;
  orderId: number;
  orderTotal: number;
  couponDiscount: number;     // everything taken off this order so far
  amountDue: number;          // what is left to pay
}

// --------------------------------------------------------------------------
// Redemption history
// --------------------------------------------------------------------------
export interface CouponHistoryItem {
  historyId: number;
  couponId: number;
  couponCode: string;
  couponType: CouponType;
  campaignId: number;
  campaignName: string;
  orderId: number | null;
  orderNumber: string | null;
  redeemedAmount: number;
  remainingBalance: number | null;
  redeemedDate: string;
  customerId: string | null;
  terminalId: string;
}

export interface CouponHistoryPage {
  items: CouponHistoryItem[];
  total: number;
  redeemedValue: number;
  limit: number;
  offset: number;
}

export interface CouponHistoryQuery {
  couponCode?: string;
  campaignId?: number;
  orderId?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * A coupon the customer has entered at checkout but not yet redeemed.
 *
 * Redemption needs an orderId, which does not exist until the order is placed,
 * so the kiosk holds the validated coupon here and commits it straight after
 * placing. See redux/slices/couponSlice.ts.
 */
export interface AppliedCoupon {
  couponCode: string;
  couponType: CouponType;
  /** What it will take off this order. */
  applicableAmount: number;
  remainingBalance: number | null;
  productId: string | null;
  productName: string | null;
  /** Set once the coupon has actually been redeemed against the order. */
  redeemedAmount: number | null;
}
