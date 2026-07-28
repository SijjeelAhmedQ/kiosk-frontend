import type { OrderStatus } from '@/types';
import { APP } from '@/constants/app.constants';

export const STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-leaf/15 text-leaf' },
  placed: { label: 'Awaiting payment', className: 'bg-amber-soft text-amber' },
  payment_failed: { label: 'Payment failed', className: 'bg-flame-soft text-flame' },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ash' },
};

/** "28 Jul, 02:19 pm" — timestamps come from the API as UTC ISO strings. */
export const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString(APP.locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
