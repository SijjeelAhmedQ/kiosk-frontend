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
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

const blankForm: FormState = { id: '', name: '', icon: '', sortOrder: 0, isActive: true };

type Errors = Partial<Record<keyof FormState, string>>;

/** Ids go in the URL and into every product row, so keep them boring. */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** "Grilled Favourites" -> "grilled_favourites", so nobody has to invent one. */
const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

/**
 * Create and edit share this page, the way the campaign form does. The only
 * differences are that the id locks once it exists — it is a foreign key by
 * then — and that editing knows how many products would be affected.
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
  /** Stops the slug overwriting an id somebody typed on purpose. */
  const [idTouched, setIdTouched] = useState(false);

  useEffect(() => {
    dispatch(clearCatalogError());
    if (isEdit && categoryId) void dispatch(fetchCategoryAdmin(categoryId));
    else dispatch(clearCurrentCategory());
    return () => { dispatch(clearCurrentCategory()); };
  }, [dispatch, isEdit, categoryId]);

  useEffect(() => {
    if (isEdit && currentCategory && currentCategory.id === categoryId) {
      setForm({
        id: currentCategory.id,
        name: currentCategory.name,
        icon: currentCategory.icon,
        sortOrder: currentCategory.sortOrder,
        isActive: currentCategory.isActive,
      });
      setIdTouched(true);
    }
  }, [isEdit, currentCategory, categoryId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      id: !isEdit && !idTouched ? slugify(name) : prev.id,
    }));
    setErrors((prev) => ({ ...prev, name: undefined, id: undefined }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Give the category a name.';
    if (!form.id.trim()) next.id = 'Give the category an id.';
    else if (!ID_PATTERN.test(form.id)) next.id = 'Letters, digits, dashes and underscores only.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const result = isEdit
      ? await dispatch(
          updateCategory({
            id: form.id,
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
            id: form.id.trim(),
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
            ? 'The id cannot change — every product in this category points at it.'
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
            onChange={(e) => onNameChange(e.target.value)}
          />
        </Field>

        <Field
          label="Id"
          required
          error={errors.id}
          hint={
            isEdit
              ? 'Fixed once products point at it.'
              : 'Filled in from the name. Change it now if you want something else — it is permanent.'
          }
        >
          <TextInput
            value={form.id}
            maxLength={50}
            disabled={isEdit}
            placeholder="burgers"
            invalid={Boolean(errors.id)}
            onChange={(e) => {
              setIdTouched(true);
              update('id', e.target.value);
            }}
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

          <Field label="Position" hint="Lower numbers come first on the kiosk.">
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
