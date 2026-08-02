import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CouponGenerateInput } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  clearCampaignError,
  clearGeneratedCoupons,
  fetchCampaign,
  generateCoupons,
} from '@/redux/slices/campaignsSlice';
import { fetchProducts } from '@/redux/slices/productsSlice';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/LoadingScreen';
import {
  AlertBanner,
  CouponTypeBadge,
  DateInput,
  Field,
  PageBody,
  PageHeader,
  Select,
  Stat,
  TextInput,
  type SelectOption,
} from '@/components/admin';
import { formatCurrency } from '@/utils/currency';
import { formatDay } from '@/utils/couponDisplay';
import { ADMIN_PATHS } from '@/routes/paths';

/** Handy round numbers, so the common cases are one tap. */
const QUANTITY_PRESETS = [1, 10, 50, 100, 500];
const AMOUNT_PRESETS = [200, 500, 1000, 10000];

interface Errors {
  quantity?: string;
  amount?: string;
  productId?: string;
  expiryDate?: string;
  codePrefix?: string;
}

export default function GenerateCouponsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const numericId = Number(campaignId);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { current, lastGenerated, loading, saving, error } = useAppSelector((s) => s.campaigns);
  const products = useAppSelector((s) => s.products.items);

  const [quantity, setQuantity] = useState(10);
  const [amount, setAmount] = useState(500);
  const [productId, setProductId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    dispatch(clearCampaignError());
    dispatch(clearGeneratedCoupons());
    void dispatch(fetchCampaign(numericId));
    if (products.length === 0) void dispatch(fetchProducts());
  }, [dispatch, numericId, products.length]);

  const isProduct = current?.couponType === 'product';

  // Coupons default to the campaign's own expiry, which is also their ceiling.
  useEffect(() => {
    if (current && !expiryDate) setExpiryDate(current.expiryDate);
  }, [current, expiryDate]);

  const productOptions = useMemo<SelectOption<string>[]>(
    () =>
      [...products]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((product) => ({
          value: String(product.id),
          label: `${product.name} — ${formatCurrency(product.price)}`,
        })),
    [products],
  );

  const validate = (): boolean => {
    const next: Errors = {};
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      next.quantity = 'Between 1 and 1000 at a time.';
    }
    if (isProduct) {
      if (!productId) next.productId = 'Pick the item this coupon gives away.';
    } else if (!amount || amount <= 0) {
      next.amount = 'Give the coupon a value above zero.';
    }
    if (current && expiryDate && expiryDate > current.expiryDate) {
      next.expiryDate = `The campaign ends on ${current.expiryDate}, so coupons cannot run past it.`;
    }
    if (codePrefix && !/^[A-Za-z0-9]+$/.test(codePrefix)) {
      next.codePrefix = 'Letters and digits only.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!current || !validate()) return;

    // The API rejects a value coupon carrying a product and vice versa, so only
    // the field that belongs to this campaign's type is sent at all.
    const input: CouponGenerateInput = {
      quantity,
      expiryDate: expiryDate || undefined,
      codePrefix: codePrefix.toUpperCase() || undefined,
      customerId: customerId.trim() || undefined,
      ...(isProduct ? { productId } : { amount }),
    };

    await dispatch(generateCoupons({ campaignId: numericId, input }));
  };

  const copyCodes = () => {
    void navigator.clipboard?.writeText(lastGenerated.map((c) => c.couponCode).join('\n'));
  };

  if (loading && !current) {
    return (
      <PageBody>
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner size={52} />
        </div>
      </PageBody>
    );
  }

  if (!current) {
    return (
      <PageBody>
        <PageHeader title="Generate coupons" backTo={ADMIN_PATHS.campaigns} />
        <AlertBanner message={error ?? 'That campaign could not be loaded.'} />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title="Generate coupons"
        subtitle={
          <>
            for <span className="font-semibold text-charcoal">{current.name}</span> · runs{' '}
            {formatDay(current.startDate)} → {formatDay(current.expiryDate)}
          </>
        }
        backTo={ADMIN_PATHS.campaignEdit(numericId)}
        actions={<CouponTypeBadge type={current.couponType} />}
      />

      <AlertBanner message={error} onDismiss={() => dispatch(clearCampaignError())} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Existing coupons" value={String(current.couponCount)} />
        <Stat label="Fully redeemed" value={String(current.redeemedCount)} />
        <Stat label="Issued value" value={formatCurrency(current.issuedValue)} />
        <Stat label="Value left" value={formatCurrency(current.remainingValue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl3 bg-paper p-7 shadow-soft">
          <Field label="How many" required error={errors.quantity}>
            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                type="number"
                min={1}
                max={1000}
                value={quantity}
                invalid={Boolean(errors.quantity)}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-32"
              />
              {QUANTITY_PRESETS.map((preset) => (
                <Preset key={preset} active={quantity === preset} onClick={() => setQuantity(preset)}>
                  {preset}
                </Preset>
              ))}
            </div>
          </Field>

          {isProduct ? (
            <Field
              label="Free item"
              required
              error={errors.productId}
              hint="Each coupon is good for one of these, and can only be redeemed once."
            >
              <Select
                value={productId}
                invalid={Boolean(errors.productId)}
                onChange={setProductId}
                options={[{ value: '', label: 'Choose an item…' }, ...productOptions]}
              />
            </Field>
          ) : (
            <Field
              label="Value each"
              required
              error={errors.amount}
              hint="Spendable across several visits until the balance reaches zero."
            >
              <div className="flex flex-wrap items-center gap-2">
                <TextInput
                  type="number"
                  min={1}
                  value={amount}
                  invalid={Boolean(errors.amount)}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-36"
                />
                {AMOUNT_PRESETS.map((preset) => (
                  <Preset key={preset} active={amount === preset} onClick={() => setAmount(preset)}>
                    {formatCurrency(preset)}
                  </Preset>
                ))}
              </div>
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Expires"
              error={errors.expiryDate}
              hint={`Cannot be later than ${current.expiryDate}.`}
            >
              <DateInput
                value={expiryDate}
                max={current.expiryDate}
                invalid={Boolean(errors.expiryDate)}
                onChange={setExpiryDate}
              />
            </Field>

            <Field
              label="Code prefix"
              error={errors.codePrefix}
              hint="Letters and digits. The rest of each code is random."
            >
              <TextInput
                value={codePrefix}
                maxLength={10}
                placeholder="FK"
                invalid={Boolean(errors.codePrefix)}
                onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
              />
            </Field>
          </div>

          <Field label="Issue to customer" hint="Optional — an id to tie these coupons to one person.">
            <TextInput
              value={customerId}
              maxLength={50}
              placeholder="Leave blank for bearer coupons"
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </Field>

          <div className="mt-2 flex justify-end gap-3">
            <Button
              type="button"
              size="md"
              variant="secondary"
              onClick={() => navigate(ADMIN_PATHS.campaignEdit(numericId))}
            >
              Cancel
            </Button>
            <Button type="submit" size="md" disabled={saving}>
              {saving ? 'Generating…' : `Generate ${quantity} coupon${quantity === 1 ? '' : 's'}`}
            </Button>
          </div>
        </form>

        {/* Codes are random and shown once here — the list is the only place
            they appear together, so copying them out matters. */}
        <aside className="flex flex-col rounded-xl3 bg-paper p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3 pb-4">
            <h2 className="font-display text-base font-extrabold text-ink">
              {lastGenerated.length > 0 ? `${lastGenerated.length} generated` : 'Generated codes'}
            </h2>
            {lastGenerated.length > 0 && (
              <div className="flex gap-2">
                <Button size="md" variant="secondary" className="h-10 px-4 text-xs" onClick={copyCodes}>
                  Copy all
                </Button>
                <Button
                  size="md"
                  className="h-10 px-4 text-xs"
                  onClick={() => navigate(`${ADMIN_PATHS.coupons}?campaignId=${numericId}`)}
                >
                  View all
                </Button>
              </div>
            )}
          </div>

          {lastGenerated.length === 0 ? (
            <p className="py-10 text-center text-sm leading-relaxed text-ash">
              Codes appear here once you generate them.
              <br />
              They are random, so copy them before leaving this page.
            </p>
          ) : (
            <ul className="no-scrollbar flex max-h-[460px] flex-col gap-1.5 overflow-y-auto">
              {lastGenerated.map((coupon) => (
                <li
                  key={coupon.couponId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-cream px-4 py-2.5"
                >
                  <code className="font-mono text-sm font-semibold tracking-tight text-ink">
                    {coupon.couponCode}
                  </code>
                  <span className="shrink-0 text-xs text-ash">
                    {coupon.couponType === 'value'
                      ? formatCurrency(coupon.originalAmount ?? 0)
                      : (coupon.productName ?? 'Free item')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </PageBody>
  );
}

function Preset({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press rounded-full px-3.5 py-2 font-display text-xs font-bold transition-colors duration-150 ${
        active ? 'bg-ink text-white' : 'bg-cream text-charcoal hover:bg-mist'
      }`}
    >
      {children}
    </button>
  );
}
