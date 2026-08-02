import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchCategories } from '@/redux/slices/categoriesSlice';
import { APP } from '@/constants/app.constants';
import { ADMIN_PATHS, PATHS } from '@/routes/paths';

/** How many category chips fit on one line before it starts to read as a list. */
const MAX_TEASERS = 5;

/** Widths for the placeholder chips — uneven, so it reads as words, not a bar. */
const SKELETON_WIDTHS = ['7rem', '9.5rem', '8rem', '6.5rem'];

export default function SplashPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const categories = useAppSelector((s) => s.categories.items);
  // A fetch that returns nothing leaves the store looking exactly like a fetch
  // that hasn't started, so the settled flag is tracked here rather than read
  // off `loading` — otherwise an empty menu shimmers forever.
  const [settled, setSettled] = useState(false);

  // Prefetched here purely so the strip below is real. The menu re-fetches on
  // its own once an order type is picked.
  useEffect(() => {
    if (categories.length) { setSettled(true); return; }
    dispatch(fetchCategories()).finally(() => setSettled(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teasers = categories.slice(0, MAX_TEASERS);
  const extra = categories.length - teasers.length;
  // Once settled with nothing to show — empty menu, or the API is down — the
  // strip is dropped rather than faked. The splash still reads as "tap to order".
  const showTeasers = !settled || categories.length > 0;

  return (
    <div className="relative h-full w-full bg-ink">
      {/* Staff entries — deliberately small and out of the customer's path. */}
      <div className="absolute right-6 top-6 z-20 flex gap-2">
        <button
          onClick={() => navigate(ADMIN_PATHS.orders)}
          className="press rounded-full bg-white/10 px-5 py-3 font-display text-kiosk-xs font-bold text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          Orders
        </button>
        <button
          onClick={() => navigate(ADMIN_PATHS.campaigns)}
          className="press rounded-full bg-white/10 px-5 py-3 font-display text-kiosk-xs font-bold text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          Coupons
        </button>
      </div>

      <button
        onClick={() => navigate(PATHS.orderType)}
        className="relative flex h-full w-full items-center overflow-hidden bg-ink text-left text-white"
      >
        {/* A single oversized brand tile, bled off the right edge. */}
        <div className="pointer-events-none absolute -right-40 top-1/2 flex h-[760px] w-[760px] -translate-y-1/2 rotate-[-12deg] items-center justify-center rounded-[7rem] bg-flame">
          <span className="-rotate-[-12deg] text-[19rem] leading-none">🔥</span>
        </div>
        <div className="pointer-events-none absolute -right-24 top-1/2 h-[820px] w-[820px] -translate-y-1/2 rounded-full bg-flame/20 blur-[140px]" />

        <div className="relative z-10 flex max-w-[900px] flex-col gap-10 pl-32">
          <span className="w-fit rounded-full bg-white/10 px-5 py-2.5 font-display text-kiosk-xs font-bold uppercase tracking-[0.16em] text-white/70">
            Self order &amp; pay
          </span>

          <h1 className="font-display text-[7rem] font-extrabold leading-[0.92] tracking-[-0.04em]">
            {APP.name}
          </h1>

          {/* Says what's inside before the customer commits to a tap — the real
              categories, so it can never advertise something we don't sell.
              Fixed height keeps the headline still when they swap in. */}
          {showTeasers && (
            <div className="flex min-h-[2.875rem] flex-wrap items-center gap-2.5">
              {!settled ? (
                SKELETON_WIDTHS.map((w, i) => (
                  <span
                    key={i}
                    className="skeleton-dark h-[2.875rem] rounded-full"
                    style={{ width: w, '--shim-delay': `${i * 0.16}s` } as CSSProperties}
                  />
                ))
              ) : (
                <>
                  {teasers.map((c, i) => (
                    <span
                      key={c.id}
                      className="animate-pop-in rounded-full border border-white/15 px-5 py-2.5 font-display text-kiosk-sm font-bold text-white/70"
                      style={{ animationDelay: `${i * 0.07}s` }}
                    >
                      {c.name}
                    </span>
                  ))}
                  {extra > 0 && (
                    <span
                      className="animate-pop-in rounded-full border border-white/15 px-5 py-2.5 font-display text-kiosk-sm font-bold text-white/40"
                      style={{ animationDelay: `${teasers.length * 0.07}s` }}
                    >
                      +{extra} more
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-6">
            <span className="flex items-center gap-3.5 rounded-full bg-amber px-12 py-6 font-display text-kiosk-lg font-extrabold text-ink shadow-brand-lg">
              <span className="h-3 w-3 animate-dot-blink rounded-full bg-ink" />
              Tap to order
            </span>
            <span className="text-kiosk-sm text-white/40">Ready in minutes</span>
          </div>
        </div>
      </button>
    </div>
  );
}
