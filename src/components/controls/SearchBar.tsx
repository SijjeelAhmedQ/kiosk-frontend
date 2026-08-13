interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search the menu' }: SearchBarProps) {
  return (
    // Filled, borderless, fully rounded — the modern search field.
    <div className="group flex h-16 items-center gap-3 rounded-full bg-mist px-6 transition-all duration-200 focus-within:bg-paper focus-within:shadow-card">
      <SearchIcon className="h-6 w-6 shrink-0 text-ash transition-colors group-focus-within:text-ink" />
      <input
        data-testid="menu-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent font-sans text-fk-base font-medium text-charcoal outline-none placeholder:font-normal placeholder:text-ash"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ash/20 text-fk-xs text-charcoal hover:bg-ash/30"
          aria-label="Clear"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
