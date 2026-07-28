/**
 * Mock menu — stands in for the backend until the FastAPI layer is wired.
 * Product "image" fields hold an emoji glyph so the client is fully
 * self-contained (no binary/branded assets). Swap for real image URLs later.
 */
import type { Category, Modifier, ModifierGroup, Product } from '@/types';

export const categories: Category[] = [
  { id: 'featured', name: 'Featured Favorites', icon: '🍟', featured: true },
  { id: 'caesar', name: 'Caesar Sauce', icon: '🍔' },
  { id: 'value-meals', name: 'Extra Value Meals', icon: '🍟' },
  { id: 'mcvalue', name: 'McValue', icon: '🏷️' },
  { id: 'breakfast', name: 'Breakfast', icon: '🥞' },
  { id: 'burgers', name: 'Burgers', icon: '🍔' },
  { id: 'chicken', name: 'Chicken & Fish Sandwiches', icon: '🍗' },
  { id: 'nuggets', name: 'McNuggets & McCrispy Strips', icon: '🍤' },
  { id: 'snack-wrap', name: 'Snack Wrap', icon: '🌯' },
  { id: 'sides', name: 'Fries & Sides', icon: '🍟' },
  { id: 'happy-meal', name: 'Happy Meal', icon: '🧃' },
  { id: 'sweets', name: 'Sweets & Treats', icon: '🍦' },
  { id: 'shakes', name: 'McCafé', icon: '☕' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'sauces', name: 'Sauces & Condiments', icon: '🥫' },
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
  // Caesar Sauce — limited-time shelf
  { id: 'p_bacon_caesar', categoryId: 'caesar', name: 'Bacon Caesar Crispy Chicken', description: 'Crispy chicken fillet, smoked bacon, romaine, Caesar sauce.', price: 1690, calories: 620, image: '🍔', badge: null, protein: 17, limitedTime: true, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_caesar_wrap', categoryId: 'caesar', name: 'Caesar Snack Wrap', description: 'Chicken strip, lettuce, parmesan, Caesar sauce in a soft tortilla.', price: 890, calories: 340, image: '🌯', badge: null, protein: 17, limitedTime: true, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_caesar_sauce', categoryId: 'caesar', name: 'Caesar Sauce', description: 'Creamy Caesar dipping sauce.', price: 90, calories: 60, image: '🥫', badge: null, limitedTime: true, isMealEligible: false, modifierGroupIds: [] },

  // Extra Value Meals
  { id: 'p_vm_sausage_egg', categoryId: 'value-meals', name: 'Sausage Muffin with Egg Meal', description: 'Sausage muffin with egg, hash brown and a coffee.', price: 1450, calories: 780, image: '🥞', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_vm_egg_muffin', categoryId: 'value-meals', name: 'Egg Muffin Meal', description: 'Egg muffin, hash brown and a coffee.', price: 1390, calories: 720, image: '🥚', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_vm_biscuit', categoryId: 'value-meals', name: 'Bacon, Egg & Cheese Biscuit Meal', description: 'Biscuit sandwich, hash brown and a coffee.', price: 1480, calories: 810, image: '🥯', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_vm_burrito', categoryId: 'value-meals', name: 'Sausage Burrito Meal', description: 'Two burritos, hash brown and a coffee.', price: 1420, calories: 760, image: '🌯', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_vm_bigmeal', categoryId: 'value-meals', name: 'Big Stack Meal', description: 'Signature double burger, fries and a drink.', price: 2190, calories: 1080, image: '🍔', badge: 'deal', isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_vm_nuggets', categoryId: 'value-meals', name: '10 Piece Nuggets Meal', description: 'Ten nuggets, fries, a drink and your choice of dip.', price: 1980, calories: 990, image: '🍤', badge: 'deal', isMealEligible: false, modifierGroupIds: ['g_size'] },

  // Value menu
  { id: 'p_val_double', categoryId: 'mcvalue', name: 'Daily Double', description: 'Two beef patties, lettuce, tomato, mayo.', price: 890, calories: 430, image: '🍔', badge: 'deal', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_val_mcdouble', categoryId: 'mcvalue', name: 'Double Cheese Value', description: 'Two patties, two slices of cheese, pickles, onion.', price: 850, calories: 400, image: '🍔', protein: 22, badge: 'deal', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_val_fries', categoryId: 'mcvalue', name: 'Value Fries', description: 'Golden fries, lightly salted.', price: 320, calories: 230, image: '🍟', badge: 'deal', isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_val_drink', categoryId: 'mcvalue', name: 'Any Size Soft Drink', description: 'Any size, one low price.', price: 250, calories: 150, image: '🥤', badge: 'deal', isMealEligible: false, modifierGroupIds: ['g_size'] },

  // Breakfast
  { id: 'p_egg_muffin', categoryId: 'breakfast', name: 'Egg Muffin', description: 'Freshly cracked egg, cheese and Canadian bacon on a toasted muffin.', price: 780, calories: 310, image: '🥚', badge: 'popular', protein: 17, isMealEligible: true, modifierGroupIds: [] },
  { id: 'p_sausage_burrito', categoryId: 'breakfast', name: 'Sausage Burrito', description: 'Sausage, egg, cheese, peppers and onion in a soft tortilla.', price: 640, calories: 300, image: '🌯', badge: 'popular', protein: 13, isMealEligible: true, modifierGroupIds: [] },
  { id: 'p_hotcakes', categoryId: 'breakfast', name: 'Hotcakes', description: 'Three golden hotcakes with butter and syrup.', price: 820, calories: 580, image: '🥞', badge: null, isMealEligible: true, modifierGroupIds: [] },
  { id: 'p_hashbrown', categoryId: 'breakfast', name: 'Hash Brown', description: 'Crispy golden shredded potato.', price: 330, calories: 140, image: '🥔', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_bagel', categoryId: 'breakfast', name: 'Steak, Egg & Cheese Bagel', description: 'Seasoned steak, egg, cheese and grilled onions on a toasted bagel.', price: 1180, calories: 670, image: '🥯', badge: null, protein: 30, isMealEligible: true, modifierGroupIds: [] },

  // Burgers
  { id: 'p_bigstack', categoryId: 'burgers', name: 'Big Stack', description: 'Two beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame bun.', price: 1820, calories: 590, image: '🍔', badge: 'popular', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_quarter', categoryId: 'burgers', name: 'Quarter Pound with Cheese', description: 'Fresh beef quarter pound patty, two slices of cheese, onions and pickles.', price: 1690, calories: 520, image: '🍔', badge: 'popular', protein: 30, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_dblquarter', categoryId: 'burgers', name: 'Double Quarter Pound with Cheese', description: 'Two quarter pound patties, cheese, onions and pickles.', price: 2140, calories: 740, image: '🍔', badge: null, protein: 48, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_quarter_deluxe', categoryId: 'burgers', name: 'Quarter Pound Deluxe', description: 'Quarter pound patty, cheese, lettuce, tomato, mayo.', price: 1790, calories: 630, image: '🍔', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_double', categoryId: 'burgers', name: 'Double Cheese', description: 'Two beef patties, two slices of cheese, pickles and onion.', price: 990, calories: 400, image: '🍔', badge: null, protein: 22, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_cheeseburger', categoryId: 'burgers', name: 'Cheeseburger', description: 'Beef patty, cheese, pickles, onions, ketchup and mustard.', price: 690, calories: 300, image: '🍔', badge: null, protein: 15, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_hamburger', categoryId: 'burgers', name: 'Hamburger', description: 'The classic — beef patty, pickles, onions, ketchup and mustard.', price: 590, calories: 250, image: '🍔', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },

  // Chicken & Fish Sandwiches
  { id: 'p_crispy', categoryId: 'chicken', name: 'Crispy Chicken', description: 'Crispy chicken fillet, crinkle-cut pickles, toasted potato roll.', price: 1450, calories: 470, image: '🍗', badge: 'popular', isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_crispy_deluxe', categoryId: 'chicken', name: 'Deluxe Crispy Chicken', description: 'Crispy fillet, shredded lettuce, tomato and mayo.', price: 1590, calories: 530, image: '🍗', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_spicy', categoryId: 'chicken', name: 'Spicy Crispy Chicken', description: 'Spicy pepper sauce, crispy fillet, crinkle-cut pickles.', price: 1510, calories: 500, image: '🌶️', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_spicy_deluxe', categoryId: 'chicken', name: 'Spicy Deluxe Crispy Chicken', description: 'Spicy fillet, lettuce, tomato and mayo.', price: 1650, calories: 560, image: '🌶️', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },
  { id: 'p_fish', categoryId: 'chicken', name: 'Filet-O-Fish', description: 'Wild-caught fish fillet, tartar sauce and cheese on a steamed bun.', price: 1240, calories: 390, image: '🐟', badge: null, protein: 16, isMealEligible: true, modifierGroupIds: [] },
  { id: 'p_mcchicken', categoryId: 'chicken', name: 'Chicken Classic', description: 'Crispy chicken patty, shredded lettuce and mayo.', price: 890, calories: 400, image: '🍗', badge: null, isMealEligible: true, modifierGroupIds: ['g_toppings'] },

  // Nuggets & Crispy Strips
  { id: 'p_nuggets_4', categoryId: 'nuggets', name: '4 Piece Chicken Nuggets', description: 'Four tender all-white-meat nuggets with your choice of dip.', price: 490, calories: 170, image: '🍤', badge: 'popular', isMealEligible: true, modifierGroupIds: [] },
  { id: 'p_nuggets_6', categoryId: 'nuggets', name: '6 Piece Chicken Nuggets', description: 'Six tender all-white-meat nuggets with your choice of dip.', price: 720, calories: 250, image: '🍤', badge: null, isMealEligible: true, modifierGroupIds: [] },
  { id: 'p_nuggets_10', categoryId: 'nuggets', name: '10 Piece Chicken Nuggets', description: 'Ten tender all-white-meat nuggets with your choice of dip.', price: 1180, calories: 420, image: '🍤', badge: null, protein: 23, isMealEligible: true, modifierGroupIds: [] },
  { id: 'p_strips_3', categoryId: 'nuggets', name: '3 Piece Crispy Strips', description: 'Three thick-cut crispy chicken strips.', price: 1090, calories: 400, image: '🍗', badge: null, protein: 29, isMealEligible: true, modifierGroupIds: [] },

  // Snack Wrap
  { id: 'p_wrap_ranch', categoryId: 'snack-wrap', name: 'Ranch Snack Wrap', description: 'Crispy chicken strip, lettuce, cheese and ranch in a soft tortilla.', price: 850, calories: 330, image: '🌯', badge: 'popular', protein: 17, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_wrap_spicy', categoryId: 'snack-wrap', name: 'Spicy Snack Wrap', description: 'Crispy chicken strip, lettuce, cheese and spicy pepper sauce.', price: 850, calories: 340, image: '🌯', badge: null, protein: 17, isMealEligible: false, modifierGroupIds: [] },

  // Fries & Sides
  { id: 'p_fries', categoryId: 'sides', name: 'World Famous Fries', description: 'Golden, crispy, lightly salted.', price: 700, calories: 320, image: '🍟', badge: 'popular', isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_hashbrown_side', categoryId: 'sides', name: 'Hash Brown', description: 'Crispy golden shredded potato.', price: 330, calories: 140, image: '🥔', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_apple_slices', categoryId: 'sides', name: 'Apple Slices', description: 'Fresh-cut apple slices.', price: 260, calories: 15, image: '🍎', badge: null, isMealEligible: false, modifierGroupIds: [] },

  // Happy Meal
  { id: 'p_hm_nuggets', categoryId: 'happy-meal', name: 'Happy Meal — 4 Piece Nuggets', description: 'Four nuggets, kids fries, apple slices and a drink.', price: 1090, calories: 470, image: '🧃', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_hm_burger', categoryId: 'happy-meal', name: 'Happy Meal — Hamburger', description: 'Hamburger, kids fries, apple slices and a drink.', price: 1040, calories: 490, image: '🧃', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_hm_cheese', categoryId: 'happy-meal', name: 'Happy Meal — Cheeseburger', description: 'Cheeseburger, kids fries, apple slices and a drink.', price: 1120, calories: 540, image: '🧃', badge: null, isMealEligible: false, modifierGroupIds: [] },

  // Sweets & Treats
  { id: 'p_sundae', categoryId: 'sweets', name: 'Hot Fudge Sundae', description: 'Soft-serve topped with warm hot fudge.', price: 620, calories: 330, image: '🍨', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_cone', categoryId: 'sweets', name: 'Vanilla Cone', description: 'Creamy vanilla soft-serve in a crisp cone.', price: 320, calories: 200, image: '🍦', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_cookie', categoryId: 'sweets', name: 'Chocolate Chip Cookie', description: 'Gooey centre, crisp edge.', price: 420, calories: 240, image: '🍪', badge: 'popular', isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_pie', categoryId: 'sweets', name: 'Baked Apple Pie', description: 'Flaky lattice crust, spiced apple filling.', price: 560, calories: 250, image: '🥧', badge: null, isMealEligible: false, modifierGroupIds: [] },

  // McCafé
  { id: 'p_iced_coffee', categoryId: 'shakes', name: 'Iced Coffee', description: 'Freshly brewed coffee over ice with cream and your choice of flavour.', price: 780, calories: 190, image: '🧋', badge: 'popular', isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_latte', categoryId: 'shakes', name: 'Latte', description: 'Espresso with steamed milk and a light layer of foam.', price: 860, calories: 140, image: '☕', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_vanilla_shake', categoryId: 'shakes', name: 'Vanilla Shake', description: 'Creamy vanilla shake topped with whipped cream.', price: 1040, calories: 590, image: '🥛', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_choc_shake', categoryId: 'shakes', name: 'Chocolate Shake', description: 'Rich chocolate shake topped with whipped cream.', price: 1040, calories: 620, image: '🍫', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },

  // Drinks
  { id: 'p_cola', categoryId: 'drinks', name: 'Coca-Cola', description: 'Ice-cold classic cola.', price: 530, calories: 210, image: '🥤', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_sprite', categoryId: 'drinks', name: 'Sprite', description: 'Crisp lemon-lime refresher.', price: 530, calories: 200, image: '🥤', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_orange', categoryId: 'drinks', name: 'Orange Juice', description: 'Chilled 100% orange juice.', price: 640, calories: 190, image: '🍊', badge: null, isMealEligible: false, modifierGroupIds: ['g_size'] },
  { id: 'p_water', categoryId: 'drinks', name: 'Bottled Water', description: 'Still spring water.', price: 420, calories: 0, image: '💧', badge: null, isMealEligible: false, modifierGroupIds: [] },

  // Sauces & Condiments
  { id: 'p_bbq', categoryId: 'sauces', name: 'Tangy BBQ Sauce', description: 'Sweet and smoky dipping sauce.', price: 90, calories: 45, image: '🥫', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_honey_mustard', categoryId: 'sauces', name: 'Honey Mustard', description: 'Sweet honey with a mustard kick.', price: 90, calories: 60, image: '🍯', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_ranch', categoryId: 'sauces', name: 'Creamy Ranch', description: 'Cool, herby ranch dipping sauce.', price: 90, calories: 110, image: '🥛', badge: null, isMealEligible: false, modifierGroupIds: [] },
  { id: 'p_ketchup', categoryId: 'sauces', name: 'Ketchup', description: 'Classic tomato ketchup packet.', price: 0, calories: 10, image: '🍅', badge: null, isMealEligible: false, modifierGroupIds: [] },
];
