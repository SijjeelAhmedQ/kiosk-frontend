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
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-mist bg-paper px-6">
      <button
        onClick={() => navigate(PATHS.menu)}
        className="press flex items-center gap-3 rounded-full pr-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-flame text-fk-base leading-none">
          🔥
        </span>
        <span className="font-display text-fk-base font-extrabold text-ink">{APP.name}</span>
      </button>

      {ot && (
        <div className="flex items-center gap-2.5 rounded-full bg-cream px-5 py-2.5 animate-fade-in">
          <span className="text-fk-sm leading-none">{ot.icon}</span>
          <span className="font-display text-fk-xs font-bold text-charcoal">{ot.label}</span>
        </div>
      )}
    </header>
  );
}
