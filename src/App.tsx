import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useAppDispatch } from '@/redux/hooks';
import { resetSession } from '@/redux/slices/settingsSlice';
import { clearCart } from '@/redux/slices/cartSlice';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';

/** Sits inside the router so it can navigate on idle. Resets kiosk to splash. */
function IdleReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // don't reset on splash, the payment/confirmation screens, or the staff history
  const enabled = ![PATHS.splash, PATHS.payment, PATHS.complete, PATHS.orders]
    .includes(location.pathname as never);

  useIdleTimer(() => {
    dispatch(clearCart());
    dispatch(resetSession());
    navigate(PATHS.splash);
  }, APP.idleTimeoutMs, enabled);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto h-screen w-screen max-w-[1920px] overflow-hidden">
        <IdleReset />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
