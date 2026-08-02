import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CatalogDeleted,
  CategoryAdmin,
  CategoryCreateInput,
  CategoryUpdateInput,
  ProductAdmin,
  ProductAdminQuery,
  ProductCreateInput,
  ProductUpdateInput,
} from '@/types';
import { catalogAdminApi } from '@/services/api/catalogAdminApi';
import { errorMessage } from '@/utils/apiError';

/**
 * The menu, as the back office holds it.
 *
 * Categories and products share one slice because they are never used apart:
 * the product form needs the category list for its picker, and the category
 * list shows how many products sit under each. Two slices would mean two
 * fetches of the same rows and a way for them to disagree.
 *
 * Neither list is paged. The menu of a single restaurant is tens of rows, not
 * thousands, and paging it would cost a round trip every time someone filters.
 */

interface CatalogAdminState {
  categories: CategoryAdmin[];
  products: ProductAdmin[];
  /** Filters live here so they survive opening a product and coming back. */
  productQuery: ProductAdminQuery;

  currentCategory: CategoryAdmin | null;
  currentProduct: ProductAdmin | null;

  loadingCategories: boolean;
  loadingProducts: boolean;
  /** Separate from loading so a save does not blank the list behind the form. */
  saving: boolean;
  error: string | null;
}

const initialState: CatalogAdminState = {
  categories: [],
  products: [],
  productQuery: {},
  currentCategory: null,
  currentProduct: null,
  loadingCategories: false,
  loadingProducts: false,
  saving: false,
  error: null,
};

// --------------------------------------------------------------------------
// Categories
// --------------------------------------------------------------------------
export const fetchCategoriesAdmin = createAsyncThunk<
  CategoryAdmin[],
  void,
  { rejectValue: string }
>('catalogAdmin/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    return await catalogAdminApi.listCategories();
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not load categories.'));
  }
});

export const fetchCategoryAdmin = createAsyncThunk<CategoryAdmin, string, { rejectValue: string }>(
  'catalogAdmin/fetchCategory',
  async (id, { rejectWithValue }) => {
    try {
      return await catalogAdminApi.getCategory(id);
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Could not load that category.'));
    }
  },
);

export const createCategory = createAsyncThunk<
  CategoryAdmin,
  CategoryCreateInput,
  { rejectValue: string }
>('catalogAdmin/createCategory', async (input, { rejectWithValue }) => {
  try {
    return await catalogAdminApi.createCategory(input);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not create the category.'));
  }
});

export const updateCategory = createAsyncThunk<
  CategoryAdmin,
  { id: string; input: CategoryUpdateInput },
  { rejectValue: string }
>('catalogAdmin/updateCategory', async ({ id, input }, { rejectWithValue }) => {
  try {
    return await catalogAdminApi.updateCategory(id, input);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not save the category.'));
  }
});

export const deleteCategory = createAsyncThunk<CatalogDeleted, string, { rejectValue: string }>(
  'catalogAdmin/deleteCategory',
  async (id, { rejectWithValue }) => {
    try {
      return await catalogAdminApi.deleteCategory(id);
    } catch (err) {
      // The API refuses while products remain; that reason belongs on screen.
      return rejectWithValue(errorMessage(err, 'Could not delete the category.'));
    }
  },
);

// --------------------------------------------------------------------------
// Products
// --------------------------------------------------------------------------
export const fetchProductsAdmin = createAsyncThunk<
  ProductAdmin[],
  ProductAdminQuery | undefined,
  { rejectValue: string }
>('catalogAdmin/fetchProducts', async (query, { rejectWithValue }) => {
  try {
    return await catalogAdminApi.listProducts(query);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not load products.'));
  }
});

export const fetchProductAdmin = createAsyncThunk<ProductAdmin, string, { rejectValue: string }>(
  'catalogAdmin/fetchProduct',
  async (id, { rejectWithValue }) => {
    try {
      return await catalogAdminApi.getProduct(id);
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Could not load that product.'));
    }
  },
);

export const createProduct = createAsyncThunk<
  ProductAdmin,
  ProductCreateInput,
  { rejectValue: string }
