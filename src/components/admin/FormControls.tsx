import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/**
 * Form controls for the back office.
 *
 * Deliberately smaller than the kiosk's controls: those are sized for a finger
 * on a 32" screen, these are for a keyboard and mouse. Same palette and radius,
 * so the two still read as one product.
 */

const fieldBase =
  'w-full rounded-2xl bg-cream px-4 py-3 font-sans text-sm text-charcoal outline-none ' +
  'transition-all duration-150 placeholder:text-ash ' +
  'focus:bg-paper focus:shadow-card disabled:opacity-50 disabled:cursor-not-allowed';

const invalid = 'ring-2 ring-flame/40';

interface FieldProps {
  label: string;
  /** Shown under the control in grey — explain the rule before it is broken. */
  hint?: ReactNode;
  /** Shown under the control in red, replacing the hint. */
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="font-display text-xs font-bold uppercase tracking-[0.08em] text-ash">
        {label}
        {required && <span className="ml-1 text-flame">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-flame">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ash">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({
  invalid: isInvalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(fieldBase, isInvalid && invalid, className)} {...rest} />;
}

export function TextArea({
  invalid: isInvalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea rows={3} className={cn(fieldBase, 'resize-y', isInvalid && invalid, className)} {...rest} />
  );
}

export function Select({
  invalid: isInvalid,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn(fieldBase, 'cursor-pointer pr-10', isInvalid && invalid, className)} {...rest}>
      {children}
    </select>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** The active/inactive switch. A checkbox underneath, so it is keyboard-reachable. */
export function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-cream px-4 py-3',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="flex flex-col">
        <span className="font-display text-sm font-bold text-charcoal">{label}</span>
        {hint && <span className="mt-0.5 text-xs text-ash">{hint}</span>}
      </span>

      <span className="relative shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={cn(
            'block h-7 w-12 rounded-full transition-colors duration-200',
            'peer-focus-visible:ring-4 peer-focus-visible:ring-ink/20',
            checked ? 'bg-leaf' : 'bg-ash/40',
          )}
        />
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-soft',
            'transition-transform duration-200 ease-smooth',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </label>
  );
}

interface DateRangeFilterProps {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
  fromLabel?: string;
  toLabel?: string;
}

/**
 * A pair of date inputs. Either end can be left empty, which the API reads as
 * "unbounded on that side" — so "everything before March" needs no start date.
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  fromLabel = 'From',
  toLabel = 'To',
}: DateRangeFilterProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={fromLabel}>
        <TextInput
          type="date"
          value={from ?? ''}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value || undefined, to })}
        />
      </Field>
      <Field label={toLabel}>
        <TextInput
          type="date"
          value={to ?? ''}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value || undefined })}
        />
      </Field>
    </div>
  );
}

/** A labelled number for the filter rails and detail headers. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col rounded-2xl bg-cream px-4 py-3 leading-none">
      <span className="text-xs text-ash">{label}</span>
      <span className={cn('mt-2 font-display text-base font-extrabold tabular-nums text-ink', tone)}>
        {value}
      </span>
    </div>
  );
}
