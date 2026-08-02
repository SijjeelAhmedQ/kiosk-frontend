import type { OrderStatus } from '@/types';
import { APP } from '@/constants/app.constants';

/**
 * `accent` is the pill's colour at full strength — the rail down the left of an
 * order card in the back office. Declared here with the pill so the two can
 * never drift, the same way the coupon and campaign styles do it.
 */
export const STATUS_STYLES: Record<
  OrderStatus,
  { label: string; className: string; accent: string }
> = {
  paid: { label: 'Paid', className: 'bg-leaf-soft text-leaf', accent: 'bg-leaf' },
  placed: {
    label: 'Awaiting payment',
    className: 'bg-amber-soft text-amber-dark',
    accent: 'bg-amber',
  },
  payment_failed: {
    label: 'Payment failed',
    className: 'bg-flame-soft text-flame',
    accent: 'bg-flame',
  },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ash', accent: 'bg-ash/40' },
};

/** "28 Jul, 02:19 pm" — timestamps come from the API as UTC ISO strings. */
export const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString(APP.locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
