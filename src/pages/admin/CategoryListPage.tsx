import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CategoryAdmin } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  clearCatalogError,
  deleteCategory,
  fetchCategoriesAdmin,
  updateCategory,
} from '@/redux/slices/catalogAdminSlice';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/common/Modal';
import { SearchBar } from '@/components/controls/SearchBar';
import {
  AlertBanner,
  imageSrc,
  ListRow,
  ListView,
  PageBody,
  PageHeader,
  RowTile,
  Stat,
} from '@/components/admin';
import { cn } from '@/utils/cn';
import { ADMIN_PATHS } from '@/routes/paths';

/**
 * The menu's sections.
 *
 * Unpaged on purpose: a restaurant has a handful of categories, and a pager
 * over six rows is furniture. The search box is here because the list doubles
 * as the place you check whether a section already exists before adding one.
 */
export default function CategoryListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { categories, loadingCategories, saving, error } = useAppSelector((s) => s.catalogAdmin);

  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CategoryAdmin | null>(null);

  useEffect(() => {
    void dispatch(fetchCategoriesAdmin());
  }, [dispatch]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(needle) || c.id.includes(needle));
  }, [categories, search]);

  const activeCount = categories.filter((c) => c.isActive).length;
  const productCount = categories.reduce((sum, c) => sum + c.productCount, 0);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const result = await dispatch(deleteCategory(pendingDelete.id));
    // Only close on success — a refusal names the reason, and it belongs on screen.
    if (deleteCategory.fulfilled.match(result)) {
      setPendingDelete(null);
      void dispatch(fetchCategoriesAdmin());
    }
  };

  const toggleActive = async (category: CategoryAdmin) => {
    await dispatch(
      updateCategory({ id: category.id, input: { name: category.name, isActive: !category.isActive } }),
    );
    void dispatch(fetchCategoriesAdmin());
  };

  return (
    <PageBody fill>
      {/* Header, figures and search hold their height; the list takes what is
          left and scrolls inside itself. */}
      <div className="shrink-0">
        <PageHeader
          title="Categories"
          subtitle="The sections the kiosk groups the menu into. A category has to exist before anything can be put in it."
          actions={
            <Button size="md" onClick={() => navigate(ADMIN_PATHS.categoryNew)}>
              New category
            </Button>
          }
        />

        <AlertBanner message={error} onDismiss={() => dispatch(clearCatalogError())} />

        <div className="mb-5 grid max-w-[34rem] grid-cols-2 gap-3">
          <Stat label="Categories" value={`${activeCount} of ${categories.length} active`} />
          <Stat label="Products in them" value={String(productCount)} />
        </div>

        <div className="mb-5">
          <SearchBar value={search} onChange={setSearch} placeholder="Search categories…" />
        </div>
      </div>

      <ListView
        fill
        rows={shown}
        rowKey={(c) => c.id}
        loading={loadingCategories}
        renderRow={(c) => (
          <CategoryCard
            category={c}
            saving={saving}
            onOpen={() => navigate(ADMIN_PATHS.categoryEdit(c.id))}
            onViewProducts={() => navigate(`${ADMIN_PATHS.products}?categoryId=${c.id}`)}
            onToggleActive={() => void toggleActive(c)}
            onDelete={() => setPendingDelete(c)}
          />
        )}
        empty={
          <EmptyState
            icon="🗂️"
            title={search ? 'No matching categories' : 'No categories yet'}
            message={
              search
                ? 'Try a different name.'
                : 'Add a category first — every product belongs to one.'
            }
            action={
              <Button size="md" onClick={() => navigate(ADMIN_PATHS.categoryNew)}>
                New category
              </Button>
            }
          />
        }
      />

      <Modal open={Boolean(pendingDelete)} size="md" onClose={() => setPendingDelete(null)}>
        <div className="flex flex-col gap-5 p-8">
          <h2 className="font-display text-xl font-extrabold text-ink">
            Delete “{pendingDelete?.name}”?
          </h2>
          <p className="text-sm leading-relaxed text-ash">
            {pendingDelete && pendingDelete.productCount > 0
              ? `${pendingDelete.productCount} product(s) are still in this category, so it cannot be deleted. Move them elsewhere first, or deactivate the category — that takes it off the kiosk and keeps everything in place.`
              : 'The category is removed for good. Nothing is in it, so nothing else changes.'}
          </p>

          <AlertBanner message={error} onDismiss={() => dispatch(clearCatalogError())} />

          <div className="flex justify-end gap-3">
            <Button size="md" variant="secondary" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              size="md"
              variant="danger"
              disabled={saving || (pendingDelete?.productCount ?? 0) > 0}
              onClick={() => void confirmDelete()}
            >
              {saving ? 'Deleting…' : 'Delete category'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageBody>
  );
}

interface CategoryCardProps {
  category: CategoryAdmin;
  saving: boolean;
  onOpen: () => void;
  onViewProducts: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function CategoryCard({
  category,
  saving,
  onOpen,
  onViewProducts,
  onToggleActive,
  onDelete,
}: CategoryCardProps) {
  const art = imageSrc(category.imgBase64 ?? category.image);
  const emptied = category.productCount === 0;

  return (
    <ListRow
      accent={category.isActive ? 'bg-leaf' : 'bg-ash/40'}
      openLabel={`Edit ${category.name}`}
      onOpen={onOpen}
      lead={
        <RowTile>
          {art ? (
            <img src={art} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            category.icon || '🗂️'
          )}
        </RowTile>
      }
      title={
        <>
          <p className="truncate font-display text-base font-extrabold text-ink">{category.name}</p>
          {!category.isActive && (
            <span className="rounded-full bg-mist px-3 py-1 font-display text-xs font-bold text-ash">
              Hidden
            </span>
          )}
        </>
      }
      subtitle={<code className="font-mono text-xs text-ash">{category.id}</code>}
      meta={
        <>
          <span>Position {category.sortOrder}</span>
          <span className="opacity-70">
            · {category.activeProductCount} of {category.productCount} products on the menu
          </span>
        </>
      }
      trailing={
        <div className="w-40">
          <p className="font-display text-lg font-extrabold tabular-nums text-ink">
            {category.productCount}
          </p>
          <p className="mt-1.5 text-xs text-ash">
            {category.productCount === 1 ? 'product' : 'products'}
          </p>
        </div>
      }
      actions={
        <>
          <RowAction onClick={onViewProducts}>Products</RowAction>
          <RowAction onClick={onToggleActive} disabled={saving}>
            {category.isActive ? 'Hide' : 'Show'}
          </RowAction>
          <RowAction
            tone="danger"
            onClick={onDelete}
            disabled={!emptied}
            title={emptied ? undefined : 'Empty the category first'}
          >
            Delete
          </RowAction>
        </>
      }
    />
  );
}

/** Same pill as the campaign list's row actions — one vocabulary for both. */
function RowAction({
  tone = 'default',
  disabled,
  onClick,
  title,
  children,
}: {
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'press rounded-full px-3.5 py-2 font-display text-xs font-bold transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger'
          ? 'bg-flame-soft text-flame hover:bg-flame hover:text-white'
          : 'bg-cream text-charcoal hover:bg-mist',
      )}
    >
      {children}
    </button>
  );
}
