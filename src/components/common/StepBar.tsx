import { cn } from '@/utils/cn';

const STEPS = ['Order', 'Payment', 'Done'] as const;

/**
 * Purely decorative progress rail for the checkout flow — it shows where the
 * customer is, it never navigates. `current` is a 0-based index into STEPS.
 */
export function StepBar({ current, className }: { current: number; className?: string }) {
  return (
    <ol className={cn('flex items-center gap-2', className)} aria-hidden="true">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-9 items-center gap-2 rounded-full px-4 font-display text-fk-xs font-bold transition-colors duration-300',
                done && 'bg-leaf-soft text-leaf',
                active && 'bg-ink text-white',
                !done && !active && 'bg-mist text-ash',
              )}
            >
              {done ? '✓' : i + 1}
              <span>{label}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span className={cn('h-1 w-6 rounded-full transition-colors duration-300', done ? 'bg-leaf' : 'bg-mist')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
