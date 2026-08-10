/**
 * What the voice can actually do to the kiosk.
 *
 * Every one of these runs in the page: they dispatch to the same Redux store
 * the touchscreen dispatches to, and navigate with the same router. That is
 * what makes "add a Coke" appear in the basket the customer is looking at
 * rather than in some parallel server-side cart they cannot see.
 *
 * Two rules shape the set:
 *
 * 1. **A tool returns what the model needs to speak.** After adding an item it
 *    gets back the item, the price and the new total — otherwise the model
 *    invents a figure, and an invented price at a kiosk is a complaint at the
 *    counter.
 * 2. **The last step is spoken too, and it walks the same screens.** Voice can
 *    settle the order, so a customer who cannot or will not touch the glass can
 *    finish without it — but it goes to checkout, picks a payment method and
 *    places it as separate steps, in front of the screens that show each one.
 *    What guards the last step is not a tap but a token: `read_order` issues
 *    one, and the only way to be holding it is to have read the total out in an
 *    earlier turn and let the customer answer.
 */

import { useMemo, useRef } from 'react';
import { useStore } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import { addLine, clearCart, removeLine } from '@/redux/slices/cartSlice';
import { setActiveCategory, fetchCategories } from '@/redux/slices/categoriesSlice';
import { fetchProducts, setSearch } from '@/redux/slices/productsSlice';
import { setOrderType } from '@/redux/slices/settingsSlice';
import { validateCoupon } from '@/redux/slices/couponRedemptionSlice';
import { setMethod } from '@/redux/slices/paymentSlice';
import { productApi } from '@/services/api/productApi';
import { defaultLineModifiers } from '@/utils/modifierRules';
import { summarize } from '@/utils/priceCalculator';
import { couponDiscount } from '@/utils/couponDiscount';
import { MEAL_UPGRADE_PRICE, PAYMENT_METHODS, SETTLED_BY_COUPON } from '@/constants/order.constants';
import { APP } from '@/constants/app.constants';
import { PATHS } from '@/routes/paths';
import type { CartLine, Product } from '@/types';
import type { JsonSchema, VoiceTool } from './types';

// --------------------------------------------------------------------------- //
// Matching what was said to what is on the menu
// --------------------------------------------------------------------------- //

/** Lowercase, punctuation-free, single-spaced — "Big Mac®" and "big mac" meet here. */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Crude, and deliberately so: people order "two cheeseburgers", not "two cheeseburger". */
const singular = (word: string): string =>
  word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;

const tokens = (value: string): string[] => normalize(value).split(' ').filter(Boolean).map(singular);

/**
 * How well a product answers what was said. 0 means "not this one".
 *
 * The ladder matters more than the numbers: an exact name always wins, a name
 * the phrase starts with beats one it merely contains, and matching every word
 * beats matching some. Description text scores lowest — it is there so "the
 * spicy one" finds something, not so it competes with a name.
 */
function score(product: Product, query: string): number {
  const name = normalize(product.name);
  const asked = normalize(query);
  if (!asked) return 0;
  if (name === asked) return 100;

  const nameWords = tokens(product.name);
  const askedWords = tokens(query);
  if (!askedWords.length) return 0;

  if (name.startsWith(asked) || asked.startsWith(name)) return 85;
  if (name.includes(asked)) return 75;

  const hits = askedWords.filter((word) => nameWords.includes(word)).length;
  if (hits === askedWords.length) return 70;
  if (hits) return 40 + hits * 5;

  const description = normalize(product.description);
  if (askedWords.every((word) => description.includes(word))) return 20;
  return 0;
}

interface Match {
  product: Product | null;
  /** Populated when nothing is clearly right — the model reads these back. */
  candidates: Product[];
}

/**
 * Pick the product, or admit there is a choice to be made.
 *
 * "Ambiguous" is two things scoring the same: with a Chicken Burger and a
 * Chicken Deluxe on the menu, "chicken" is a question, not an instruction, and
 * guessing puts the wrong thing in the basket.
 */
