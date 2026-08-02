import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CouponType } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  clearCampaignError,
  clearCurrentCampaign,
  createCampaign,
  fetchCampaign,
  updateCampaign,
} from '@/redux/slices/campaignsSlice';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/LoadingScreen';
import {
  AlertBanner,
  CampaignStateBadge,
  DateTimeInput,
  Field,
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
import { endOfDayInstant, formatDayTime, startOfTodayInstant } from '@/utils/couponDisplay';
import { ADMIN_PATHS } from '@/routes/paths';

interface FormState {
  name: string;
  description: string;
  couponType: CouponType;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
}

const blankForm: FormState = {
  name: '',
  description: '',
  couponType: 'value',
  // Opens at the start of today and closes at the end of the day 90 days out —
  // both ends are instants now, so the defaults have to name a time.
  startDate: startOfTodayInstant(),
  expiryDate: endOfDayInstant(90),
  isActive: true,
};

type Errors = Partial<Record<keyof FormState, string>>;

const COUPON_TYPE_OPTIONS: SelectOption<CouponType>[] = [
  { value: 'value', label: 'Value — a spendable balance' },
  { value: 'product', label: 'Product — one free item' },
];

/**
 * Create and edit share this page because the two forms are the same form —
 * the only differences are which fields lock and what the save button says.
 */
export default function CampaignFormPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const isEdit = Boolean(campaignId);
  const numericId = Number(campaignId);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { current, loading, saving, error } = useAppSelector((s) => s.campaigns);

  const [form, setForm] = useState<FormState>(blankForm);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    dispatch(clearCampaignError());
    if (isEdit) void dispatch(fetchCampaign(numericId));
    else dispatch(clearCurrentCampaign());
    return () => { dispatch(clearCurrentCampaign()); };
  }, [dispatch, isEdit, numericId]);

  // Fill the form once the campaign arrives.
  useEffect(() => {
    if (isEdit && current && current.campaignId === numericId) {
      setForm({
        name: current.name,
        description: current.description,
        couponType: current.couponType,
        startDate: current.startDate,
        expiryDate: current.expiryDate,
        isActive: current.isActive,
      });
    }
  }, [isEdit, current, numericId]);

  /* The API refuses a type change once coupons exist, so the field locks rather
     than letting someone fill in a form that cannot be saved. */
  const typeLocked = isEdit && (current?.couponCount ?? 0) > 0;

  /* Same for the expiry date: it cannot be pulled in ahead of coupons already
     printed. The campaign's own expiry is the floor while any coupon exists. */
  const expiryFloor = useMemo(
    () => (typeLocked && current ? current.expiryDate : undefined),
    [typeLocked, current],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Give the campaign a name.';
    if (!form.startDate) next.startDate = 'Pick a start date and time.';
    if (!form.expiryDate) next.expiryDate = 'Pick an expiry date and time.';
    /* Safe as string comparisons: every instant here is the same fixed-width
       UTC shape, so lexicographic order is chronological order. */
    if (form.startDate && form.expiryDate && form.startDate > form.expiryDate) {
      next.expiryDate = 'The campaign cannot end before it starts.';
    }
    if (expiryFloor && form.expiryDate < expiryFloor) {
      next.expiryDate = `Coupons already run to ${formatDayTime(expiryFloor)}, so it cannot end sooner.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      isActive: form.isActive,
    };

    const result = isEdit
      ? await dispatch(
          updateCampaign({
            campaignId: numericId,
            // Only send the type when it can still change — otherwise the API
            // is being asked to confirm something it has already locked.
            input: { ...payload, couponType: typeLocked ? undefined : form.couponType },
          }),
        )
      : await dispatch(createCampaign({ ...payload, couponType: form.couponType }));

    if (createCampaign.fulfilled.match(result) || updateCampaign.fulfilled.match(result)) {
      navigate(ADMIN_PATHS.campaigns);
    }
  };

  if (isEdit && loading && !current) {
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
        title={isEdit ? 'Edit campaign' : 'New campaign'}
        subtitle={
          isEdit
            ? 'Changes apply to every coupon in this campaign.'
            : 'Set the window and type first — coupons are printed against it afterwards.'
        }
        backTo={ADMIN_PATHS.campaigns}
        actions={
          isEdit && current ? (
            <>
              <CampaignStateBadge state={current.state} />
              <Button
                size="md"
                variant="secondary"
                onClick={() => navigate(ADMIN_PATHS.campaignGenerate(numericId))}
              >
                Generate coupons
              </Button>
            </>
          ) : undefined
        }
      />

      <AlertBanner message={error} onDismiss={() => dispatch(clearCampaignError())} />

      {isEdit && current && (
        <div className="mb-6 grid max-w-[46rem] grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Coupons" value={String(current.couponCount)} />
          <Stat label="Fully redeemed" value={String(current.redeemedCount)} />
          <Stat label="Issued value" value={formatCurrency(current.issuedValue)} />
          <Stat label="Value left" value={formatCurrency(current.remainingValue)} />
        </div>
      )}

      {/* Capped: stretched across the whole page, a 120-character name field
          gets a 1000px input and the eye has to travel the width of the screen
          between a label and its value. */}
      <form
        onSubmit={submit}
        className="flex max-w-[46rem] flex-col gap-5 rounded-xl3 bg-paper p-7 shadow-soft"
      >
        <Field label="Campaign name" required error={errors.name}>
          <TextInput
            value={form.name}
            maxLength={120}
            invalid={Boolean(errors.name)}
            placeholder="Free Big Mac"
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>

        <Field label="Description" hint="Shown in the campaign list to explain the offer.">
          <TextArea
            value={form.description}
            maxLength={500}
            placeholder="One free Big Mac, on us."
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>

        <Field
          label="Coupon type"
          required
          hint={
            typeLocked
              ? `Locked — ${current?.couponCount} coupon(s) have already been issued as “${form.couponType}”.`
              : 'Product coupons give away one menu item. Value coupons carry a spendable balance.'
          }
        >
          <Select<CouponType>
            value={form.couponType}
            disabled={typeLocked}
            onChange={(value) => update('couponType', value)}
            options={COUPON_TYPE_OPTIONS}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Starts"
            required
            error={errors.startDate}
            hint="Your local time. A campaign can open part-way through a day."
          >
            <DateTimeInput
              value={form.startDate}
              max={form.expiryDate || undefined}
              allowClear={false}
              invalid={Boolean(errors.startDate)}
              onChange={(value) => update('startDate', value)}
            />
          </Field>

          <Field
            label="Expires"
            required
            error={errors.expiryDate}
            hint={
              expiryFloor && !errors.expiryDate
                ? `Cannot be earlier than ${formatDayTime(expiryFloor)} — coupons already run to then.`
                : 'The last moment a coupon in this campaign can be redeemed.'
            }
          >
            <DateTimeInput
              value={form.expiryDate}
              min={form.startDate || undefined}
              allowClear={false}
              invalid={Boolean(errors.expiryDate)}
              onChange={(value) => update('expiryDate', value)}
            />
          </Field>
        </div>

        <Toggle
          label="Active"
          hint="Inactive campaigns keep their coupons, but none of them can be redeemed."
          checked={form.isActive}
          onChange={(checked) => update('isActive', checked)}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            size="md"
            variant="secondary"
            onClick={() => navigate(ADMIN_PATHS.campaigns)}
          >
            Cancel
          </Button>
          <Button type="submit" size="md" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create campaign'}
          </Button>
        </div>
      </form>
    </PageBody>
  );
}
