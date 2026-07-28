import { useState, type ReactNode } from 'react';
import { Header } from './partials/Header';
import { Sidebar } from './partials/Sidebar';
import { CartSummaryBar } from './partials/CartSummaryBar';

interface OrderLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  showCartBar?: boolean;
}

export function OrderLayout({ children, showSidebar = true, showCartBar = true }: OrderLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <div className="flex h-full flex-col bg-cream">
      <Header />
      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        )}
        <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      {showCartBar && <CartSummaryBar />}
    </div>
  );
}
