import { createContext, useContext, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Input, Select as AntSelect, Switch, type InputProps } from 'antd';
import type { TextAreaProps } from 'antd/es/input';
import { cn } from '@/utils/cn';
import { toInstant } from '@/utils/couponDisplay';
import { disabledTimesAt } from '@/utils/instantBounds';

/**
 * Form controls for the back office.
 *
 * These are antd controls underneath — Select and DatePicker in particular are
 * not worth hand-rolling — but every one of them is themed to Friends Kitchen palette
 * in src/theme/antdTheme.ts, so the fields look exactly as they did: cream fill,
 * no border, white and lifted on focus.
 *
 * They stay deliberately smaller than Friends Kitchen's own controls: those are sized
 * for a finger on a 32" screen, these are for a keyboard and mouse.
 */

/** antd's `filled` variant is the one that matches Friends Kitchen fields. */
const VARIANT = 'filled' as const;

const ISO = 'YYYY-MM-DD';
/** dayjs tokens: 12-hour clock, lowercase am/pm — "5:00 pm". */
const TIME = 'h:mm a';

/**
 * Field can't wrap its child in a <label>: antd's Select and DatePicker put a
 * real <input> inside, and a label click forwards a second click to it, which
 * opens and immediately closes the popup. So the label text is announced
 * through context instead, and each control adopts it as its aria-label.
 */
const FieldLabelContext = createContext<string | undefined>(undefined);

function useFieldLabel(explicit?: string) {
  const inherited = useContext(FieldLabelContext);
  return explicit ?? inherited;
}

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
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Sentence case, not caps — these read as words, not as headings. */}
      <span className="font-display text-xs font-bold tracking-[0.01em] text-ash">
        {label}
        {required && <span className="ml-1 text-flame">*</span>}
      </span>
      <FieldLabelContext.Provider value={label}>{children}</FieldLabelContext.Provider>
      {error ? (
        <span className="text-xs font-medium text-flame">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ash">{hint}</span>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  className,
  ...rest
}: Omit<InputProps, 'variant' | 'status'> & { invalid?: boolean }) {
  const ariaLabel = useFieldLabel(rest['aria-label']);
  return (
    <Input
      {...rest}
      aria-label={ariaLabel}
      variant={VARIANT}
      status={invalid ? 'error' : undefined}
      className={cn('w-full', className)}
    />
  );
}

export function TextArea({
  invalid,
  className,
  ...rest
}: Omit<TextAreaProps, 'variant' | 'status'> & { invalid?: boolean }) {
  const ariaLabel = useFieldLabel(rest['aria-label']);
  return (
    <Input.TextArea
      rows={3}
      {...rest}
      aria-label={ariaLabel}
      variant={VARIANT}
      status={invalid ? 'error' : undefined}
      className={cn('w-full', className)}
    />
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  /**
   * What typing matches against. Defaults to the label, so it is only needed
   * when the label isn't plain text, or when an option should also answer to
   * something it doesn't display — a product to its category name, say.
   */
  searchText?: string;
}

/** A titled run of options. antd draws the title as a heading in the popup. */
export interface SelectGroup<T extends string> {
  label: string;
  options: SelectOption<T>[];
}

type SelectItem<T extends string> = SelectOption<T> | SelectGroup<T>;

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  /** Flat options, groups, or both — a lone option before the groups reads as
      the "any / none" row these filters usually open with. */
  options: SelectItem<T>[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  'aria-label'?: string;
}

function isGroup<T extends string>(item: SelectItem<T>): item is SelectGroup<T> {
  return 'options' in item;
}

/** Case- and accent-insensitive, so "cafe" finds "Café". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

function haystack<T extends string>(option: SelectOption<T>): string {
  if (option.searchText) return option.searchText;
  return typeof option.label === 'string' ? option.label : String(option.value);
}

/**
 * Options come in as a prop rather than as children — antd deprecated the
 * <Option> child form, and a plain array is easier to build from the API lists
 * these filters are populated from anyway.
 *
 * Every select types to filter. Some of these lists are two rows long and some
 * are the whole menu, and an admin should never have to know which before
 * reaching for the keyboard. Matching runs on `searchText`, precomputed here so
 * a ReactNode label can never end up stringified to "[object Object]".
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  invalid,
  className,
  ...rest
}: SelectProps<T>) {
  const ariaLabel = useFieldLabel(rest['aria-label']);

  const searchable = options.map((item) =>
    isGroup(item)
      ? { ...item, options: item.options.map((o) => ({ ...o, searchText: haystack(o) })) }
      : { ...item, searchText: haystack(item) },
  );

  return (
    <AntSelect<T>
      value={value}
      onChange={onChange}
      options={searchable}
      placeholder={placeholder}
      disabled={disabled}
      showSearch={{
        // Groups are never matched themselves; antd only offers leaf options
        // here, and a group survives as long as one of its rows does.
        filterOption: (input, option) =>
          fold(String((option as { searchText?: string } | undefined)?.searchText ?? '')).includes(
            fold(input),
          ),
      }}
      notFoundContent={<span className="text-xs text-ash">Nothing matches that.</span>}
      variant={VARIANT}
      status={invalid ? 'error' : undefined}
      aria-label={ariaLabel}
      className={cn('w-full', className)}
    />
  );
}

interface DateInputProps {
  /** ISO day, `YYYY-MM-DD`. Empty string means no date. */
  value?: string;
  onChange: (value: string) => void;
  /** Inclusive bounds — days outside them can't be picked. */
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Off for required fields, where clearing only creates an error to fix. */
  allowClear?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * A single day, as an ISO string in and out — the shape the API and the redux
 * slices already use, so nothing outside this file has to know about dayjs.
 *
 * Shown as YYYY-MM-DD rather than the browser's locale format, because the
 * hints beside these fields quote ISO dates back at you.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  disabled,
  invalid,
  allowClear = true,
  className,
  ...rest
}: DateInputProps) {
  const ariaLabel = useFieldLabel(rest['aria-label']);
  return (
    <DatePicker
      value={value ? dayjs(value) : null}
      onChange={(day) => onChange(day ? day.format(ISO) : '')}
      disabledDate={
        min || max
          ? (day) =>
              Boolean(min && day.isBefore(dayjs(min), 'day')) ||
              Boolean(max && day.isAfter(dayjs(max), 'day'))
          : undefined
      }
      format={ISO}
      placeholder={ISO.toLowerCase()}
      disabled={disabled}
      allowClear={allowClear}
      variant={VARIANT}
      status={invalid ? 'error' : undefined}
      aria-label={ariaLabel}
      className={cn('w-full', className)}
    />
  );
}

