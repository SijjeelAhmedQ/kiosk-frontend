import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ProductAdmin } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  clearCatalogError,
  deleteProduct,
  fetchCategoriesAdmin,
  fetchProductsAdmin,
  setProductActive,
} from '@/redux/slices/catalogAdminSlice';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/common/Modal';
import { SearchBar } from '@/components/controls/SearchBar';
import {
  AlertBanner,
  Field,
  imageSrc,
  ListRow,
  ListView,
  PageBody,
  PageHeader,
  RowTile,
  Select,
  Stat,
  type SelectOption,
} from '@/components/admin';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/utils/cn';
import { ADMIN_PATHS } from '@/routes/paths';

type ActiveFilter = '' | 'active' | 'hidden';

const ACTIVE_OPTIONS: SelectOption<ActiveFilter>[] = [
  { value: '', label: 'Shown and hidden' },
  { value: 'active', label: 'On the menu' },
  { value: 'hidden', label: 'Hidden' },
];

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-amber-soft text-amber-dark',
  popular: 'bg-leaf-soft text-leaf',
  deal: 'bg-flame-soft text-flame',
};

/**
 * The menu itself.
 *
 * Filtering happens on the server so the counts in the header are the truth
 * rather than whatever survived a local filter — the same reason the coupon
 * list pushes its filters into the query.
 */
