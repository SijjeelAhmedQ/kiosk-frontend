import { toInstant } from './couponDisplay';

/**
 * The campaign window: where a new one opens, and how long it runs.
 *
 * Keeping the two ends in order is the pickers' job — each bounds the other,
 * calendar and clock both, so an invalid moment is never offered in the first
 * place. See utils/instantBounds.
 */

/** How long a campaign runs by default. */
export const DEFAULT_WINDOW_MONTHS = 2;

const parse = (instant: string): Date | null => {
  if (!instant) return null;
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Adds whole months, clamped to the end of the target month.
 *
 * `setMonth` alone rolls over: 31 Jan + 1 month lands on 2 or 3 March, which
 * would quietly hand the campaign a few extra days. The last day of February is
 * what a person means by "a month after the 31st".
 */
export const addMonths = (instant: string, months: number): string => {
  const date = parse(instant);
  if (!date) return instant;

  const day = date.getDate();
  const shifted = new Date(date);
  // Park on the 1st first, or the rollover happens during the month change.
  shifted.setDate(1);
  shifted.setMonth(shifted.getMonth() + months);
  const lastDayOfMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDayOfMonth));
  return toInstant(shifted);
};

/** Local 00:00 of the day this instant falls on — where a campaign opens. */
export const startOfDay = (instant: string): string => {
  const date = parse(instant);
  if (!date) return instant;
  date.setHours(0, 0, 0, 0);
  return toInstant(date);
};

/** Local 23:59 — the last minute the picker can express, so the last it can close. */
export const endOfDay = (instant: string): string => {
  const date = parse(instant);
  if (!date) return instant;
  date.setHours(23, 59, 0, 0);
  return toInstant(date);
};

export interface CampaignWindow {
  startDate: string;
  expiryDate: string;
}

export type WindowEnd = keyof CampaignWindow;

/** What a brand-new campaign opens with: from today, two months long. */
export const defaultWindow = (): CampaignWindow => {
  const startDate = startOfDay(toInstant(new Date()));
  return { startDate, expiryDate: endOfDay(addMonths(startDate, DEFAULT_WINDOW_MONTHS)) };
};