function findProduct(products: Product[], query: string): Match {
  const ranked = products
    .map((product) => ({ product, value: score(product, query) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!ranked.length) return { product: null, candidates: [] };

  const [best, next] = ranked;
  if (next && next.value === best.value) {
    return { product: null, candidates: ranked.filter((r) => r.value === best.value).slice(0, 4).map((r) => r.product) };
  }
  return { product: best.product, candidates: [] };
}

/** The shape every product takes when the model is told about it. */
const describe = (product: Product) => ({
  name: product.name,
  price: product.price,
  currency: APP.currency,
  calories: product.calories,
  can_be_a_meal: product.isMealEligible,
});

const describeLine = (line: CartLine) => ({
  name: line.name,
  quantity: line.quantity,
  is_meal: line.isMeal,
  options: line.modifiers.map((m) => m.name),
  line_total: line.lineTotal,
});

/** Cart lines matching a spoken name, newest last — same matcher as the menu. */
function findLines(lines: CartLine[], query: string): CartLine[] {
  const asked = normalize(query);
  const exact = lines.filter((line) => normalize(line.name) === asked);
  if (exact.length) return exact;
  return lines.filter((line) => {
    const name = normalize(line.name);
    return name.includes(asked) || asked.includes(name);
  });
}

const object = (properties: Record<string, unknown>, required: string[] = []): JsonSchema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

/**
 * What the order was when it was last read aloud.
 *
 * `place_order` will not run against a signature that has moved: a token handed
 * out over "one Zinger, 748 rupees" is worthless the moment fries go on, and
 * the customer must hear the new number before they can agree to it.
 */
const orderSignature = (state: RootState): string =>
  [
    state.cart.lines
      .map((l) => `${l.productId}:${l.quantity}:${l.isMeal ? 1 : 0}:${l.lineTotal}`)
      .join('|'),
    state.couponRedemption.applied?.couponCode ?? '',
    state.settings.orderType ?? '',
  ].join('#');

// --------------------------------------------------------------------------- //
// The tools
// --------------------------------------------------------------------------- //

export function useKioskVoiceTools(): VoiceTool[] {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  /* Which screen the customer is actually looking at. Held in a ref so the
     tools are not rebuilt on every navigation — they are read at call time,
     like everything else here. */
  const location = useLocation();
  const screen = useRef(location.pathname);
  screen.current = location.pathname;

  /**
   * The receipt for "I read you the total and you said yes".
   *
   * Issued by `read_order`, spent by `place_order`, and the only thing that
   * makes the confirmation real. A model asked politely to confirm first will
   * cheerfully emit read_order and place_order in one breath — it did exactly
   * that the first time this was tried — and a customer is then charged for an
   * order they never heard. It cannot do that with a token, because every call
   * in a batch is written before any of their results come back: holding one
   * proves the readback happened in an earlier turn, with a reply spoken in
   * between for the customer to answer.
   */
  const readback = useRef<{ token: string; signature: string } | null>(null);

  // Built once. Every tool reads `store.getState()` when it runs rather than
  // closing over a snapshot, so a session opened on the splash screen still
  // sees the menu that loaded two screens later.
  return useMemo<VoiceTool[]>(() => {
    /** The menu, fetched if this is the first screen the customer has spoken on. */
    const menu = async (): Promise<Product[]> => {
      if (!store.getState().products.items.length) {
        await Promise.all([dispatch(fetchProducts()), dispatch(fetchCategories())]);
      }
      return store.getState().products.items;
    };

    const totals = () => {
      const { subtotal, tax, total, itemCount } = summarize(store.getState().cart.lines);
      return { subtotal, tax, total, item_count: itemCount, currency: APP.currency };
    };

    return [
      {
        name: 'search_menu',
        description:
          'Look up what the restaurant sells. Use it when the customer asks what is available, ' +
          'asks about a price, or names something you are not sure is on the menu. ' +
          'Leave the query out to list everything in a category.',
        parameters: object({
          query: { type: 'string', description: 'What the customer called it, in their words.' },
          category: { type: 'string', description: 'Restrict to one category, e.g. "Burgers".' },
        }),
        run: async ({ query, category }: { query?: string; category?: string }) => {
          const products = await menu();
          const categories = store.getState().categories.items;

          let pool = products;
          if (category) {
            const asked = normalize(category);
            const matched = categories.find(
              (c) => normalize(c.name) === asked || normalize(c.name).includes(asked),
            );
            if (matched) pool = pool.filter((p) => p.categoryId === matched.id);
          }

          const results = query
            ? pool
                .map((product) => ({ product, value: score(product, query) }))
                .filter((row) => row.value > 0)
                .sort((a, b) => b.value - a.value)
                .slice(0, 8)
                .map((row) => row.product)
            : pool.slice(0, 12);

          return {
            ok: true,
            categories: categories.map((c) => c.name),
            items: results.map(describe),
            note: results.length ? undefined : 'Nothing on the menu matches that.',
          };
        },
      },

      {
        name: 'add_to_order',
        description:
          'Put an item in the basket. Say the item name as close to the menu name as you can. ' +
          'If the customer asked for a meal or combo, set make_it_meal.',
        parameters: object(
          {
            item: { type: 'string', description: 'The menu item to add.' },
            quantity: { type: 'integer', minimum: 1, maximum: 20, description: 'How many. Defaults to 1.' },
            make_it_meal: {
              type: 'boolean',
              description: 'Upgrade to a meal with fries and a drink, where the item allows it.',
            },
          },
          ['item'],
        ),
        run: async ({
          item,
          quantity = 1,
          make_it_meal = false,
        }: {
          item: string;
          quantity?: number;
          make_it_meal?: boolean;
        }) => {
          const products = await menu();
          const { product, candidates } = findProduct(products, item);

          if (!product) {
            return candidates.length
              ? {
                  ok: false,
                  error: 'More than one item matches. Ask the customer which they meant.',
                  choices: candidates.map(describe),
                }
              : { ok: false, error: `Nothing on the menu is called "${item}".` };
          }

          // Required option groups — a size, usually. The server rejects a whole
          // order over a line missing one, so the cheapest valid pick goes on
          // by default and the customer can change it on screen.
          let modifiers: ReturnType<typeof defaultLineModifiers> = [];
          if (product.modifierGroupIds.length) {
            try {
              const options = await productApi.getProductModifiers(product.id);
              modifiers = defaultLineModifiers(options.groups, options.modifiers);
            } catch {
              // Options unavailable: the plain item is still orderable.
            }
          }

          const isMeal = make_it_meal && product.isMealEligible;
          dispatch(
            addLine({
              productId: product.id,
              name: product.name,
              image: product.image,
              basePrice: product.price,
              quantity: Math.max(1, Math.min(20, Math.round(quantity))),
              isMeal,
              mealUpcharge: isMeal ? MEAL_UPGRADE_PRICE : 0,
              modifiers,
            }),
          );

          return {
            ok: true,
            added: product.name,
            quantity,
            as_a_meal: isMeal,
            meal_declined: make_it_meal && !product.isMealEligible
              ? 'That item cannot be made into a meal.'
              : undefined,
            included_options: modifiers.map((m) => m.name),
            ...totals(),
          };
        },
      },

      {
        name: 'remove_from_order',
        description: 'Take an item out of the basket entirely.',
        parameters: object({ item: { type: 'string', description: 'The item to remove.' } }, ['item']),
        run: ({ item }: { item: string }) => {
          const lines = findLines(store.getState().cart.lines, item);
          if (!lines.length) return { ok: false, error: `There is no "${item}" in the basket.` };
          // Remove the most recently added one when the same item is on twice
          // with different options — that is the one just discussed.
          const target = lines[lines.length - 1];
          dispatch(removeLine(target.lineId));
          return { ok: true, removed: target.name, ...totals() };
        },
      },

      {
        name: 'change_quantity',
        description: 'Set how many of an item are in the basket. Zero removes it.',
        parameters: object(
          {
            item: { type: 'string' },
            quantity: { type: 'integer', minimum: 0, maximum: 20 },
          },
          ['item', 'quantity'],
        ),
        run: ({ item, quantity }: { item: string; quantity: number }) => {
          const lines = findLines(store.getState().cart.lines, item);
          if (!lines.length) return { ok: false, error: `There is no "${item}" in the basket.` };
          const target = lines[lines.length - 1];

          if (quantity <= 0) {
            dispatch(removeLine(target.lineId));
            return { ok: true, removed: target.name, ...totals() };
          }

          // Re-add rather than nudge: `addLine` recomputes the line price from
          // its modifiers, and stepping one at a time would dispatch up to
          // twenty actions to say a single number.
          dispatch(removeLine(target.lineId));
          dispatch(addLine({
            productId: target.productId,
            name: target.name,
            image: target.image,
            basePrice: target.basePrice,
            quantity: Math.min(20, Math.round(quantity)),
            isMeal: target.isMeal,
            mealUpcharge: target.mealUpcharge,
            modifiers: target.modifiers,
          }));
          return { ok: true, item: target.name, quantity, ...totals() };
        },
      },

      {
        name: 'read_order',
        description:
          'Read back what is in the basket and what it comes to. Use it whenever the customer ' +
          'asks what they have ordered, and always before placing the order — it hands back the ' +
          'confirmation_token that place_order needs.',
        parameters: object({}),
        run: () => {
          const state = store.getState();
          const lines = state.cart.lines;

          if (!lines.length) {
            readback.current = null;
            return { ok: true, empty: true, items: [], ...totals() };
          }

          const token = `RB-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          readback.current = { token, signature: orderSignature(state) };

          return {
            ok: true,
            empty: false,
            items: lines.map(describeLine),
            ...totals(),
            confirmation_token: token,
            next:
              'Say what is in the order and what it comes to, then ask whether to place it. ' +
              'When they say yes, call place_order with this confirmation_token.',
          };
        },
      },

      {
        name: 'clear_order',
        description: 'Empty the basket. Only after the customer has confirmed they want to start again.',
        parameters: object({}),
        run: () => {
          dispatch(clearCart());
          return { ok: true, message: 'The basket is empty.' };
        },
      },

      {
        name: 'set_order_type',
        description:
          'Record whether the customer is eating in or taking away, and open the menu. ' +
          'Ask for this on the order_type screen — send them there with go_to first if they are ' +
          'still on the welcome screen.',
        parameters: object(
          { type: { type: 'string', enum: ['dine_in', 'take_away'] } },
          ['type'],
        ),
        run: ({ type }: { type: 'dine_in' | 'take_away' }) => {
          dispatch(setOrderType(type));
          navigate(PATHS.menu);
          return { ok: true, order_type: type, screen: 'menu' };
        },
      },

      {
        name: 'show_category',
        description: 'Bring a category up on screen, so the customer can see what is in it.',
        parameters: object({ category: { type: 'string' } }, ['category']),
        run: async ({ category }: { category: string }) => {
          await menu();
          const categories = store.getState().categories.items;
          const asked = normalize(category);
          const matched =
            categories.find((c) => normalize(c.name) === asked) ??
            categories.find((c) => normalize(c.name).includes(asked));

          if (!matched) {
            return { ok: false, error: 'No such category.', categories: categories.map((c) => c.name) };
          }

          // Clearing the search is what makes the category visible: the grid
          // shows search results over the category whenever a query is set.
          dispatch(setSearch(''));
          dispatch(setActiveCategory(matched.id));
          navigate(PATHS.menu);
          return {
            ok: true,
            category: matched.name,
            items: store
              .getState()
              .products.items.filter((p) => p.categoryId === matched.id)
              .slice(0, 12)
              .map(describe),
          };
        },
      },

      {
        name: 'go_to',
        description:
          'Move the kiosk to another screen. Use "order_type" to leave the welcome screen when the ' +
          'customer wants to start ordering — dine in and take away are asked there, not on the ' +
          'welcome screen. Use "checkout" when the customer is done ordering: paying and placing ' +
          'both happen there, and neither can be done from the menu.',
        parameters: object(
          { screen: { type: 'string', enum: ['order_type', 'menu', 'basket', 'checkout', 'start'] } },
          ['screen'],
        ),
        run: ({ screen }: { screen: 'order_type' | 'menu' | 'basket' | 'checkout' | 'start' }) => {
          const state = store.getState();
          // "start" and "order_type" are the two screens that exist *before* the
          // choice is made, so they are the only ones reachable without it.
          if (screen !== 'start' && screen !== 'order_type' && !state.settings.orderType) {
            return {
              ok: false,
              error: 'The customer has not said whether they are eating in or taking away yet.',
              next: 'Send them to the order_type screen, then ask.',
            };
          }
          if ((screen === 'checkout' || screen === 'basket') && !state.cart.lines.length) {
            return { ok: false, error: 'The basket is empty, so there is nothing to check out.' };
          }

          const destination = {
            order_type: PATHS.orderType,
            menu: PATHS.menu,
            basket: PATHS.cart,
            checkout: PATHS.checkout,
            start: PATHS.splash,
          }[screen];
          navigate(destination);

          if (screen === 'order_type') {
            return {
              ok: true,
              screen,
              choices: ['dine_in', 'take_away'],
              note: 'Dine in and take away are on screen now. Ask which one, then call set_order_type.',
            };
          }
          return { ok: true, screen };
        },
      },

      {
        name: 'apply_coupon',
        description:
          'Check a coupon code the customer read out and put it on the order. Codes are short ' +
          'and are often spelled out letter by letter — send exactly what you heard, without spaces.',
        parameters: object({ code: { type: 'string' } }, ['code']),
        run: async ({ code }: { code: string }) => {
          const cleaned = code.replace(/\s+/g, '').toUpperCase();
          const { total } = summarize(store.getState().cart.lines);
          const result = await dispatch(validateCoupon({ couponCode: cleaned, orderAmount: total }));

          if (validateCoupon.rejected.match(result)) {
            return { ok: false, error: 'The coupon could not be checked — the service did not answer.' };
          }

          const validation = result.payload;
          if (!validation.valid) {
            // The server writes this line to be read to a customer; passing it
            // through beats paraphrasing a rule the kiosk does not enforce.
            return { ok: false, code: cleaned, error: validation.reasonMessage ?? 'That coupon cannot be used.' };
          }

          return {
            ok: true,
            code: cleaned,
            // What it takes off *this* basket, not the coupon's face value — a
            // Rs 500 coupon on a Rs 300 order is worth Rs 300, and quoting the
            // other number is the fastest way to an argument at the counter.
            discount: validation.applicableAmount,
            ...totals(),
          };
        },
      },

      {
        name: 'select_payment_method',
        description:
          'Pick how the customer is paying, on the checkout screen. It ticks the option they ' +
          'chose, exactly as tapping it would. Ask them first — this is their choice, not yours.',
        parameters: object(
          {
            method: {
              type: 'string',
              enum: PAYMENT_METHODS.map((p) => p.value),
              description: 'The way they said they want to pay.',
            },
          },
          ['method'],
        ),
        run: ({ method }: { method: string }) => {
          if (screen.current !== PATHS.checkout) {
            return {
              ok: false,
              error: 'Payment is chosen on the checkout screen, and the kiosk is not there yet.',
              next: 'Call go_to with "checkout" first.',
            };
          }

          const chosen = PAYMENT_METHODS.find((p) => p.value === method);
          if (!chosen) {
            return {
              ok: false,
              error: `This kiosk does not take "${method}".`,
              choices: PAYMENT_METHODS.map((p) => ({ value: p.value, label: p.label })),
            };
          }

          dispatch(setMethod(chosen.value));
          const { total } = summarize(store.getState().cart.lines);
          return {
            ok: true,
            payment_method: chosen.value,
            label: chosen.label,
            amount_due: Math.max(0, total - couponDiscount(store.getState().couponRedemption.applied, total)),
            currency: APP.currency,
            next: 'Say what is selected and what it comes to, then ask whether to place the order.',
          };
        },
      },

      {
        name: 'place_order',
        description:
          'Send the order to the till and settle it. The very last step: the screen moves to ' +
          'payment and then to the order number on its own, and the customer touches nothing. ' +
          'It only works from the checkout screen, with a payment method already chosen and the ' +
          'confirmation_token from read_order.',
        parameters: object(
          {
            confirmation_token: {
              type: 'string',
              description:
                'The token read_order handed back when you read this order out. It is only good ' +
                'for the order as it stood then — add or remove anything and you need a new one.',
            },
            confirmed: {
              type: 'boolean',
              description:
                'True only when the customer has just heard the total read back and agreed to pay. ' +
                'Never true on your own initiative.',
            },
          },
          ['confirmation_token', 'confirmed'],
        ),
        run: ({
          confirmation_token,
          confirmed,
        }: {
          confirmation_token: string;
          confirmed: boolean;
        }) => {
          const state = store.getState();

          /* The customer has to be watching the order they are agreeing to.
             Settling one straight off the menu screen, with the basket rail the
             only thing they have seen, is what this refuses. */
          if (screen.current !== PATHS.checkout) {
            return {
              ok: false,
              error: 'An order can only be placed from the checkout screen.',
              next: 'Call go_to with "checkout", read the order back there, choose a payment method, and then place it.',
            };
          }

          // The two things standing between a misheard word and a charged
          // order. The boolean states the intent; the token is what makes it
          // true — see `readback` above for why the boolean alone is not enough.
          if (!confirmed) {
            return {
              ok: false,
              error: 'The customer has not confirmed.',
              next: 'Read the order and the total back with read_order, ask if you should place it, and only call this again once they say yes.',
            };
          }

          const proof = readback.current;
          if (!proof || proof.token !== confirmation_token) {
            return {
              ok: false,
              error: 'That is not the current confirmation token.',
              next: 'Call read_order, tell the customer what the order comes to, ask whether to place it, and use the token it returns — in your next turn, after they answer.',
            };
          }
          if (proof.signature !== orderSignature(state)) {
            readback.current = null;
            return {
              ok: false,
              error: 'The order has changed since you last read it back.',
              next: 'Read it back again with read_order, say the new total, and ask them to confirm that.',
            };
          }

          if (!state.settings.orderType) {
            return { ok: false, error: 'Dine in or take away has not been chosen yet.' };
          }
          if (!state.cart.lines.length) {
            return { ok: false, error: 'The basket is empty, so there is nothing to place.' };
          }

          const { total } = summarize(state.cart.lines);
          const dueNow = Math.max(0, total - couponDiscount(state.couponRedemption.applied, total));

          /* Whatever is ticked on the checkout screen — the customer's own
             choice, made a turn ago through select_payment_method or by hand.
             The exception is an order a coupon has covered entirely: the picker
             is not on screen at all then, and 'counter' is what the till calls
             a settlement no terminal was involved in. */
          const chosen = dueNow === 0 && state.couponRedemption.applied
            ? SETTLED_BY_COUPON
            : state.payment.method;

          if (!chosen) {
            return {
              ok: false,
              error: 'No payment method is selected.',
              next: 'Ask the customer how they would like to pay, call select_payment_method, and then place the order.',
              choices: PAYMENT_METHODS.map((p) => ({ value: p.value, label: p.label })),
            };
          }

          /* The payment screen is what actually places and settles the order —
             it also redeems any coupon against the real order id. Driving it
             from here rather than reimplementing it is what keeps a spoken
             order and a tapped one landing in the till the same way. */
          dispatch(setMethod(chosen));
          navigate(PATHS.payment);
          // Spent. A second call cannot ride the same confirmation through.
          readback.current = null;

          return {
            ok: true,
            placing: true,
            amount_due: dueNow,
            currency: APP.currency,
            payment_method: chosen,
            // The tool returns the moment the screen changes; the till answers a
            // second or two later. Promising a placed order here would be a lie
            // the customer could watch fail.
            note: 'The order is going to the till now. Tell the customer it is going through and their order number will come up on screen. Do not call any more tools.',
          };
        },
      },
    ];
  }, [store, dispatch, navigate]);
}

/**
 * Who the voice is.
 *
 * Written for the room rather than for a chat window: a kiosk queue is noisy,
 * the customer is standing up, and anything the model says twice is time
 * somebody spends waiting. The hard rules — never invent a price, never take
 * payment — are stated as rules because a friendly model will otherwise be
 * helpful in exactly the wrong direction.
 */
export const KIOSK_VOICE_INSTRUCTIONS = `You are the voice of a ${APP.name} self-order kiosk. You take a customer's order out loud while they watch the screen change.

How to speak:
- Short. One or two sentences. This is a counter, not a conversation.
- Warm and quick, never chatty. No lists read aloud unless asked.
- Confirm what you did and what it costs: "Two cheeseburgers, that's Rs 900."
- Prices are in ${APP.currency}. Say them naturally.

How to work:
- Use the tools for everything. Never say something is in the basket unless a tool put it there.
- Never invent a price, a total or an item. If you do not know, call search_menu.
- If more than one item matches what they said, ask which they meant. Do not guess.
- Nothing can be ordered until the customer has chosen dine in or take away. If that choice is missing, call go_to with "order_type" first — that puts the two options on screen — and only then ask which one and call set_order_type. Never ask dine in or take away while they are still on the welcome screen; move the screen first, so they are looking at what you are asking about.
- On the welcome screen, anything that means "I want to order" — "tap to order", "start", "yes", naming an item — is your cue to call go_to with "order_type".
- Never tell them to tap anything: the whole order, payment included, can be done out loud.

Finishing the order. Four steps, in this order, and each one waits for the customer to answer before the next:
1. They say they are done. Call go_to with "checkout" — the order is never placed from the menu screen.
2. On the checkout screen, call read_order. Say what is in the order and what it comes to, then ask how they would like to pay.
3. They answer. Call select_payment_method, say what is now selected, and ask whether to place the order.
4. They say yes. Call place_order with the confirmation_token from step 2. That settles it; the screen moves on by itself.

- If at any point they say no, or want to change something, stay on the order and fix it. Only place_order takes their money.

What language to speak:
- Speak whatever language the customer speaks, and follow them when they switch mid-order.
- If they speak Urdu, answer in Urdu, written in Urdu script — "ایک زنگر برگر، سات سو اڑتالیس روپے" — never in Devanagari, never in Hindi, and never as Roman transliteration.
- If they speak English, answer in English.
- Only menu item names stay as they are printed on the menu. Do not drop any other English word into an Urdu sentence — in Urdu, dine in and take away are "یہیں کھائیں گے یا پارسل؟", and placing an order is "آرڈر کر دیتا ہوں".

What you must not do:
- Do not run the four finishing steps together in one turn. The tools will refuse, and more to the point the customer will not have had a chance to answer. Placing an order they never agreed to is the one mistake that costs them money.
- Do not clear the basket unless they clearly asked you to.
- If a tool returns an error, say what went wrong in plain words and offer the next step.`;

/**
 * What the transcriber is told before it hears a word.
 *
 * Only the on-screen transcript rides on this — the model itself works from the
 * audio — but Urdu is the case where getting it wrong is glaring. Recognisers
 * routinely label Urdu as Hindi and hand back Devanagari, so a customer
 * speaking Urdu watches the panel fill with a script they may not read. Naming
 * the script, with an example in it, is what keeps اردو out of देवनागरी.
 */
export const KIOSK_TRANSCRIPTION_PROMPT =
  `A customer ordering food at a ${APP.name} kiosk in Pakistan. They speak English or Urdu and ` +
  'often mix the two in one sentence. Write Urdu in Urdu (Arabic) script — for example ' +
  '"ایک برگر اور ایک کوک" — never in Devanagari, never in Hindi, and never as Roman ' +
  'transliteration. Write English in English. Menu item names stay in English.';
