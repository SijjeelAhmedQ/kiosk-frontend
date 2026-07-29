import { cn } from '@/utils/cn';

type Size = 'sm' | 'md' | 'lg';

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: Size;
}

const dims: Record<Size, { btn: string; label: string; gap: string; pad: string }> = {
  sm: { btn: 'h-9 w-9 text-kiosk-sm', label: 'min-w-[2ch] text-kiosk-sm', gap: 'gap-1.5', pad: 'p-1' },
  md: { btn: 'h-11 w-11 text-kiosk-base', label: 'min-w-[2ch] text-kiosk-base', gap: 'gap-2', pad: 'p-1.5' },
  lg: { btn: 'h-14 w-14 text-kiosk-lg', label: 'min-w-[2.5ch] text-kiosk-lg', gap: 'gap-3', pad: 'p-1.5' },
};

export function QuantitySelector({ value, onChange, min = 1, max = 99, size = 'lg' }: QuantitySelectorProps) {
  const d = dims[size];
  // White circles floating on a grey track — a stepper, not two bordered boxes.
  const btn =
    'press flex items-center justify-center rounded-full bg-paper font-display font-bold leading-none text-ink shadow-soft ' +
    'transition-colors hover:bg-amber disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none';

  return (
    <div className={cn('flex select-none items-center rounded-full bg-mist', d.gap, d.pad)}>
      <button
        className={cn(btn, d.btn)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
      >
        −
      </button>
      <span className={cn('text-center font-display font-extrabold tabular-nums text-ink', d.label)}>
        {value}
      </span>
      <button
        className={cn(btn, d.btn)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
