import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  clearCatalogError,
  clearCurrentCategory,
  createCategory,
  fetchCategoryAdmin,
  updateCategory,
} from '@/redux/slices/catalogAdminSlice';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/LoadingScreen';
import {
  AlertBanner,
  Field,
  ImagePicker,
  PageBody,
  PageHeader,
  Stat,
  TextInput,
  Toggle,
} from '@/components/admin';
import { ADMIN_PATHS } from '@/routes/paths';

interface FormState {
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

const blankForm: FormState = { name: '', icon: '', sortOrder: 0, isActive: true };

type Errors = Partial<Record<keyof FormState, string>>;

/**
 * Create and edit share this page, the way the campaign form does. The only
 * difference is that editing knows how many products would be affected.
 *
 * There is no id field. The API generates the id from the name and it can never
 * change afterwards, so there is nothing here for anyone to fill in or get
 * wrong — see sql/09_catalog_admin.sql.
 */
export default function CategoryFormPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const isEdit = Boolean(categoryId);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentCategory, saving, error } = useAppSelector((s) => s.catalogAdmin);

  const [form, setForm] = useState<FormState>(blankForm);
  const [errors, setErrors] = useState<Errors>({});
  /** undefined until the picker is touched — see the imgBase64 rule in the API. */
  const [image, setImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    dispatch(clearCatalogError());
    if (isEdit && categoryId) void dispatch(fetchCategoryAdmin(categoryId));
    else dispatch(clearCurrentCategory());
    return () => { dispatch(clearCurrentCategory()); };
  }, [dispatch, isEdit, categoryId]);

  useEffect(() => {
    if (isEdit && currentCategory && currentCategory.id === categoryId) {
      setForm({
        name: currentCategory.name,
        icon: currentCategory.icon,
        sortOrder: currentCategory.sortOrder,
        isActive: currentCategory.isActive,
      });
    }
  }, [isEdit, currentCategory, categoryId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Give the category a name.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const result = isEdit
      ? await dispatch(
          updateCategory({
            id: categoryId!,
            input: {
              name: form.name.trim(),
              icon: form.icon,
              sortOrder: form.sortOrder,
              isActive: form.isActive,
              // Left out entirely when untouched, so the stored artwork stays.
              ...(image === undefined ? {} : { imgBase64: image }),
            },
          }),
        )
      : await dispatch(
          createCategory({
            name: form.name.trim(),
            icon: form.icon,
            sortOrder: form.sortOrder,
            isActive: form.isActive,
            imgBase64: image || null,
          }),
        );

    if (createCategory.fulfilled.match(result) || updateCategory.fulfilled.match(result)) {
      navigate(ADMIN_PATHS.categories);
    }
  };

  if (isEdit && !currentCategory) {
    return (
      <PageBody>
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner size={52} />
        </div>
      </PageBody>
    );
  }

  const storedImage = currentCategory?.imgBase64 ?? currentCategory?.image ?? null;

  return (
    <PageBody>
      <PageHeader
        title={isEdit ? 'Edit category' : 'New category'}
        subtitle={
          isEdit
            ? 'Changes show on Friends Kitchen immediately. Nothing in the category moves.'
            : 'A section of the menu. Products are added to it afterwards.'
        }
        backTo={ADMIN_PATHS.categories}
      />

      <AlertBanner message={error} onDismiss={() => dispatch(clearCatalogError())} />

      {isEdit && currentCategory && (
        <div className="mb-6 grid max-w-[46rem] grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Products" value={String(currentCategory.productCount)} />
          <Stat label="On the menu" value={String(currentCategory.activeProductCount)} />
          <Stat
            label="Visible"
            value={currentCategory.isActive ? 'Yes' : 'No'}
            tone={currentCategory.isActive ? 'text-leaf' : 'text-ash'}
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
            maxLength={100}
            placeholder="Burgers"
            invalid={Boolean(errors.name)}
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>

        <Field label="Image">
          <ImagePicker
            value={image === undefined ? storedImage : image}
            onChange={setImage}
            fallback={form.icon || '🗂️'}
            disabled={saving}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Emoji" hint="The fallback, and what the sidebar shows.">
            <TextInput
              value={form.icon}
              maxLength={20}
              placeholder="🍔"
              onChange={(e) => update('icon', e.target.value)}
            />
          </Field>

          <Field label="Position" hint="Lower numbers come first on Friends Kitchen.">
            <TextInput
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => update('sortOrder', Number(e.target.value) || 0)}
            />
          </Field>
        </div>

        <Toggle
          label="Show on the order"
          hint="Hiding a category hides everything in it, without deleting anything."
          checked={form.isActive}
          onChange={(checked) => update('isActive', checked)}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            size="md"
            variant="secondary"
            onClick={() => navigate(ADMIN_PATHS.categories)}
          >
            Cancel
          </Button>
          <Button type="submit" size="md" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </PageBody>
  );
}