export default function ProductListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const { products, categories, loadingProducts, saving, error } = useAppSelector(
    (s) => s.catalogAdmin,
  );

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
  const [active, setActive] = useState<ActiveFilter>('');
  const [pendingDelete, setPendingDelete] = useState<ProductAdmin | null>(null);

  useEffect(() => {
    void dispatch(fetchCategoriesAdmin());
  }, [dispatch]);

  useEffect(() => {
    void dispatch(
      fetchProductsAdmin({
        categoryId: categoryId || undefined,
        search: debouncedSearch.trim() || undefined,
        isActive: active === '' ? undefined : active === 'active',
      }),
    );
  }, [dispatch, categoryId, debouncedSearch, active]);

  const categoryOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const onMenu = products.filter((p) => p.isActive).length;
  const filtered = Boolean(debouncedSearch || categoryId || active);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const result = await dispatch(deleteProduct(pendingDelete.id));
    if (deleteProduct.fulfilled.match(result)) {
      setPendingDelete(null);
      void dispatch(fetchProductsAdmin({ categoryId: categoryId || undefined }));
    }
  };

  const toggleActive = async (product: ProductAdmin) => {
    await dispatch(setProductActive({ id: product.id, isActive: !product.isActive }));
    void dispatch(
      fetchProductsAdmin({
        categoryId: categoryId || undefined,
        search: debouncedSearch.trim() || undefined,
        isActive: active === '' ? undefined : active === 'active',
      }),
    );
  };

  return (
    <PageBody fill>
      {/* Everything above the list keeps its height; the list takes what is
          left and scrolls inside itself, so the page never does. The menu is
          the one screen you scan for a long time, and losing the search box off
          the top of it every time is what makes that tiring. */}
      <div className="shrink-0">
        <PageHeader
          title="Products"
          subtitle="Everything the kiosk can sell. Hiding a product takes it off the menu and leaves the history alone."
          actions={
            <Button size="md" onClick={() => navigate(ADMIN_PATHS.productNew)}>
              New product
            </Button>
          }
        />

        <AlertBanner message={error} onDismiss={() => dispatch(clearCatalogError())} />

        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div className="grid max-w-[34rem] flex-1 grid-cols-2 gap-3">
            <Stat label="Matching" value={String(products.length)} />
            <Stat label="On the menu" value={String(onMenu)} tone="text-leaf" />
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-4 rounded-xl3 bg-paper p-5 shadow-soft">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or description…"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={categoryId} onChange={setCategoryId} options={categoryOptions} />
            </Field>
            <Field label="Visibility">
              <Select<ActiveFilter> value={active} onChange={setActive} options={ACTIVE_OPTIONS} />
            </Field>
          </div>
        </div>
      </div>

      <ListView
        fill
        rows={products}
        rowKey={(p) => p.id}
        loading={loadingProducts}
        renderRow={(p) => (
          <ProductCard
            product={p}
            saving={saving}
            onOpen={() => navigate(ADMIN_PATHS.productEdit(p.id))}
            onToggleActive={() => void toggleActive(p)}
            onDelete={() => setPendingDelete(p)}
          />
        )}
        empty={
          <EmptyState
            icon="🍔"
            title={filtered ? 'No matching products' : 'No products yet'}
            message={
              filtered
                ? 'Try a different search, category or visibility.'
                : 'Add the first item on the menu.'
            }
            action={
              <Button size="md" onClick={() => navigate(ADMIN_PATHS.productNew)}>
                New product
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
            {pendingDelete && pendingDelete.orderLineCount > 0
              ? `This product is on ${pendingDelete.orderLineCount} order line(s), so it cannot be deleted — a sales report that cannot resolve its own products is worse than a stale menu row. Hide it instead.`
              : pendingDelete && pendingDelete.couponCount > 0
                ? `${pendingDelete.couponCount} coupon(s) give this product away, so it cannot be deleted. Cancel those coupons first, or hide the product.`
                : 'The product is removed for good, along with its modifier links. Nothing has been sold with it.'}
          </p>

          <AlertBanner message={error} onDismiss={() => dispatch(clearCatalogError())} />

          <div className="flex justify-end gap-3">
            <Button size="md" variant="secondary" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              size="md"
              variant="danger"
              disabled={saving || !canDelete(pendingDelete)}
              onClick={() => void confirmDelete()}
            >
              {saving ? 'Deleting…' : 'Delete product'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageBody>
  );
}

/** The API refuses these too — the button greys rather than offering a 409. */
const canDelete = (product: ProductAdmin | null): boolean =>
  Boolean(product) && product!.orderLineCount === 0 && product!.couponCount === 0;

interface ProductCardProps {
  product: ProductAdmin;
  saving: boolean;
  onOpen: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function ProductCard({ product, saving, onOpen, onToggleActive, onDelete }: ProductCardProps) {
  const art = imageSrc(product.imgBase64);

  return (
    <ListRow
      accent={product.isActive ? 'bg-leaf' : 'bg-ash/40'}
      openLabel={`Edit ${product.name}`}
      onOpen={onOpen}
      lead={
        <RowTile>
          {art ? (
            <img src={art} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            product.image || '🍽️'
          )}
        </RowTile>
      }
      title={
        <>
          <p className="truncate font-display text-base font-extrabold text-ink">{product.name}</p>
          {product.badge && (
            <span
              className={cn(
                'rounded-full px-3 py-1 font-display text-xs font-bold capitalize',
                BADGE_STYLES[product.badge] ?? 'bg-mist text-charcoal',
              )}
            >
              {product.badge}
            </span>
          )}
          {!product.isActive && (
            <span className="rounded-full bg-mist px-3 py-1 font-display text-xs font-bold text-ash">
              Hidden
            </span>
          )}
        </>
      }
      subtitle={product.description || product.categoryName}
      meta={
        <>
          <span>{product.categoryName}</span>
          <span className="opacity-70">· {product.calories} kcal</span>
          {product.isMealEligible && <span className="opacity-70">· meal upgrade</span>}
          {product.orderLineCount > 0 && (
            <span className="rounded-full bg-cream px-2 py-0.5 tabular-nums">
              sold on {product.orderLineCount}
            </span>
          )}
        </>
      }
      trailing={
        <div className="w-32">
          <p className="font-display text-lg font-extrabold tabular-nums text-ink">
            {formatCurrency(product.price)}
          </p>
          <p className="mt-1.5 text-xs text-ash">position {product.sortOrder}</p>
        </div>
      }
      actions={
        <>
          <RowAction onClick={onToggleActive} disabled={saving}>
            {product.isActive ? 'Hide' : 'Show'}
          </RowAction>
          <RowAction
            tone="danger"
            onClick={onDelete}
            disabled={!canDelete(product)}
            title={canDelete(product) ? undefined : 'It has been sold or promised — hide it instead'}
          >
            Delete
          </RowAction>
        </>
      }
    />
  );
}

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
