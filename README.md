# EMBER — Self-Order Kiosk (Frontend)

Touch-first restaurant ordering kiosk. React 19 + TypeScript + Vite + Redux Toolkit +
React Router + Tailwind + Axios. Built for a 22" Full HD (1920×1080) touch display.

> Generic "EMBER" branding only — no third-party assets. UX/interaction patterns are
> recreated, not copied.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run type-check
```

The app runs fully standalone: `src/services/api/config.ts` has `USE_MOCK = true`, so all
data comes from `src/data/menu.ts`. Flip it to `false` once the FastAPI backend is live —
no component changes needed, the Axios service modules already point at the REST endpoints.

## Flow

Splash → Language → Dine-in/Take-away → Menu (sidebar + grid) → Product detail (modifiers +
quantity) → Make-it-a-meal → Cart → Checkout → Payment → Order confirmed. The kiosk
auto-resets to the splash after inactivity (`VITE_IDLE_TIMEOUT_MS`) or 15s on the
confirmation screen.

## Architecture

- `components/` — dumb, reusable (common / controls / cards). No network, no business logic.
- `pages/` — one screen per file; compose components + read/write Redux.
- `layouts/` — Header + Sidebar + CartSummaryBar shell (`OrderLayout`).
- `redux/slices/` — settings, categories, products, cart, payment, orders (+ memoized selectors).
- `services/` — Axios client with request/response interceptors; one API module per entity.
- `utils/priceCalculator.ts` — single source of truth for unit price, line total, tax, summary.
- `routes/` — lazy-loaded routes + `OrderTypeGuard` (menu requires an order type first).

## Config (`.env`)

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_IDLE_TIMEOUT_MS=90000
VITE_CURRENCY=PKR
```
