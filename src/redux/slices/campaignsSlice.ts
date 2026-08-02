import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Campaign,
  CampaignCreateInput,
  CampaignListPage,
  CampaignListQuery,
  CampaignUpdateInput,
  Coupon,
  CouponGenerateInput,
} from '@/types';
import { campaignApi } from '@/services/api/campaignApi';
import { errorMessage } from '@/utils/apiError';

export const CAMPAIGN_PAGE_SIZE = 10;

interface CampaignsState {
  items: Campaign[];
  total: number;
  /** Filters live here so they survive navigating to a campaign and back. */
  query: CampaignListQuery;

  current: Campaign | null;
  lastGenerated: Coupon[];

  loading: boolean;
  /** Separate from `loading` so a save does not blank the list behind the form. */
  saving: boolean;
  error: string | null;
}

const initialQuery: CampaignListQuery = { limit: CAMPAIGN_PAGE_SIZE, offset: 0 };

const initialState: CampaignsState = {
  items: [],
  total: 0,
  query: initialQuery,
  current: null,
  lastGenerated: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchCampaigns = createAsyncThunk<
  CampaignListPage,
  CampaignListQuery | undefined,
  { rejectValue: string }
>('campaigns/fetch', async (query, { rejectWithValue }) => {
  try {
    return await campaignApi.list(query);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not load campaigns.'));
  }
});

export const fetchCampaign = createAsyncThunk<Campaign, number, { rejectValue: string }>(
  'campaigns/fetchOne',
  async (campaignId, { rejectWithValue }) => {
    try {
      return await campaignApi.getById(campaignId);
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Could not load that campaign.'));
    }
  },
);

export const createCampaign = createAsyncThunk<Campaign, CampaignCreateInput, { rejectValue: string }>(
  'campaigns/create',
  async (input, { rejectWithValue }) => {
    try {
      return await campaignApi.create(input);
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Could not create the campaign.'));
    }
  },
);

export const updateCampaign = createAsyncThunk<
  Campaign,
  { campaignId: number; input: CampaignUpdateInput },
  { rejectValue: string }
>('campaigns/update', async ({ campaignId, input }, { rejectWithValue }) => {
  try {
    return await campaignApi.update(campaignId, input);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not save the campaign.'));
  }
});

export const setCampaignActive = createAsyncThunk<
  Campaign,
  { campaignId: number; isActive: boolean },
  { rejectValue: string }
>('campaigns/setActive', async ({ campaignId, isActive }, { rejectWithValue }) => {
  try {
    return await campaignApi.setActive(campaignId, isActive);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not change the campaign status.'));
  }
});

export const deleteCampaign = createAsyncThunk<number, number, { rejectValue: string }>(
  'campaigns/delete',
  async (campaignId, { rejectWithValue }) => {
    try {
      await campaignApi.remove(campaignId);
      return campaignId;
    } catch (err) {
      // The API refuses once a coupon has been redeemed; that message is the
      // useful one, so it is surfaced as-is.
      return rejectWithValue(errorMessage(err, 'Could not delete the campaign.'));
    }
  },
);

export const generateCoupons = createAsyncThunk<
  Coupon[],
  { campaignId: number; input: CouponGenerateInput },
  { rejectValue: string }
>('campaigns/generateCoupons', async ({ campaignId, input }, { rejectWithValue }) => {
  try {
    return await campaignApi.generateCoupons(campaignId, input);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not generate coupons.'));
  }
});

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    /** Merges a filter change and resets to page one — a filtered list should
        never open on page four of the previous result. */
    setCampaignQuery: (s, a: PayloadAction<Partial<CampaignListQuery>>) => {
      s.query = { ...s.query, ...a.payload, offset: 0 };
    },
    setCampaignPage: (s, a: PayloadAction<number>) => {
      s.query = { ...s.query, offset: a.payload * (s.query.limit ?? CAMPAIGN_PAGE_SIZE) };
    },
    resetCampaignQuery: (s) => { s.query = initialQuery; },
    clearCampaignError: (s) => { s.error = null; },
    clearCurrentCampaign: (s) => { s.current = null; },
    clearGeneratedCoupons: (s) => { s.lastGenerated = []; },
  },
  extraReducers: (b) => {
    /* Reads drive `loading`; writes drive `saving`, so saving a form never
       blanks the list rendered behind it. */
    const startSave = (s: CampaignsState) => { s.saving = true; s.error = null; };
    const failSave = (s: CampaignsState, a: { payload?: string }) => {
      s.saving = false;
      s.error = a.payload ?? 'That change could not be saved.';
    };
    /** A saved campaign replaces its row in the list and becomes `current`. */
    const applySaved = (s: CampaignsState, a: PayloadAction<Campaign>) => {
      s.saving = false;
      s.current = a.payload;
      const index = s.items.findIndex((c) => c.campaignId === a.payload.campaignId);
      if (index >= 0) s.items[index] = a.payload;
    };

    b.addCase(fetchCampaigns.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchCampaigns.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload.items;
        s.total = a.payload.total;
      })
     .addCase(fetchCampaigns.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload ?? 'Could not load campaigns.';
      })

     .addCase(fetchCampaign.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchCampaign.fulfilled, (s, a) => { s.loading = false; s.current = a.payload; })
     .addCase(fetchCampaign.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload ?? 'Could not load that campaign.';
      })

     .addCase(createCampaign.pending, startSave)
     .addCase(createCampaign.fulfilled, applySaved)
     .addCase(createCampaign.rejected, failSave)

     .addCase(updateCampaign.pending, startSave)
     .addCase(updateCampaign.fulfilled, applySaved)
     .addCase(updateCampaign.rejected, failSave)

     .addCase(setCampaignActive.pending, startSave)
     .addCase(setCampaignActive.fulfilled, applySaved)
     .addCase(setCampaignActive.rejected, failSave)

     .addCase(generateCoupons.pending, startSave)
     .addCase(generateCoupons.fulfilled, (s, a) => { s.saving = false; s.lastGenerated = a.payload; })
     .addCase(generateCoupons.rejected, failSave)

     .addCase(deleteCampaign.pending, startSave)
     .addCase(deleteCampaign.fulfilled, (s, a) => {
        s.saving = false;
        s.items = s.items.filter((c) => c.campaignId !== a.payload);
        s.total = Math.max(0, s.total - 1);
        if (s.current?.campaignId === a.payload) s.current = null;
      })
     .addCase(deleteCampaign.rejected, failSave);
  },
});

export const {
  setCampaignQuery,
  setCampaignPage,
  resetCampaignQuery,
  clearCampaignError,
  clearCurrentCampaign,
  clearGeneratedCoupons,
} = campaignsSlice.actions;

export default campaignsSlice.reducer;
