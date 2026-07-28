interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search the menu' }: SearchBarProps) {
  return (
    <div className="flex h-16 items-center gap-3 rounded-2xl border-2 border-mist bg-paper px-6">
      <span className="text-kiosk-lg text-ash">🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent font-sans text-kiosk-base text-charcoal outline-none placeholder:text-ash"
      />
      {value && (
        <button onClick={() => onChange('')} className="press text-kiosk-lg text-ash" aria-label="Clear">✕</button>
      )}
    </div>
  );
}
