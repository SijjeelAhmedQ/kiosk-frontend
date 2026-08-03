import type { Category, Product, ProductBadge } from './product.types';

/**
 * The back office's view of the menu.
 *
 * The kiosk's Category and Product are what a customer is shown: active rows
 * only, no ordering, no bookkeeping. These add what someone *maintaining* the
 * menu needs — the inactive rows, the sort order, and the counts that decide
 * whether a row can be deleted at all.
 *
 * Mirrors app/schemas/catalog.py on the API one-for-one.
 */

export interface CategoryAdmin extends Category {
  sortOrder: number;
  isActive: boolean;
  createdAt: string;

  productCount: number;
  activeProductCount: number;
}

export interface ProductAdmin extends Omit<Product, 'modifierGroupIds' | 'badge'> {
  categoryName: string;
  badge: ProductBadge;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  /** What stops a delete. Non-zero means the API will refuse one. */
  orderLineCount: number;
  couponCount: number;
  modifierGroupCount: number;
}

/* ---------------------------------------------------------------------------
   Write payloads.

   `imgBase64` follows one rule everywhere: leave the field out and the stored
   artwork is kept, send '' and it is cleared, send a data: URL and it replaces.
   That is what lets a save which never opened the picker keep the photo.
   --------------------------------------------------------------------------- */

/**
 * No `id`: the API generates it from the name.
 *
 * It is permanent from the moment it is written — it sits in URLs, in every
 * product row and on every order line — and only the database can check that it
 * is free and take it in the same breath. See sql/09_catalog_admin.sql.
 */
export interface CategoryCreateInput {
  name: string;
  icon: string;
  image?: string | null;
  imgBase64?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryUpdateInput {
  name: string;
  icon?: string | null;
  image?: string | null;
  imgBase64?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}

/** No `id` — the API generates it, the same as CategoryCreateInput. */
export interface ProductCreateInput {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  calories: number;
  image: string;
  imgBase64?: string | null;
  badge?: ProductBadge;
  isMealEligible: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductUpdateInput {
  categoryId?: string | null;
  name: string;
  description?: string | null;
  price?: number | null;
  calories?: number | null;
  image?: string | null;
  imgBase64?: string | null;
  badge?: ProductBadge;
  /** A badge is removed by asking — omitting it keeps the current one. */
  clearBadge?: boolean;
  isMealEligible?: boolean | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}

export interface CatalogDeleted {
  id: string;
  deleted: boolean;
}

export interface ProductAdminQuery {
  categoryId?: string;
  search?: string;
  isActive?: boolean;
}
