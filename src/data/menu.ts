/**
 * Mock menu — stands in for the backend until the FastAPI layer is wired.
 * Product "image" fields hold an emoji glyph so the client is fully
 * self-contained (no binary/branded assets). Swap for real image URLs later.
 */
import type { Category, Modifier, ModifierGroup, Product } from '@/types';

export const categories: Category[] = [
  { id: 'burgers', name: 'Burgers', icon: '🍔' },
  { id: 'chicken', name: 'Chicken', icon: '🍗' },
  { id: 'sides', name: 'Fries & Sides', icon: '🍟' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'shakes', name: 'Shakes', icon: '🥛' },
  { id: 'sweets', name: 'Sweets', icon: '🍩' },
];

export const modifiers: Modifier[] = [
  { id: 'm_cheese', name: 'Extra Cheese', priceDelta: 250, calories: 90 },
  { id: 'm_bacon', name: 'Smoked Bacon', priceDelta: 420, calories: 120 },
  { id: 'm_nopickle', name: 'No Pickles', priceDelta: 0, calories: 0 },
  { id: 'm_nonion', name: 'No Onions', priceDelta: 0, calories: 0 },
  { id: 'm_spicy', name: 'Spicy Mayo', priceDelta: 140, calories: 60 },
  { id: 'sz_s', name: 'Small', priceDelta: 0, calories: 0 },
  { id: 'sz_m', name: 'Medium', priceDelta: 220, calories: 90 },
  { id: 'sz_l', name: 'Large', priceDelta: 450, calories: 180 },
];

export const modifierGroups: ModifierGroup[] = [
  {
    id: 'g_toppings',
    name: 'Customize your toppings',
    selectionType: 'multiple',
    required: false,
    min: 0,
    max: 5,
    modifierIds: ['m_cheese', 'm_bacon', 'm_spicy', 'm_nopickle', 'm_nonion'],
  },
  {
    id: 'g_size',
    name: 'Pick a size',
    selectionType: 'single',
    required: true,
    min: 1,
    max: 1,
    modifierIds: ['sz_s', 'sz_m', 'sz_l'],
  },
];

export const products: Product[] = [
  // Burgers
  { id: 'p_emberstack', categoryId: 'burgers', name: 'Ember Stack', description: 'Double flame-grilled beef, smoked cheddar, ember sauce on a toasted brioche bun.', price: 1820, calories: 640, image: '🍔', badge: 'popular', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_classic', categoryId: 'burgers', name: 'Classic Char', description: 'Single beef patty, lettuce, tomato, pickles, house sauce.', price: 1400, calories: 480, image: '🍔', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_smokehouse', categoryId: 'burgers', name: 'Smokehouse BBQ', description: 'Beef, crispy onions, smoked bacon, tangy BBQ glaze.', price: 1960, calories: 700, image: '🍔', badge: 'new', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_veggie', categoryId: 'burgers', name: 'Garden Ember', description: 'Charred plant patty, avocado, greens, herbed aioli.', price: 1680, calories: 420, image: '🥬', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  // Chicken
  { id: 'p_crispy', categoryId: 'chicken', name: 'Crispy Chicken', description: 'Buttermilk-fried fillet, pickles, brioche bun.', price: 1450, calories: 470, image: '🍗', badge: 'popular', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_spicy', categoryId: 'chicken', name: 'Spicy Deluxe', description: 'Nashville-hot fillet, slaw, spicy mayo.', price: 1510, calories: 530, image: '🌶️', badge: 'new', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_nuggets', categoryId: 'chicken', name: 'Ember Nuggets (8)', description: 'Eight golden nuggets with your choice of dip.', price: 1200, calories: 360, image: '🍗', badge: null, isMealEligible: true, modifierGroupIds: [] },
  // Sides
  { id: 'p_fries', categoryId: 'sides', name: 'Flame Fries', description: 'Skin-on fries, sea salt, ember dust.', price: 700, calories: 320, image: '🍟', badge: 'popular', isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_rings', categoryId: 'sides', name: 'Onion Rings', description: 'Beer-battered, crunchy, golden.', price: 840, calories: 410, image: '🧅', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_slaw', categoryId: 'sides', name: 'House Slaw', description: 'Crisp cabbage, carrot, buttermilk dressing.', price: 560, calories: 180, image: '🥗', badge: null, isMealEligible: false, modifierGroupIds: [] },
  // Drinks
  { id: 'p_cola', categoryId: 'drinks', name: 'Fountain Cola', description: 'Ice-cold classic cola.', price: 530, calories: 210, image: '🥤', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_lemon', categoryId: 'drinks', name: 'Sparkling Lemon', description: 'Fizzy, citrus-bright refresher.', price: 560, calories: 160, image: '🍋', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_water', categoryId: 'drinks', name: 'Still Water', description: 'Bottled spring water.', price: 420, calories: 0, image: '💧', badge: null, isMealEligible: false, modifierGroupIds: [] },
  // Shakes
  { id: 'p_vanilla', categoryId: 'shakes', name: 'Vanilla Shake', description: 'Thick-spun vanilla bean shake.', price: 1040, calories: 590, image: '🥛', badge: 'popular', isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_choc', categoryId: 'shakes', name: 'Chocolate Shake', description: 'Rich cocoa, whipped top.', price: 1040, calories: 620, image: '🍫', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_berry', categoryId: 'shakes', name: 'Berry Blast', description: 'Strawberry & blueberry swirl.', price: 1090, calories: 560, image: '🫐', badge: 'new', isMealEligible: false, modifierGroupIds: ['g_size'] },
  // Sweets
  { id: 'p_donut', categoryId: 'sweets', name: 'Cinnamon Donut', description: 'Warm, sugar-dusted, fresh.', price: 500, calories: 280, image: '🍩', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_cookie', categoryId: 'sweets', name: 'Choc-Chip Cookie', description: 'Gooey centre, crisp edge.', price: 420, calories: 240, image: '🍪', badge: 'popular', isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_pie', categoryId: 'sweets', name: 'Apple Pie', description: 'Flaky crust, spiced apple.', price: 560, calories: 250, image: '🥧', badge: null, isMealEligible: false, modifierGroupIds: [] },
];
