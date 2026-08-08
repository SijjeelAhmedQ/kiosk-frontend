import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { AppRoutes } from '@/routes/AppRoutes';
import { adminTheme } from '@/theme/antdTheme';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useAppDispatch } from '@/redux/hooks';
import { resetSession } from '@/redux/slices/settingsSlice';
import { clearCart } from '@/redux/slices/cartSlice';
import { clearCoupon } from '@/redux/slices/couponRedemptionSlice';
import { APP } from '@/constants/app.constants';
import { ADMIN_PATHS, PATHS } from '@/routes/paths';
import { VoiceControl } from '@/voice/VoiceControl';

/** Sits inside the router so it can navigate on idle. Resets kiosk to splash. */
function IdleReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Don't reset on splash or the payment/confirmation screens — and not
  // anywhere in the back office, where someone reading an order or a coupon
  // list is working, not an abandoned customer.
  const enabled =
    ![PATHS.splash, PATHS.payment, PATHS.complete].includes(location.pathname as never) &&
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

/**
 * The microphone, mounted beside the routes rather than inside a layout.
 *
 * A voice session owns a socket and an open microphone, and `AppRoutes` keys
 * each screen on its path — so anywhere below it, walking from the menu to the
 * basket would tear the conversation down mid-word. Up here it survives
 * navigation, which is the whole point: the model is the one doing the
 * navigating.
 *
 * Not in the back office. Nobody is voice-ordering a coupon report.
 */
function Voice() {
  const location = useLocation();
  if (location.pathname.startsWith(ADMIN_PATHS.root)) return null;
  return <VoiceControl />;
}

export default function App() {
  return (
    // antd is themed once, at the root: the kiosk screens don't use it today,
    // but anything that later does inherits the same palette as the back office.
    <ConfigProvider theme={adminTheme} locale={enUS}>
      <BrowserRouter>
        <div className="mx-auto h-screen w-screen max-w-[1920px] overflow-hidden">
          <IdleReset />
          <AppRoutes />
          <Voice />
        </div>
      </BrowserRouter>
    </ConfigProvider>
  );
}
