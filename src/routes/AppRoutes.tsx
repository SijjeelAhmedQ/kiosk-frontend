import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { PATHS } from './paths';
import { OrderTypeGuard } from './OrderTypeGuard';
import { LoadingScreen } from '@/components/common/LoadingScreen';

const SplashPage = lazy(() => import('@/pages/SplashPage'));
const OrderTypePage = lazy(() => import('@/pages/OrderTypePage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const PaymentPage = lazy(() => import('@/pages/PaymentPage'));
const OrderCompletePage = lazy(() => import('@/pages/OrderCompletePage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));

export function AppRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes location={location} key={location.pathname}>
        <Route path={PATHS.splash} element={<SplashPage />} />
        <Route path={PATHS.orderType} element={<OrderTypePage />} />
        <Route path={PATHS.menu} element={<OrderTypeGuard><MenuPage /></OrderTypeGuard>} />
        <Route path={PATHS.cart} element={<OrderTypeGuard><CartPage /></OrderTypeGuard>} />
        <Route path={PATHS.checkout} element={<OrderTypeGuard><CheckoutPage /></OrderTypeGuard>} />
        <Route path={PATHS.payment} element={<OrderTypeGuard><PaymentPage /></OrderTypeGuard>} />
        <Route path={PATHS.complete} element={<OrderCompletePage />} />
        <Route path={PATHS.orders} element={<OrdersPage />} />
      </Routes>
    </Suspense>
  );
}
