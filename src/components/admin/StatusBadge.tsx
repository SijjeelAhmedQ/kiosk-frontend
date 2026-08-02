import type { CampaignState, CouponStatus, CouponType } from '@/types';
import { cn } from '@/utils/cn';
import {
  CAMPAIGN_STATE_STYLES,
  COUPON_STATUS_STYLES,
  COUPON_TYPE_ICON,
  COUPON_TYPE_LABEL,
} from '@/utils/couponDisplay';

interface BadgeProps {
  className?: string;
}

/** One pill shape, three vocabularies — so a status always looks like a status. */
function Pill({ label, tone, className }: { label: string; tone: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1',
        'font-display text-xs font-bold',
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CouponStatusBadge({ status, className }: { status: CouponStatus } & BadgeProps) {
  const style = COUPON_STATUS_STYLES[status];
  return <Pill label={style.label} tone={style.className} className={className} />;
}

export function CampaignStateBadge({ state, className }: { state: CampaignState } & BadgeProps) {
  const style = CAMPAIGN_STATE_STYLES[state];
  return <Pill label={style.label} tone={style.className} className={className} />;
}

export function CouponTypeBadge({ type, className }: { type: CouponType } & BadgeProps) {
  return (
    <Pill
      label={`${COUPON_TYPE_ICON[type]} ${COUPON_TYPE_LABEL[type]}`}
      tone="bg-cream text-charcoal"
      className={className}
    />
  );
}
