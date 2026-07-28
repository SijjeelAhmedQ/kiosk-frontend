import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks';
import { selectCartSummary, selectCartCount } from '@/redux/selectors';
import { formatCurrency } from '@/utils/currency';
import { Button } from '@/components/common/Button';
import { PATHS } from '@/routes/paths';

export function CartSummaryBar() {
  const navigate = useNavigate();
  const count = useAppSelector(selectCartCount);
  const { total } = useAppSelector(selectCartSummary);

  if (count === 0) return null;

  return (
    <div className="shrink-0 border-t border-mist bg-cream px-8 py-5 shadow-bar animate-slide-up">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 min-w-14 items-center justify-center rounded-2xl bg-flame px-4 font-display text-kiosk-lg font-bold text-white">
            {count}
          </span>
          <div>
            <p className="text-kiosk-xs text-ash">Order total</p>
            <p className="font-display text-kiosk-xl font-bold text-charcoal">{formatCurrency(total)}</p>
          </div>
        </div>
        <Button size="xl" onClick={() => navigate(PATHS.cart)} className="min-w-[280px]">
          Review order →
        </Button>
      </div>
    </div>
  );
}
