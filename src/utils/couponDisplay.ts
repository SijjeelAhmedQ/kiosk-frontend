import type { CampaignState, CouponStatus, CouponType } from '@/types';
import { APP } from '@/constants/app.constants';

/**
 * Coupon status → the pill the admin screens show, and the rail down the left
 * of its card. Mirrors STATUS_STYLES for orders.
 *
 * `accent` is the pill's colour at full strength: the two are the same signal,
 * so they are declared together and can never drift apart.
 */
export const COUPON_STATUS_STYLES: Record<
  CouponStatus,
  { label: string; className: string; accent: string }
> = {
  unused: { label: 'Unused', className: 'bg-mist text-charcoal', accent: 'bg-ash/40' },
  partially_redeemed: {
    label: 'Partly used',
    className: 'bg-amber-soft text-amber-dark',
    accent: 'bg-amber',
  },
  fully_redeemed: {
    label: 'Fully redeemed',
    className: 'bg-leaf-soft text-leaf',
    accent: 'bg-leaf',
  },
  expired: { label: 'Expired', className: 'bg-flame-soft text-flame', accent: 'bg-flame' },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ash', accent: 'bg-ash/40' },
};

/**
 * Campaign state → pill. `inactive` is red rather than grey on purpose: it is a
 * switch someone threw, and it silently stops every coupon in the campaign from
 * being redeemed, so it should stand out in a list.
 */
export const CAMPAIGN_STATE_STYLES: Record<
  CampaignState,
  { label: string; className: string; accent: string }
> = {
  running: { label: 'Running', className: 'bg-leaf-soft text-leaf', accent: 'bg-leaf' },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-amber-soft text-amber-dark',
    accent: 'bg-amber',
  },
  expired: { label: 'Ended', className: 'bg-mist text-ash', accent: 'bg-ash/40' },
  inactive: { label: 'Inactive', className: 'bg-flame-soft text-flame', accent: 'bg-flame' },
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

/* ---------------------------------------------------------------------------
   Campaign and coupon windows are instants, not days: a coupon can be good from
   05:00 to 17:00 on one date. They travel as UTC ISO strings and are shown in
   the admin's local time, which is the only time of day a person here means.
   --------------------------------------------------------------------------- */

/**
 * The API's instant format: seconds, no milliseconds, `Z`.
 *
 * Worth pinning down, because the app compares these strings directly — and
 * lexicographic order only matches chronological order while every string has
 * the same shape. '…:00.000Z' sorts *before* '…:00Z' for the same moment.
 */
export const toInstant = (date: Date): string => `${date.toISOString().slice(0, 19)}Z`;

/**
 * Parses either an instant or a bare `YYYY-MM-DD` day.
 *
 * A bare day is built from its parts rather than handed to `new Date`: that
 * reads it as UTC midnight, which renders as the previous day for anyone west
 * of Greenwich. The report filters still send bare days, so both shapes arrive.
 */
const parse = (iso: string): Date | null => {
  if (!iso) return null;

  if (!iso.includes('T')) {
    const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
  }

  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "02 Aug 2026", in local time. */
export const formatDay = (iso: string): string => {
  const date = parse(iso);
  if (!date) return iso;
  return date.toLocaleDateString(APP.locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** "5:00 pm", in local time. */
export const formatTime = (iso: string): string => {
  const date = parse(iso);
  if (!date) return '';
  return date.toLocaleTimeString(APP.locale, { hour: 'numeric', minute: '2-digit' });
};

/** "02 Aug 2026, 5:00 pm" — a whole window end, which is what these now are. */
export const formatDayTime = (iso: string): string => {
  const date = parse(iso);
  if (!date) return iso;
  return `${formatDay(iso)}, ${formatTime(iso)}`;
};

/* The campaign window's own arithmetic — defaults, month maths and keeping the
   two ends in order — lives in utils/campaignWindow.ts, which builds on
   toInstant above. */

/**
 * "in 4h" / "in 12 days" / "20 min ago" — context for a window end.
 *
 * Inside a day it counts the clock, because that is the useful answer for a
 * coupon that closes this afternoon. Past that it counts calendar days, so the
 * phrase agrees with the date printed beside it.
 */
export const relativeWhen = (iso: string): string => {
  const date = parse(iso);
  if (!date) return '';

  const ms = date.getTime() - Date.now();
  const ahead = ms >= 0;
  const abs = Math.abs(ms);

  if (abs < 60_000) return 'now';
  if (abs < 3_600_000) {
    const minutes = Math.round(abs / 60_000);
    return ahead ? `in ${minutes} min` : `${minutes} min ago`;
  }
  if (abs < 86_400_000) {
    const hours = Math.round(abs / 3_600_000);
    return ahead ? `in ${hours}h` : `${hours}h ago`;
  }

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const targetDay = new Date(date);
  targetDay.setHours(0, 0, 0, 0);

  const days = Math.round((targetDay.getTime() - midnight.getTime()) / 86_400_000);
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
