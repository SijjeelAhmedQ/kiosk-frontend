import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/redux/hooks';
import { setOrderType } from '@/redux/slices/settingsSlice';
import { fetchCategories } from '@/redux/slices/categoriesSlice';
import { fetchProducts } from '@/redux/slices/productsSlice';
import { ORDER_TYPES } from '@/constants/order.constants';
import type { OrderType } from '@/types';
import { PATHS } from '@/routes/paths';

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
    <div className="flex h-full w-full flex-col items-center justify-center gap-14 bg-cream px-8 animate-fade-in">
      <h1 className="font-display text-kiosk-2xl font-extrabold text-ink">How would you like to eat?</h1>
      <div className="flex gap-8">
        {ORDER_TYPES.map((o) => (
          <button
            key={o.value}
            onClick={() => choose(o.value)}
            className="press flex h-[420px] w-[380px] flex-col items-center justify-center gap-6 rounded-xl3 border-2 border-mist bg-paper shadow-card transition-colors hover:border-flame"
          >
            <span className="text-[8rem] leading-none">{o.icon}</span>
            <span className="font-display text-kiosk-2xl font-bold text-charcoal">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
