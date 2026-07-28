import { cn } from '@/utils/cn';

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: 'md' | 'lg';
}

export function QuantitySelector({ value, onChange, min = 1, max = 99, size = 'lg' }: QuantitySelectorProps) {
  const dim = size === 'lg' ? 'h-16 w-16 text-kiosk-xl' : 'h-12 w-12 text-kiosk-lg';
  const btn =
    'press flex items-center justify-center rounded-2xl bg-paper border-2 border-mist font-display font-bold text-charcoal disabled:opacity-30 disabled:pointer-events-none';
  return (
    <div className="flex items-center gap-4 select-none">
      <button className={cn(btn, dim)} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">−</button>
      <span className="min-w-[3ch] text-center font-display text-kiosk-xl font-bold tabular-nums">{value}</span>
      <button className={cn(btn, dim)} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">+</button>
    </div>
  );
}
