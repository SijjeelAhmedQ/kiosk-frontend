import type {
  Campaign,
  CampaignCreateInput,
  CampaignListPage,
  CampaignListQuery,
  CampaignUpdateInput,
  Coupon,
  CouponGenerateInput,
} from '@/types';
import { axiosClient } from '../http/axiosClient';
import { ENDPOINTS } from '../http/endpoints';

/**
 * Campaign admin. No mock branch: campaigns only exist in the database, so
 * running the kiosk standalone (USE_MOCK) simply has no back office.
 */
export const campaignApi = {
  list: async (query: CampaignListQuery = {}): Promise<CampaignListPage> => {
    const { data } = await axiosClient.get<{ data: CampaignListPage }>(ENDPOINTS.campaigns, {
      params: query,
    });
    return data.data;
  },

  getById: async (campaignId: number): Promise<Campaign> => {
    const { data } = await axiosClient.get<{ data: Campaign }>(
      ENDPOINTS.campaignDetail(campaignId),
    );
    return data.data;
  },

  create: async (input: CampaignCreateInput): Promise<Campaign> => {
    const { data } = await axiosClient.post<{ data: Campaign }>(ENDPOINTS.campaigns, input);
    return data.data;
  },

  update: async (campaignId: number, input: CampaignUpdateInput): Promise<Campaign> => {
    const { data } = await axiosClient.put<{ data: Campaign }>(
      ENDPOINTS.campaignDetail(campaignId),
      input,
    );
    return data.data;
  },

  /** Deactivating stops redemption of every coupon in the campaign at once. */
  setActive: async (campaignId: number, isActive: boolean): Promise<Campaign> => {
    const { data } = await axiosClient.patch<{ data: Campaign }>(
      ENDPOINTS.campaignStatus(campaignId),
      { isActive },
    );
    return data.data;
  },

  /** Rejected with 409 once any coupon in the campaign has been redeemed. */
  remove: async (campaignId: number): Promise<void> => {
    await axiosClient.delete(ENDPOINTS.campaignDetail(campaignId));
  },

  /** Prints coupons and returns every code created, for printing or export. */
  generateCoupons: async (
    campaignId: number,
    input: CouponGenerateInput,
  ): Promise<Coupon[]> => {
    const { data } = await axiosClient.post<{ data: Coupon[] }>(
      ENDPOINTS.campaignCoupons(campaignId),
      input,
    );
    return data.data;
  },
};