>('catalogAdmin/createProduct', async (input, { rejectWithValue }) => {
  try {
    return await catalogAdminApi.createProduct(input);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not create the product.'));
  }
});

export const updateProduct = createAsyncThunk<
  ProductAdmin,
  { id: string; input: ProductUpdateInput },
  { rejectValue: string }
>('catalogAdmin/updateProduct', async ({ id, input }, { rejectWithValue }) => {
  try {
    return await catalogAdminApi.updateProduct(id, input);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not save the product.'));
  }
});

export const setProductActive = createAsyncThunk<
  ProductAdmin,
  { id: string; isActive: boolean },
  { rejectValue: string }
>('catalogAdmin/setProductActive', async ({ id, isActive }, { rejectWithValue }) => {
  try {
    return await catalogAdminApi.setProductActive(id, isActive);
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Could not change that product.'));
  }
});

export const deleteProduct = createAsyncThunk<CatalogDeleted, string, { rejectValue: string }>(
  'catalogAdmin/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      return await catalogAdminApi.deleteProduct(id);
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Could not delete the product.'));
    }
  },
);

const catalogAdminSlice = createSlice({
  name: 'catalogAdmin',
  initialState,
  reducers: {
    setProductQuery: (s, a: PayloadAction<ProductAdminQuery>) => {
      s.productQuery = a.payload;
    },
    clearCatalogError: (s) => {
      s.error = null;
    },
    clearCurrentCategory: (s) => {
      s.currentCategory = null;
    },
    clearCurrentProduct: (s) => {
      s.currentProduct = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchCategoriesAdmin.pending, (s) => {
      s.loadingCategories = true;
      s.error = null;
    })
      .addCase(fetchCategoriesAdmin.fulfilled, (s, a) => {
        s.loadingCategories = false;
        s.categories = a.payload;
      })
      .addCase(fetchCategoriesAdmin.rejected, (s, a) => {
        s.loadingCategories = false;
        s.error = a.payload ?? 'Could not load categories.';
      })

      .addCase(fetchCategoryAdmin.fulfilled, (s, a) => {
        s.currentCategory = a.payload;
      })
      .addCase(fetchCategoryAdmin.rejected, (s, a) => {
        s.error = a.payload ?? 'Could not load that category.';
      })

      .addCase(fetchProductsAdmin.pending, (s) => {
        s.loadingProducts = true;
        s.error = null;
      })
      .addCase(fetchProductsAdmin.fulfilled, (s, a) => {
        s.loadingProducts = false;
        s.products = a.payload;
      })
      .addCase(fetchProductsAdmin.rejected, (s, a) => {
        s.loadingProducts = false;
        s.error = a.payload ?? 'Could not load products.';
      })

      .addCase(fetchProductAdmin.fulfilled, (s, a) => {
        s.currentProduct = a.payload;
      })
      .addCase(fetchProductAdmin.rejected, (s, a) => {
        s.error = a.payload ?? 'Could not load that product.';
      })

      /* One matcher per phase rather than a case each: every write here shares
         the same three outcomes, and the lists are refetched by the pages
         afterwards, so there is nothing per-thunk left to say. */
      .addMatcher(
        (a) => a.type.startsWith('catalogAdmin/') && a.type.endsWith('/pending') &&
          !a.type.includes('fetch'),
        (s) => {
          s.saving = true;
          s.error = null;
        },
      )
      .addMatcher(
        (a) => a.type.startsWith('catalogAdmin/') && a.type.endsWith('/fulfilled') &&
          !a.type.includes('fetch'),
        (s) => {
          s.saving = false;
        },
      )
      .addMatcher(
        (a) => a.type.startsWith('catalogAdmin/') && a.type.endsWith('/rejected') &&
          !a.type.includes('fetch'),
        (s, a) => {
          s.saving = false;
          s.error = (a as { payload?: string }).payload ?? 'That did not work.';
        },
      );
  },
});

export const {
  setProductQuery,
  clearCatalogError,
  clearCurrentCategory,
  clearCurrentProduct,
} = catalogAdminSlice.actions;

export default catalogAdminSlice.reducer;
