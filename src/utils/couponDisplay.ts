import type { CampaignState, CouponStatus, CouponType } from '@/types';
import { APP } from '@/constants/app.constants';

/** Coupon status → the pill the admin screens show. Mirrors STATUS_STYLES for orders. */
export const COUPON_STATUS_STYLES: Record<CouponStatus, { label: string; className: string }> = {
  unused: { label: 'Unused', className: 'bg-mist text-charcoal' },
  partially_redeemed: { label: 'Partly used', className: 'bg-amber-soft text-amber-dark' },
  fully_redeemed: { label: 'Fully redeemed', className: 'bg-leaf-soft text-leaf' },
  expired: { label: 'Expired', className: 'bg-flame-soft text-flame' },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ash' },
};

/**
 * Campaign state → pill. `inactive` is red rather than grey on purpose: it is a
 * switch someone threw, and it silently stops every coupon in the campaign from
 * being redeemed, so it should stand out in a list.
 */
export const CAMPAIGN_STATE_STYLES: Record<CampaignState, { label: string; className: string }> = {
  running: { label: 'Running', className: 'bg-leaf-soft text-leaf' },
  scheduled: { label: 'Scheduled', className: 'bg-amber-soft text-amber-dark' },
  expired: { label: 'Ended', className: 'bg-mist text-ash' },
  inactive: { label: 'Inactive', className: 'bg-flame-soft text-flame' },
};

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  product: 'Product',
  value: 'Value',
};

export const COUPON_TYPE_ICON: Record<CouponType, string> = {
  product: '🍔',
  value: '💳',
};

/** Every status a coupon can be filtered by, in lifecycle order. */
export const COUPON_STATUSES: CouponStatus[] = [
  'unused',
  'partially_redeemed',
  'fully_redeemed',
  'expired',
  'cancelled',
];

/**
 * "02 Aug 2026" from a YYYY-MM-DD date.
 *
 * Built from the parts rather than `new Date(iso)`: that parses a bare date as
 * UTC midnight, which renders as the previous day for anyone west of Greenwich.
 */
export const formatDay = (isoDate: string): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString(APP.locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** Today as YYYY-MM-DD in local time — the format <input type="date"> wants. */
export const todayIso = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

/** YYYY-MM-DD, `days` from today. Used for the default campaign window. */
export const isoDaysFromToday = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

/** "in 12 days" / "3 days ago" / "today" — context for an expiry date. */
export const relativeDay = (isoDate: string): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';

  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
};

/**
 * How much of a value coupon has been spent, 0–1.
 * Product coupons have no balance, so they read as all-or-nothing.
 */
export const spentFraction = (original: number | null, remaining: number | null): number => {
  if (!original || original <= 0) return 0;
  const left = remaining ?? 0;
  return Math.min(1, Math.max(0, (original - left) / original));
};
