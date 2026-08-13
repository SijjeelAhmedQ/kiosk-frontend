import { cn } from '@/utils/cn';
import { PlusIcon, MinusIcon } from '../common/icons';

type Size = 'sm' | 'md' | 'lg';

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: Size;
}

const dims: Record<Size, { btn: string; icon: string; label: string; gap: string; pad: string }> = {
  sm: { btn: 'h-9 w-9', icon: 'h-4 w-4', label: 'min-w-[2ch] text-fk-sm', gap: 'gap-1.5', pad: 'p-1' },
  md: { btn: 'h-11 w-11', icon: 'h-5 w-5', label: 'min-w-[2ch] text-fk-base', gap: 'gap-2', pad: 'p-1.5' },
  lg: { btn: 'h-14 w-14', icon: 'h-6 w-6', label: 'min-w-[2.5ch] text-fk-lg', gap: 'gap-3', pad: 'p-1.5' },
};

export function QuantitySelector({ value, onChange, min = 1, max = 99, size = 'lg' }: QuantitySelectorProps) {
  const d = dims[size];
  // White circles floating on a grey track — a stepper, not two bordered boxes.
  const btn =
    'press flex items-center justify-center rounded-full bg-paper text-ink shadow-soft ' +
    'transition-colors hover:bg-amber disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none';

  return (
    <div className={cn('flex select-none items-center rounded-full bg-mist', d.gap, d.pad)}>
      <button
        className={cn(btn, d.btn)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
      >
        <MinusIcon className={d.icon} />
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
        <PlusIcon className={d.icon} />
      </button>
    </div>
  );
}
