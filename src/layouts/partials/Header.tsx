import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks';
import { ORDER_TYPES } from '@/constants/order.constants';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';

export function Header() {
  const navigate = useNavigate();
  const orderType = useAppSelector((s) => s.settings.orderType);
  const ot = ORDER_TYPES.find((o) => o.value === orderType);

  return (
    <header className="flex h-24 shrink-0 items-center justify-between border-b border-mist bg-cream px-8">
      <button onClick={() => navigate(PATHS.menu)} className="press flex items-center gap-3">
        <span className="animate-ember-pulse text-kiosk-xl">🔥</span>
        <span className="font-display text-kiosk-xl font-extrabold tracking-tight text-ink">{APP.name}</span>
      </button>
      {ot && (
        <div className="flex items-center gap-3 rounded-full bg-paper px-6 py-3 shadow-card">
          <span className="text-kiosk-lg">{ot.icon}</span>
          <span className="font-display text-kiosk-sm font-bold text-charcoal">{ot.label}</span>
        </div>
      )}
    </header>
  );
}
