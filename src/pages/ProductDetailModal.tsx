import { useEffect, useState } from 'react';
import type { Product, Modifier, ModifierGroup, CartLineModifier, CartLineDraft } from '@/types';
import { productApi } from '@/services/api/productApi';
import { MEAL_UPGRADE_PRICE } from '@/constants/order.constants';
import { formatCurrency, formatCalories } from '@/utils/currency';
import { unitPriceOf } from '@/utils/priceCalculator';
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

  const onAddPressed = () => (product.isMealEligible ? setStep('meal') : commit(false));

  return (
    <Modal open={!!product} onClose={close}>
      {step === 'customize' ? (
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex h-52 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-b from-mist/50 to-cream p-6">
            <ProductImage
              product={product}
              imgClassName="max-h-full max-w-full object-contain"
              fallbackClassName="text-[7rem] leading-none"
            />
          </div>
          <button onClick={close} className="press absolute right-6 top-6 flex h-14 w-14 items-center justify-center rounded-full bg-paper text-kiosk-lg shadow-card" aria-label="Close">✕</button>

          <div className="no-scrollbar flex-1 overflow-y-auto px-8 pb-4">
            <h2 className="font-display text-kiosk-xl font-extrabold text-ink">{product.name}</h2>
            <p className="mt-2 text-kiosk-base text-ash">{product.description}</p>
            <p className="mt-2 text-kiosk-sm text-ash">{formatCalories(previewCalories)}</p>

            {loadingOptions && (
              <div className="mt-8 flex items-center gap-4 text-kiosk-sm text-ash">
                <Spinner size={28} /> Loading options…
              </div>
            )}

            {groups.map((g) => (
              <section key={g.id} className="mt-8">
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-display text-kiosk-lg font-bold text-charcoal">{g.name}</h3>
                  <span className="text-kiosk-xs text-ash">{g.required ? 'Required' : 'Optional'}</span>
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
                          'press flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-colors',
                          on ? 'border-flame bg-flame-soft' : 'border-mist bg-paper',
                        )}
                      >
                        <span className="font-display text-kiosk-sm font-bold text-charcoal">{m.name}</span>
                        {m.priceDelta > 0 && <span className="text-kiosk-xs text-ash">+{formatCurrency(m.priceDelta)}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="flex items-center gap-6 border-t border-mist bg-cream px-8 py-6">
            <QuantitySelector value={qty} onChange={setQty} />
            <Button size="xl" fullWidth onClick={onAddPressed}>
              Add to order · {formatCurrency(previewUnit * qty)}
            </Button>
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
    <div className="p-8">
      <h2 className="text-center font-display text-kiosk-2xl font-extrabold text-ink">
        Would you like a side and a drink?
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-5">
        <button onClick={onMeal} className="press flex flex-col items-center gap-4 rounded-xl3 border-2 border-flame bg-flame-soft p-8">
          <div className="flex items-end gap-2 text-[4rem]">🍟🥤{product.image}</div>
          <span className="font-display text-kiosk-lg font-bold text-charcoal">Yes, make it a meal</span>
          <span className="rounded-full bg-flame px-5 py-1 font-display text-kiosk-sm font-bold text-white">+{formatCurrency(MEAL_UPGRADE_PRICE)}</span>
        </button>
        <button onClick={onItemOnly} className="press flex flex-col items-center gap-4 rounded-xl3 border-2 border-mist bg-paper p-8">
          <div className="text-[4rem]">{product.image}</div>
          <span className="font-display text-kiosk-lg font-bold text-charcoal">No, item only</span>
          <span className="text-kiosk-sm text-ash">{formatCurrency(product.price)}</span>
        </button>
      </div>
      <button onClick={onBack} className="press mx-auto mt-6 block rounded-2xl px-8 py-4 font-display text-kiosk-sm font-bold text-ash">
        ← Back
      </button>
    </div>
  );
}
