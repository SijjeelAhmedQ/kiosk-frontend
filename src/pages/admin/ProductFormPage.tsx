import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProductBadge } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  clearCatalogError,
  clearCurrentProduct,
  createProduct,
  fetchCategoriesAdmin,
  fetchProductAdmin,
  updateProduct,
} from '@/redux/slices/catalogAdminSlice';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/LoadingScreen';
import {
  AlertBanner,
  Field,
  ImagePicker,
  PageBody,
  PageHeader,
  Select,
  Stat,
  TextArea,
  TextInput,
  Toggle,
  type SelectOption,
} from '@/components/admin';
import { formatCurrency } from '@/utils/currency';
import { ADMIN_PATHS } from '@/routes/paths';

type BadgeChoice = '' | 'new' | 'popular' | 'deal';

const BADGE_OPTIONS: SelectOption<BadgeChoice>[] = [
  { value: '', label: 'No badge' },
  { value: 'new', label: 'New' },
  { value: 'popular', label: 'Popular' },
  { value: 'deal', label: 'Deal' },
];

interface FormState {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  calories: number;
  image: string;
  badge: BadgeChoice;
  isMealEligible: boolean;
  sortOrder: number;
  isActive: boolean;
}

const blankForm: FormState = {
  categoryId: '',
  name: '',
  description: '',
  price: 0,
  calories: 0,
  image: '',
  badge: '',
  isMealEligible: false,
  sortOrder: 0,
  isActive: true,
};

type Errors = Partial<Record<keyof FormState, string>>;

/**
 * Create and edit, one form — same as the campaign and category pages.
 *
 * There is no id field: the API generates the id from the name. It is stamped
 * on every order line the product is ever sold on and can never change, so it
 * is not something to leave to whoever is filling in the form.
 */
