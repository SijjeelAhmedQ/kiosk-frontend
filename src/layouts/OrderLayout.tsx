import { useState, type ReactNode } from 'react';
import { Header } from './partials/Header';
import { Sidebar } from './partials/Sidebar';
import { BasketPanel } from './partials/BasketPanel';

interface OrderLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  /** Renders the persistent basket rail down the right edge. */
  showBasket?: boolean;
}

/**
 * Three zones: category rail · canvas · basket. The basket never leaves the
 * screen, so "what have I ordered so far" is never a navigation away.
 */
export function OrderLayout({ children, showSidebar = true, showBasket = true }: OrderLayoutProps) {
  // Compact tiles by default — the canvas is worth more than the labels.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="flex h-full flex-col bg-cream">
      <Header />
      <div className="flex min-h-0 flex-1 gap-px">
        {showSidebar && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        )}
        <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">{children}</main>
        {showBasket && <BasketPanel />}
      </div>
    </div>
  );
}
