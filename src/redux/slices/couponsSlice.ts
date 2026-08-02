import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Coupon,
  CouponDetail,
  CouponHistoryItem,
  CouponHistoryPage,
  CouponHistoryQuery,
  CouponListPage,
  CouponListQuery,
  CouponTransaction,
} from '@/types';
import { couponApi } from '@/services/api/couponApi';
import { errorMessage } from '@/utils/apiError';

export const COUPON_PAGE_SIZE = 15;

/** The admin side of coupons: the list, one coupon's detail, and the history log. */
interface CouponsState {
  items: Coupon[];
  total: number;
  issuedValue: number;
  remainingValue: number;
  redeemedValue: number;
  query: CouponListQuery;

  current: Coupon | null;
  currentTransactions: CouponTransaction[];

  history: CouponHistoryItem[];
  historyTotal: number;
  historyValue: number;
  historyQuery: CouponHistoryQuery;

  loading: boolean;
  historyLoading: boolean;
  saving: boolean;
  error: string | null;
}

const initialQuery: CouponListQuery = { limit: COUPON_PAGE_SIZE, offset: 0 };
const initialHistoryQuery: CouponHistoryQuery = { limit: COUPON_PAGE_SIZE, offset: 0 };

const initialState: CouponsState = {
  items: [],
  total: 0,
  issuedValue: 0,
  remainingValue: 0,
  redeemedValue: 0,
  query: initialQuery,

  current: null,
  currentTransactions: [],

  history: [],
  historyTotal: 0,
  historyValue: 0,
  historyQuery: initialHistoryQuery,

  loading: false,
  historyLoading: false,
  saving: false,
  error: null,
};

export const fetchCoupons = createAsyncThunk<
  CouponListPage,
  CouponListQuery | undefined,
  { rejectValue: string }
>('coupons/fetch', async (query, { rejectWithValue }) => {
  try {
    return await couponApi.list(query);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not load coupons.'));
  }
});

export const fetchCoupon = createAsyncThunk<CouponDetail, string, { rejectValue: string }>(
  'coupons/fetchOne',
  async (couponCode, { rejectWithValue }) => {
    try {
      return await couponApi.getByCode(couponCode);
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Could not load that coupon.'));
    }
  },
);

export const cancelCoupon = createAsyncThunk<
  Coupon,
  { couponCode: string; note?: string },
  { rejectValue: string }
>('coupons/cancel', async ({ couponCode, note }, { rejectWithValue }) => {
  try {
    return await couponApi.cancel(couponCode, note);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not cancel the coupon.'));
  }
});

export const fetchCouponHistory = createAsyncThunk<
  CouponHistoryPage,
  CouponHistoryQuery | undefined,
  { rejectValue: string }
>('coupons/fetchHistory', async (query, { rejectWithValue }) => {
  try {
    return await couponApi.history(query);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not load redemption history.'));
  }
});

const couponsSlice = createSlice({
  name: 'coupons',
  initialState,
  reducers: {
    /** Any filter change resets to page one. */
    setCouponQuery: (s, a: PayloadAction<Partial<CouponListQuery>>) => {
      s.query = { ...s.query, ...a.payload, offset: 0 };
    },
    setCouponPage: (s, a: PayloadAction<number>) => {
      s.query = { ...s.query, offset: a.payload * (s.query.limit ?? COUPON_PAGE_SIZE) };
    },
    /** A longer page renumbers every page after it, so this goes back to one. */
    setCouponLimit: (s, a: PayloadAction<number>) => {
      s.query = { ...s.query, limit: a.payload, offset: 0 };
    },
    resetCouponQuery: (s) => { s.query = initialQuery; },

    setHistoryQuery: (s, a: PayloadAction<Partial<CouponHistoryQuery>>) => {
      s.historyQuery = { ...s.historyQuery, ...a.payload, offset: 0 };
    },
    setHistoryPage: (s, a: PayloadAction<number>) => {
      s.historyQuery = {
        ...s.historyQuery,
        offset: a.payload * (s.historyQuery.limit ?? COUPON_PAGE_SIZE),
      };
    },
    setHistoryLimit: (s, a: PayloadAction<number>) => {
      s.historyQuery = { ...s.historyQuery, limit: a.payload, offset: 0 };
    },
    resetHistoryQuery: (s) => { s.historyQuery = initialHistoryQuery; },

    clearCouponError: (s) => { s.error = null; },
    clearCurrentCoupon: (s) => { s.current = null; s.currentTransactions = []; },
  },
  extraReducers: (b) => {
    b.addCase(fetchCoupons.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchCoupons.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload.items;
        s.total = a.payload.total;
        s.issuedValue = a.payload.issuedValue;
        s.remainingValue = a.payload.remainingValue;
        s.redeemedValue = a.payload.redeemedValue;
      })
     .addCase(fetchCoupons.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload ?? 'Could not load coupons.';
      })

     .addCase(fetchCoupon.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchCoupon.fulfilled, (s, a) => {
        s.loading = false;
        s.current = a.payload.coupon;
        s.currentTransactions = a.payload.transactions;
      })
     .addCase(fetchCoupon.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload ?? 'Could not load that coupon.';
      })

     .addCase(cancelCoupon.pending, (s) => { s.saving = true; s.error = null; })
     .addCase(cancelCoupon.fulfilled, (s, a) => {
        s.saving = false;
        s.current = a.payload;
        // Keep the list in step without refetching the whole page.
        const index = s.items.findIndex((c) => c.couponId === a.payload.couponId);
        if (index >= 0) s.items[index] = a.payload;
      })
     .addCase(cancelCoupon.rejected, (s, a) => {
        s.saving = false;
        s.error = a.payload ?? 'Could not cancel the coupon.';
      })

     /* History has its own loading flag: the coupon-detail screen shows the
        coupon and its history side by side, and they load independently. */
     .addCase(fetchCouponHistory.pending, (s) => { s.historyLoading = true; s.error = null; })
     .addCase(fetchCouponHistory.fulfilled, (s, a) => {
        s.historyLoading = false;
        s.history = a.payload.items;
        s.historyTotal = a.payload.total;
        s.historyValue = a.payload.redeemedValue;
      })
     .addCase(fetchCouponHistory.rejected, (s, a) => {
        s.historyLoading = false;
        s.error = a.payload ?? 'Could not load redemption history.';
      });
  },
});

export const {
  setCouponQuery,
  setCouponPage,
  setCouponLimit,
  resetCouponQuery,
  setHistoryQuery,
  setHistoryPage,
  setHistoryLimit,
  resetHistoryQuery,
  clearCouponError,
  clearCurrentCoupon,
} = couponsSlice.actions;

export default couponsSlice.reducer;