interface DateTimeInputProps extends Omit<DateInputProps, 'value' | 'onChange'> {
  /** A UTC instant, `YYYY-MM-DDTHH:mm:ssZ`. Empty string means none. */
  value?: string;
  onChange: (value: string) => void;
}

/**
 * A day *and* a time of day — campaign and coupon windows are instants, so a
 * coupon can be good from 05:00 to 17:00 on one date.
 *
 * The admin picks in their own timezone and the value leaves as UTC, which is
 * what the column stores. Seconds are zeroed and the string is cut to the
 * API's exact shape so these values stay directly comparable — see toInstant.
 *
 * `min` and `max` are instants, and they bound the clock as well as the
 * calendar: on the boundary day the hours and minutes past the bound are
 * disabled too. Nothing outside the window can be picked, so nothing has to be
 * taken back afterwards.
 */
export function DateTimeInput({
  value,
  onChange,
  min,
  max,
  disabled,
  invalid,
  allowClear = true,
  className,
  ...rest
}: DateTimeInputProps) {
  const ariaLabel = useFieldLabel(rest['aria-label']);
  return (
    <DatePicker
      // 12-hour, with an am/pm column in the panel — the same way the times
      // are written everywhere else on these screens.
      showTime={{ format: TIME, use12Hours: true }}
      format={`${ISO} ${TIME}`}
      value={value ? dayjs(value) : null}
      onChange={(day) => onChange(day ? toInstant(day.second(0).millisecond(0).toDate()) : '')}
      disabledDate={
        min || max
          ? (day) =>
              Boolean(min && day.isBefore(dayjs(min), 'day')) ||
              Boolean(max && day.isAfter(dayjs(max), 'day'))
          : undefined
      }
      // The other half of the same bound: the boundary day is only half open.
      disabledTime={min || max ? (day) => disabledTimesAt(day, min, max) : undefined}
      placeholder={`${ISO.toLowerCase()} h:mm am`}
      disabled={disabled}
      allowClear={allowClear}
      variant={VARIANT}
      status={invalid ? 'error' : undefined}
      aria-label={ariaLabel}
      className={cn('w-full', className)}
    />
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** The active/inactive switch. Wrapped in a label, so the whole row is a target. */
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

      <Switch checked={checked} disabled={disabled} onChange={onChange} aria-label={label} />
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
 * A pair of date pickers. Either end can be left empty, which the API reads as
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
        <DateInput
          value={from}
          max={to}
          onChange={(value) => onChange({ from: value || undefined, to })}
        />
      </Field>
      <Field label={toLabel}>
        <DateInput
          value={to}
          min={from}
          onChange={(value) => onChange({ from, to: value || undefined })}
        />
      </Field>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  /** A text colour class for the figure — a redeemed total goes green. */
  tone?: string;
  /** One glyph, in a tile. Gives the figure something to be recognised by. */
  icon?: ReactNode;
  /** A quieter line under the figure — what it is counting, or of what. */
  hint?: ReactNode;
}

/**
 * A labelled number for the page headers.
 *
 * On paper, not cream: every one of these sits directly on the back office's
 * cream background, where a cream tile is no tile at all — the figures read as
 * loose text with nothing holding them.
 *
 * The glyph is what makes a row of four scannable. Four bare numbers under four
 * short labels all look alike at a glance, and these are read at a glance.
 */
export function Stat({ label, value, tone, icon, hint }: StatProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-paper px-4 py-3.5 shadow-soft ring-1 ring-ink/[0.04] transition-shadow duration-200 ease-smooth hover:shadow-card">
      {icon && (
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-xl leading-none"
        >
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-xs text-ash">{label}</span>
        <span
          className={cn(
            'mt-2 truncate font-display text-lg font-extrabold tabular-nums text-ink',
            tone,
          )}
        >
          {value}
        </span>
        {hint && <span className="mt-1.5 truncate text-[0.7rem] leading-none text-ash">{hint}</span>}
      </div>
    </div>
  );
}
