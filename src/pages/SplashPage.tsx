import { useNavigate } from 'react-router-dom';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';

const TEASERS = ['Burgers', 'Fried chicken', 'Loaded fries', 'Shakes', 'Wraps'];

export default function SplashPage() {
  const navigate = useNavigate();
  return (
    <div className="relative h-full w-full bg-ink">
      {/* Staff entry — deliberately small and out of the customer's path. */}
      <button
        onClick={() => navigate(PATHS.orders)}
        className="press absolute right-6 top-6 z-20 rounded-full bg-white/10 px-5 py-3 font-display text-kiosk-xs font-bold text-white/60 transition-colors hover:bg-white/20 hover:text-white"
      >
        Orders
      </button>

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

          {/* Says what's inside before the customer commits to a tap. */}
          <div className="flex flex-wrap gap-2.5">
            {TEASERS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/15 px-5 py-2.5 font-display text-kiosk-sm font-bold text-white/70"
              >
                {t}
              </span>
            ))}
          </div>

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
