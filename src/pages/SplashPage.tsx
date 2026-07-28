import { useNavigate } from 'react-router-dom';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';

export default function SplashPage() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(PATHS.orderType)}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-ink text-white"
    >
      {/* ambient ember glow */}
      <div className="pointer-events-none absolute -top-40 h-[520px] w-[520px] rounded-full bg-flame/30 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 h-[420px] w-[420px] rounded-full bg-amber/20 blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
        <span className="animate-ember-pulse text-[9rem] leading-none">🔥</span>
        <p className="text-kiosk-lg font-semibold">Hello</p>
        <h1 className="font-display text-kiosk-3xl font-extrabold tracking-tight">{APP.name}</h1>
        <p className="text-kiosk-lg text-white/70">{APP.tagline}</p>
      </div>

      <div className="absolute bottom-24 z-10 flex flex-col items-center gap-3 animate-slide-up">
        <span className="rounded-full border-2 border-white/30 px-10 py-5 font-display text-kiosk-lg font-bold">
          Touch anywhere to start
        </span>
        <span className="text-kiosk-sm text-white/50">Order &amp; pay in seconds</span>
      </div>
    </button>
  );
}
