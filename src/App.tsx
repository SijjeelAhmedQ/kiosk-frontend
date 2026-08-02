import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useAppDispatch } from '@/redux/hooks';
import { resetSession } from '@/redux/slices/settingsSlice';
import { clearCart } from '@/redux/slices/cartSlice';
import { clearCoupon } from '@/redux/slices/couponRedemptionSlice';
import { APP } from '@/constants/app.constants';
import { ADMIN_PATHS, PATHS } from '@/routes/paths';

/** Sits inside the router so it can navigate on idle. Resets kiosk to splash. */
function IdleReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Don't reset on splash, the payment/confirmation screens, or the staff
  // history — and not anywhere in the back office, where someone reading a
  // coupon list is working, not an abandoned customer.
  const enabled =
    ![PATHS.splash, PATHS.payment, PATHS.complete, PATHS.orders].includes(location.pathname as never) &&
    !location.pathname.startsWith(ADMIN_PATHS.root);

  useIdleTimer(() => {
    dispatch(clearCart());
    // A validated-but-unspent coupon must never carry over to the next customer.
    dispatch(clearCoupon());
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
