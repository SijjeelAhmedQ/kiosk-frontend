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
 * 2. **Nothing here spends money.** Voice can fill the basket and walk to
 *    checkout; the customer taps to pay. Payment is the one step where a
 *    misheard word is not recoverable, so it stays on the glass.
 */

import { useMemo } from 'react';
import { useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import { addLine, clearCart, removeLine } from '@/redux/slices/cartSlice';
import { setActiveCategory, fetchCategories } from '@/redux/slices/categoriesSlice';
import { fetchProducts, setSearch } from '@/redux/slices/productsSlice';
import { setOrderType } from '@/redux/slices/settingsSlice';
import { validateCoupon } from '@/redux/slices/couponRedemptionSlice';
import { productApi } from '@/services/api/productApi';
import { defaultLineModifiers } from '@/utils/modifierRules';
import { summarize } from '@/utils/priceCalculator';
import { MEAL_UPGRADE_PRICE } from '@/constants/order.constants';
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

// --------------------------------------------------------------------------- //
// The tools
// --------------------------------------------------------------------------- //

export function useKioskVoiceTools(): VoiceTool[] {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

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
          "Read back what is in the basket and what it comes to. Use this before sending the " +
          'customer to checkout, and whenever they ask what they have ordered.',
        parameters: object({}),
        run: () => {
          const lines = store.getState().cart.lines;
          return {
            ok: true,
            empty: lines.length === 0,
            items: lines.map(describeLine),
            ...totals(),
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
          'Record whether the customer is eating in or taking away. This has to be set before ' +
          'the menu will open, so ask for it first if it is missing.',
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
          'Move the kiosk to another screen. Use "checkout" when the customer is done ordering — ' +
          'they finish the payment themselves on the screen.',
        parameters: object(
          { screen: { type: 'string', enum: ['menu', 'basket', 'checkout', 'start'] } },
          ['screen'],
        ),
        run: ({ screen }: { screen: 'menu' | 'basket' | 'checkout' | 'start' }) => {
          const state = store.getState();
          if (screen !== 'start' && !state.settings.orderType) {
            return {
              ok: false,
              error: 'The customer has not said whether they are eating in or taking away yet.',
            };
          }
          if ((screen === 'checkout' || screen === 'basket') && !state.cart.lines.length) {
            return { ok: false, error: 'The basket is empty, so there is nothing to check out.' };
          }

          const destination = {
            menu: PATHS.menu,
            basket: PATHS.cart,
            checkout: PATHS.checkout,
            start: PATHS.splash,
          }[screen];
          navigate(destination);
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
- Before anything else, the customer must have chosen dine in or take away. If that is missing, ask, then call set_order_type.
- When they are finished, read the order back with read_order and send them to checkout with go_to.

What you must not do:
- You cannot take payment. When the order is right, tell them to tap the payment button on screen.
- Do not clear the basket unless they clearly asked you to.
- If a tool returns an error, say what went wrong in plain words and offer the next step.`;
