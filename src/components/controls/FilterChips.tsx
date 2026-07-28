import { cn } from '@/utils/cn';

interface Chip { id: string; label: string; }
interface FilterChipsProps {
  chips: Chip[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function FilterChips({ chips, activeId, onSelect }: FilterChipsProps) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {chips.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'press h-14 shrink-0 rounded-full px-7 font-display text-kiosk-sm font-bold transition-colors',
              active ? 'bg-charcoal text-white' : 'bg-paper text-charcoal border-2 border-mist',
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
