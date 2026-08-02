import { useEffect, useState } from 'react';
import type { Product, Modifier, ModifierGroup, CartLineModifier, CartLineDraft } from '@/types';
import { productApi } from '@/services/api/productApi';
import { MEAL_UPGRADE_PRICE } from '@/constants/order.constants';
import { formatCurrency, formatCalories } from '@/utils/currency';
import { unitPriceOf } from '@/utils/priceCalculator';
import { defaultSelection, pickedInGroup, unsatisfiedGroups } from '@/utils/modifierRules';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { ProductImage } from '@/components/cards/ProductImage';
import { Spinner } from '@/components/common/LoadingScreen';
import { QuantitySelector } from '@/components/controls/QuantitySelector';
import { cn } from '@/utils/cn';

type Step = 'customize' | 'meal';

interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (draft: CartLineDraft) => void;
}

export function ProductDetailModal({ product, onClose, onAdd }: Props) {
  const [step, setStep] = useState<Step>('customize');
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [available, setAvailable] = useState<Modifier[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Options come from the backend, so reload them whenever a new product opens.
  useEffect(() => {
    setStep('customize');
    setQty(1);
    setSelected({});
    setGroups([]);
    setAvailable([]);

    if (!product || !product.modifierGroupIds.length) return;

    let cancelled = false;
    setLoadingOptions(true);
    productApi
      .getProductModifiers(product.id)
      .then((data) => {
        if (cancelled) return;
        setGroups(data.groups);
        setAvailable(data.modifiers);
        // Required groups (a size, say) start on their cheapest option, so the
        // item is always in an orderable state — the server refuses a line that
        // is missing one.
        setSelected(defaultSelection(data.groups, data.modifiers));
      })
      .catch(() => {
        // Options unavailable — the plain item can still be ordered.
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => { cancelled = true; };
  }, [product]);

  if (!product) return null;

  const chosenModifiers: Modifier[] = available.filter((m) => selected[m.id]);
  const asLineMods: CartLineModifier[] = chosenModifiers.map((m) => ({
    modifierId: m.id, name: m.name, priceDelta: m.priceDelta,
  }));

  const previewUnit = unitPriceOf(product.price, 0, asLineMods);
  const previewCalories =
    product.calories + chosenModifiers.reduce((a, m) => a + m.calories, 0);

  const toggle = (group: (typeof groups)[number], modId: string) => {
    setSelected((prev) => {
      if (group.selectionType === 'single') {
        const next = { ...prev };
        group.modifierIds.forEach((id) => delete next[id]);
        next[modId] = true;
        return next;
      }
      // A group that is already at its ceiling takes no more — the order would
      // come back rejected rather than simply ignoring the extra pick.
      if (!prev[modId] && pickedInGroup(group, prev) >= group.max) return prev;
      return { ...prev, [modId]: !prev[modId] };
    });
  };

  const close = () => { setStep('customize'); setQty(1); setSelected({}); onClose(); };

  const commit = (isMeal: boolean) => {
    const draft: CartLineDraft = {
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: product.price,
      quantity: qty,
      isMeal,
      mealUpcharge: isMeal ? MEAL_UPGRADE_PRICE : 0,
      modifiers: asLineMods,
    };
    onAdd(draft);
    close();
  };

  // Defaults normally cover these, so this only bites when someone clears a
  // required multi-select — but it is what keeps a rejectable line out of the cart.
  const unmet = unsatisfiedGroups(groups, selected);

  const onAddPressed = () => {
    if (unmet.length) return;
    return product.isMealEligible ? setStep('meal') : commit(false);
  };

  return (
    <Modal open={!!product} onClose={close}>
      {step === 'customize' ? (
        <div className="flex max-h-[88vh] flex-col">
          <div className="pt-3"><div className="sheet-grip" /></div>

          {/* Uncropped, same as the grid card — the detail view shows the whole photo. */}
          <div className="flex h-64 shrink-0 items-center justify-center overflow-hidden bg-paper p-6">
            <ProductImage
              product={product}
              imgClassName="max-h-full max-w-full object-contain animate-scale-in"
              fallbackClassName="text-[7.5rem] leading-none animate-scale-in"
            />
          </div>

          <button
            onClick={close}
            className="press absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-mist text-kiosk-base text-charcoal transition-colors hover:bg-ash/30"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="no-scrollbar flex-1 overflow-y-auto px-8 pb-4">
            <div className="flex items-start justify-between gap-6">
              <h2 className="font-display text-kiosk-xl font-extrabold text-ink">{product.name}</h2>
              <span className="shrink-0 font-display text-kiosk-xl font-extrabold tabular-nums text-ink">
                {formatCurrency(product.price)}
              </span>
            </div>

            <p className="mt-3 text-kiosk-base leading-relaxed text-ash">{product.description}</p>
            <p className="mt-4 inline-block rounded-full bg-mist px-4 py-1.5 text-kiosk-xs font-bold text-ash">
              {formatCalories(previewCalories)}
            </p>

            {loadingOptions && (
              <div className="mt-8 flex items-center gap-4 text-kiosk-sm text-ash">
                <Spinner size={26} /> Loading options…
              </div>
            )}

            {groups.map((g) => (
              <section key={g.id} className="mt-8">
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="font-display text-kiosk-lg font-extrabold text-ink">{g.name}</h3>
                  <span
                    className={cn(
                      'rounded-full px-3.5 py-1 text-kiosk-xs font-bold',
                      g.required ? 'bg-flame-soft text-flame' : 'bg-mist text-ash',
                    )}
                  >
                    {g.required ? 'Required' : 'Optional'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {g.modifierIds.map((id) => {
                    const m = available.find((x) => x.id === id);
                    if (!m) return null;
                    const on = !!selected[id];
                    return (
                      <button
                        key={id}
                        onClick={() => toggle(g, id)}
                        className={cn(
                          'press flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition-all duration-200 ease-smooth',
                          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10',
                          on ? 'bg-cream ring-2 ring-ink' : 'bg-cream hover:bg-mist',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-kiosk-xs font-bold transition-all duration-200 ease-spring',
                              on ? 'scale-110 bg-ink text-white' : 'bg-mist',
                            )}
                          >
                            {on && '✓'}
                          </span>
                          <span className="truncate font-display text-kiosk-sm font-bold text-charcoal">{m.name}</span>
                        </span>
                        {m.priceDelta > 0 && (
                          <span className="shrink-0 text-kiosk-xs font-bold tabular-nums text-ash">
                            +{formatCurrency(m.priceDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="bg-paper px-8 py-6 shadow-bar">
            {unmet.length > 0 && (
              <p className="mb-4 text-center text-kiosk-sm font-bold text-flame animate-fade-in">
                Choose {unmet.map((g) => g.name.toLowerCase()).join(' and ')} to continue
              </p>
            )}
            <div className="flex items-center gap-5">
              <QuantitySelector value={qty} onChange={setQty} />
              <Button size="xl" fullWidth onClick={onAddPressed} disabled={unmet.length > 0}>
                Add to order · {formatCurrency(previewUnit * qty)}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <MealUpgradeStep
          product={product}
          onMeal={() => commit(true)}
          onItemOnly={() => commit(false)}
          onBack={() => setStep('customize')}
        />
      )}
    </Modal>
  );
}

/** The "Would you like a side and a drink?" combo step. */
function MealUpgradeStep({
  product, onMeal, onItemOnly, onBack,
}: { product: Product; onMeal: () => void; onItemOnly: () => void; onBack: () => void }) {
  return (
    <div className="p-8 animate-fade-in">
      <div className="pb-6"><div className="sheet-grip" /></div>

      <h2 className="text-center font-display text-kiosk-2xl font-extrabold text-ink">Make it a meal?</h2>
      <p className="mt-3 text-center text-kiosk-base text-ash">Add fries and a drink for less than buying them alone</p>

      <div className="mt-8 grid grid-cols-2 gap-5">
        <button
          onClick={onMeal}
          className="press group relative flex flex-col items-center gap-4 rounded-xl3 bg-cream p-8 ring-2 ring-ink transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-card"
        >
          <span className="absolute right-5 top-5 rounded-full bg-amber px-3.5 py-1 font-display text-kiosk-xs font-bold text-ink">
            Best value
          </span>
          <div className="flex items-end gap-2 text-[4rem] transition-transform duration-500 ease-spring group-hover:scale-105">
            🍟🥤{product.image}
          </div>
          <span className="font-display text-kiosk-lg font-extrabold text-ink">Yes, make it a meal</span>
          <span className="rounded-full bg-amber px-6 py-2 font-display text-kiosk-sm font-bold text-ink">
            +{formatCurrency(MEAL_UPGRADE_PRICE)}
          </span>
        </button>

        <button
          onClick={onItemOnly}
          className="press group flex flex-col items-center gap-4 rounded-xl3 bg-cream p-8 transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-card"
        >
          <div className="text-[4rem] transition-transform duration-500 ease-spring group-hover:scale-105">
            {product.image}
          </div>
          <span className="font-display text-kiosk-lg font-extrabold text-ink">No, item only</span>
          <span className="rounded-full bg-mist px-6 py-2 font-display text-kiosk-sm font-bold text-ash">
            {formatCurrency(product.price)}
          </span>
        </button>
      </div>

      <button
        onClick={onBack}
        className="press mx-auto mt-6 block rounded-full px-8 py-4 font-display text-kiosk-sm font-bold text-ash transition-colors hover:bg-mist hover:text-ink"
      >
        Back
      </button>
    </div>
  );
}
