import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks';
import { PATHS } from './paths';

/** Menu and beyond require an order type to have been chosen. */
export function OrderTypeGuard({ children }: { children: ReactNode }) {
  const orderType = useAppSelector((s) => s.settings.orderType);
  if (!orderType) return <Navigate to={PATHS.orderType} replace />;
  return <>{children}</>;
}