export default function ProductFormPage() {
  const { productId } = useParams<{ productId: string }>();
  const isEdit = Boolean(productId);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentProduct, categories, saving, error } = useAppSelector((s) => s.catalogAdmin);

  const [form, setForm] = useState<FormState>(blankForm);
  const [errors, setErrors] = useState<Errors>({});
  const [image, setImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    dispatch(clearCatalogError());
    void dispatch(fetchCategoriesAdmin());
    if (isEdit && productId) void dispatch(fetchProductAdmin(productId));
    else dispatch(clearCurrentProduct());
    return () => { dispatch(clearCurrentProduct()); };
  }, [dispatch, isEdit, productId]);

  useEffect(() => {
    if (isEdit && currentProduct && currentProduct.id === productId) {
      setForm({
        categoryId: currentProduct.categoryId,
        name: currentProduct.name,
        description: currentProduct.description,
        price: currentProduct.price,
        calories: currentProduct.calories,
        image: currentProduct.image,
        badge: (currentProduct.badge ?? '') as BadgeChoice,
        isMealEligible: currentProduct.isMealEligible,
        sortOrder: currentProduct.sortOrder,
        isActive: currentProduct.isActive,
      });
    }
  }, [isEdit, currentProduct, productId]);

  // A new product lands in the first category unless told otherwise, so the
  // required picker is never silently empty.
  useEffect(() => {
    if (!isEdit && !form.categoryId && categories.length > 0) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [isEdit, form.categoryId, categories]);

  const categoryOptions = useMemo<SelectOption<string>[]>(
    () => categories.map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (hidden)` })),
    [categories],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Give the product a name.';
    if (!form.categoryId) next.categoryId = 'Pick the category it belongs to.';
    if (!Number.isFinite(form.price) || form.price < 0) next.price = 'A price of zero or more.';
    if (!Number.isFinite(form.calories) || form.calories < 0) next.calories = 'Zero or more.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const result = isEdit
      ? await dispatch(
          updateProduct({
            id: productId!,
            input: {
              categoryId: form.categoryId,
              name: form.name.trim(),
              description: form.description.trim(),
              price: form.price,
              calories: form.calories,
              image: form.image,
              badge: (form.badge || null) as ProductBadge,
              // Omission means "keep", so removing a badge has to be asked for.
              clearBadge: form.badge === '',
              isMealEligible: form.isMealEligible,
              sortOrder: form.sortOrder,
              isActive: form.isActive,
              ...(image === undefined ? {} : { imgBase64: image }),
            },
          }),
        )
      : await dispatch(
          createProduct({
            categoryId: form.categoryId,
            name: form.name.trim(),
            description: form.description.trim(),
            price: form.price,
            calories: form.calories,
            image: form.image,
            badge: (form.badge || null) as ProductBadge,
            isMealEligible: form.isMealEligible,
            sortOrder: form.sortOrder,
            isActive: form.isActive,
            imgBase64: image || null,
          }),
        );

    if (createProduct.fulfilled.match(result) || updateProduct.fulfilled.match(result)) {
      navigate(ADMIN_PATHS.products);
    }
  };

  if (isEdit && !currentProduct) {
    return (
      <PageBody>
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner size={52} />
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        subtitle={
          isEdit
            ? 'Changes show on the kiosk immediately. Past orders keep the name and price they were sold at.'
            : 'One item on the menu.'
        }
        backTo={ADMIN_PATHS.products}
      />

      <AlertBanner message={error} onDismiss={() => dispatch(clearCatalogError())} />

      {isEdit && currentProduct && (
        <div className="mb-6 grid max-w-[46rem] grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Price" value={formatCurrency(currentProduct.price)} />
          <Stat label="Sold on" value={`${currentProduct.orderLineCount} lines`} />
          <Stat label="Coupons" value={String(currentProduct.couponCount)} />
          <Stat
            label="On the menu"
            value={currentProduct.isActive ? 'Yes' : 'No'}
            tone={currentProduct.isActive ? 'text-leaf' : 'text-ash'}
          />
        </div>
      )}

      <form
        onSubmit={submit}
        className="flex max-w-[46rem] flex-col gap-5 rounded-xl3 bg-paper p-7 shadow-soft"
      >
        <Field label="Name" required error={errors.name}>
          <TextInput
            value={form.name}
            maxLength={120}
            placeholder="Big Mac"
            invalid={Boolean(errors.name)}
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>

        <Field label="Description" hint="One line, shown under the name on the kiosk.">
          <TextArea
            value={form.description}
            maxLength={500}
            placeholder="Two beef patties, special sauce, lettuce, cheese."
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>

        {/* No hint here — the picker says the same thing, and better. */}
        <Field label="Photo">
          <ImagePicker
            value={image === undefined ? currentProduct?.imgBase64 : image}
            onChange={setImage}
            fallback={form.image || '🍽️'}
            disabled={saving}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" required error={errors.categoryId}>
            <Select
              value={form.categoryId}
              onChange={(value) => update('categoryId', value)}
              options={categoryOptions}
              invalid={Boolean(errors.categoryId)}
            />
          </Field>

          <Field label="Badge" hint="The flag on the menu tile.">
            <Select<BadgeChoice>
              value={form.badge}
              onChange={(value) => update('badge', value)}
              options={BADGE_OPTIONS}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price" required error={errors.price}>
            <TextInput
              type="number"
              min={0}
              step="1"
              value={form.price}
              invalid={Boolean(errors.price)}
              onChange={(e) => update('price', Number(e.target.value))}
            />
          </Field>

          <Field label="Calories" error={errors.calories}>
            <TextInput
              type="number"
              min={0}
              value={form.calories}
              invalid={Boolean(errors.calories)}
              onChange={(e) => update('calories', Number(e.target.value))}
            />
          </Field>

          <Field label="Emoji" hint="The image fallback.">
            <TextInput
              value={form.image}
              maxLength={400}
              placeholder="🍔"
              onChange={(e) => update('image', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Position" hint="Lower numbers come first inside the category.">
          <TextInput
            type="number"
            min={0}
            value={form.sortOrder}
            className="sm:w-40"
            onChange={(e) => update('sortOrder', Number(e.target.value) || 0)}
          />
        </Field>

        <Toggle
          label="Can be made a meal"
          hint="Offers the combo upgrade, at the meal upcharge from settings."
          checked={form.isMealEligible}
          onChange={(checked) => update('isMealEligible', checked)}
        />

        <Toggle
          label="Show on the order"
          hint="Hiding takes it off the menu. Nothing already sold is affected."
          checked={form.isActive}
          onChange={(checked) => update('isActive', checked)}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            size="md"
            variant="secondary"
            onClick={() => navigate(ADMIN_PATHS.products)}
          >
            Cancel
          </Button>
          <Button type="submit" size="md" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </PageBody>
  );
}
