import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { APP } from '@/constants/app.constants';
import { ADMIN_PATHS, PATHS } from '@/routes/paths';

/**
 * The back office shell.
 *
 * Separate from OrderLayout on purpose: the kiosk is a full-screen, touch-first
 * flow with a basket rail, and none of that belongs around a coupon table. What
 * the two share is the palette and the type family, so this still looks like the
 * same product.
 */

/* Three groups, because they are three jobs: watching what sold, keeping the
   menu right, and running the promotions on top of it. Orders leads — it is the
   one opened every day, the others only when something changes. */
const NAV = [
  { group: 'Menu', items: [
    { to: ADMIN_PATHS.categories, label: 'Categories', icon: '🗂️' },
    { to: ADMIN_PATHS.products, label: 'Products', icon: '🍔' },
  ] },
  { group: 'Coupons', items: [
    { to: ADMIN_PATHS.campaigns, label: 'Campaigns', icon: '🎯' },
    { to: ADMIN_PATHS.coupons, label: 'Coupons', icon: '🎟️' },
    { to: ADMIN_PATHS.history, label: 'Redemptions', icon: '📊' },
  ] },
  { group: 'Sales', items: [
    { to: ADMIN_PATHS.orders, label: 'Orders', icon: '🧾' },
  ] },
] as const;

export function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full overflow-hidden bg-cream">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-mist bg-paper">
        <div className="px-6 py-7">
          <p className="font-display text-base font-extrabold leading-tight text-ink">{APP.name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ash">Back office</p>
        </div>

        <nav className="flex flex-col gap-5 px-3">
          {NAV.map((section) => (
            <div key={section.group} className="flex flex-col gap-1">
              <p className="px-4 pb-1 font-display text-xs font-bold text-ash">{section.group}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 font-display text-sm font-bold',
                      'transition-colors duration-150',
                      isActive ? 'bg-amber text-ink shadow-brand' : 'text-charcoal hover:bg-cream',
                    )
                  }
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Order history used to sit down here, apart from the nav. It is a
            list like the others now, so it lives with them. */}
        <div className="mt-auto flex flex-col gap-1 border-t border-mist p-3">
          <button
            type="button"
            onClick={() => navigate(PATHS.splash)}
            className="press flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-display text-sm font-bold text-ash transition-colors hover:bg-cream"
          >
            <span className="text-base leading-none">↩</span>
            Back to order
          </button>
        </div>
      </aside>

      {/* The only scroll container on the page — the sidebar stays put. */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
