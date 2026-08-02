import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ADMIN_PATHS, PATHS } from './paths';
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

/* Back office. Lazy like everything else, so a customer ordering a burger never
   downloads the coupon admin. */
const AdminLayout = lazy(() =>
  import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const CategoryListPage = lazy(() => import('@/pages/admin/CategoryListPage'));
const CategoryFormPage = lazy(() => import('@/pages/admin/CategoryFormPage'));
const ProductListPage = lazy(() => import('@/pages/admin/ProductListPage'));
const ProductFormPage = lazy(() => import('@/pages/admin/ProductFormPage'));
const CampaignListPage = lazy(() => import('@/pages/admin/CampaignListPage'));
const CampaignFormPage = lazy(() => import('@/pages/admin/CampaignFormPage'));
const GenerateCouponsPage = lazy(() => import('@/pages/admin/GenerateCouponsPage'));
const CouponListPage = lazy(() => import('@/pages/admin/CouponListPage'));
const CouponDetailPage = lazy(() => import('@/pages/admin/CouponDetailPage'));
const CouponHistoryPage = lazy(() => import('@/pages/admin/CouponHistoryPage'));

export function AppRoutes() {
  const location = useLocation();

  /* Keying on the path remounts each kiosk screen so its entrance animation
     replays. The admin section is a nested layout, though, and remounting it
     on every click would tear the sidebar down with it — so it keys as one. */
  const routeKey = location.pathname.startsWith(ADMIN_PATHS.root) ? 'admin' : location.pathname;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes location={location} key={routeKey}>
        <Route path={PATHS.splash} element={<SplashPage />} />
        <Route path={PATHS.orderType} element={<OrderTypePage />} />
        <Route path={PATHS.menu} element={<OrderTypeGuard><MenuPage /></OrderTypeGuard>} />
        <Route path={PATHS.cart} element={<OrderTypeGuard><CartPage /></OrderTypeGuard>} />
        <Route path={PATHS.checkout} element={<OrderTypeGuard><CheckoutPage /></OrderTypeGuard>} />
        <Route path={PATHS.payment} element={<OrderTypeGuard><PaymentPage /></OrderTypeGuard>} />
        <Route path={PATHS.complete} element={<OrderCompletePage />} />
        <Route path={PATHS.orders} element={<OrdersPage />} />

        {/* Back office — its own layout, and no OrderTypeGuard: an admin has
            not chosen dine-in or take-away and should not be asked to. */}
        <Route path={ADMIN_PATHS.root} element={<AdminLayout />}>
          <Route index element={<Navigate to={ADMIN_PATHS.products} replace />} />

          {/* The menu. "new" is declared before ":id", or a category could be
              called "new" and shadow the create form. */}
          <Route path="categories" element={<CategoryListPage />} />
          <Route path="categories/new" element={<CategoryFormPage />} />
          <Route path="categories/:categoryId" element={<CategoryFormPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:productId" element={<ProductFormPage />} />

          <Route path="campaigns" element={<CampaignListPage />} />
          <Route path="campaigns/new" element={<CampaignFormPage />} />
          <Route path="campaigns/:campaignId" element={<CampaignFormPage />} />
          <Route path="campaigns/:campaignId/generate" element={<GenerateCouponsPage />} />
          <Route path="coupons" element={<CouponListPage />} />
          <Route path="coupons/:couponCode" element={<CouponDetailPage />} />
          <Route path="history" element={<CouponHistoryPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
