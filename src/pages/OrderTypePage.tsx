import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/redux/hooks';
import { setOrderType } from '@/redux/slices/settingsSlice';
import { fetchCategories } from '@/redux/slices/categoriesSlice';
import { fetchProducts } from '@/redux/slices/productsSlice';
import { ORDER_TYPES } from '@/constants/order.constants';
import type { OrderType } from '@/types';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';

const BLURB: Record<string, string> = {
  dine_in: 'Eat here — we’ll bring it to your table',
  take_away: 'Packed to go, ready at the counter',
};

/**
 * Full-bleed split screen: each half is the target. Nothing to aim at, which is
 * the right shape for a first tap on a 1920px panel.
 */
export default function OrderTypePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const choose = (type: OrderType) => {
    dispatch(setOrderType(type));
    dispatch(fetchCategories());
    dispatch(fetchProducts());
    navigate(PATHS.menu);
  };

  return (
    <div className="relative flex h-full w-full animate-fade-in">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-3 pt-16">
        <span className="rounded-full bg-ink px-5 py-2 font-display text-kiosk-xs font-bold uppercase tracking-[0.1em] text-white">
          Step 1 of 3
        </span>
        <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">How are you eating today?</h1>
      </header>

      {ORDER_TYPES.map((o, i) => (
        <button
          key={o.value}
          data-testid={`order-type-${o.value}`}
          onClick={() => choose(o.value)}
          className={cn(
            'group relative flex h-full flex-1 flex-col items-center justify-center gap-7 transition-colors duration-300',
            i === 0 ? 'bg-paper hover:bg-cream' : 'bg-cream hover:bg-paper',
          )}
        >
          <span className="text-[11rem] leading-none transition-transform duration-500 ease-spring group-hover:scale-110 group-active:scale-95">
            {o.icon}
          </span>

          <div className="flex flex-col items-center gap-3">
            <span className="font-display text-[3.5rem] font-extrabold leading-none tracking-[-0.03em] text-ink">
              {o.label}
            </span>
            {/* Two lines' worth of height on both halves whether the blurb wraps
                or not — otherwise one column's icon and title sit lower than the
                other's, and the split screen reads as misaligned. */}
            <span className="flex min-h-[3.75rem] max-w-[26rem] items-start justify-center text-center text-kiosk-base text-ash">
              {BLURB[o.value]}
            </span>
          </div>

          {/* Amber at rest, not on hover — a touch panel has no hover, so a
              grey-until-hover CTA is simply a grey CTA. */}
          <span className="mt-4 flex h-16 items-center rounded-full bg-amber px-12 font-display text-kiosk-base font-bold text-ink shadow-brand transition-colors duration-300 group-hover:bg-amber-hover">
            Choose
          </span>
        </button>
      ))}

      {/* Hairline seam between the two halves. */}
      <span className="pointer-events-none absolute inset-y-24 left-1/2 w-px -translate-x-1/2 bg-mist" />
    </div>
  );
}
