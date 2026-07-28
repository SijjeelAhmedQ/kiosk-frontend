export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;          // emoji/icon key for the sidebar
  image?: string;
  featured?: boolean;    // pinned above the main sidebar list
}

export type ProductBadge = 'new' | 'popular' | 'deal' | null;

export interface Product {
  id: string;
  categoryId: CategoryId;
  name: string;
  description: string;
  price: number;
  calories: number;
  image: string;
  badge?: ProductBadge;
  protein?: number;             // grams — shown as the yellow chip on the card
  limitedTime?: boolean;        // renders the red "Limited Time Only" flag
  isMealEligible: boolean;      // can be upgraded to a combo
  modifierGroupIds: string[];
}

export type ModifierSelectionType = 'single' | 'multiple';

export interface ModifierGroup {
  id: string;
  name: string;
  selectionType: ModifierSelectionType;
  required: boolean;
  min: number;
  max: number;
  modifierIds: string[];
}

export interface Modifier {
  id: string;
  name: string;
  priceDelta: number;   // added to line price
  calories: number;
}
