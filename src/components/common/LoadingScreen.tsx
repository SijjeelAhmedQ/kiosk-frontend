export function Spinner({ size = 48 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-flame border-t-transparent"
      style={{ width: size, height: size, borderWidth: Math.max(3, size / 12) }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingScreen({ label = 'Warming up…' }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col gap-8 p-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Spinner size={30} />
        <p className="font-display text-kiosk-lg font-extrabold text-ink">{label}</p>
      </div>

      {/* Skeletons shaped like the menu grid — the wait previews the layout. */}
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl3 bg-paper shadow-soft">
            <div className="skeleton h-52 w-full" />
            <div className="flex flex-col gap-3 p-6">
              <div className="skeleton h-5 w-3/4 rounded-full" />
              <div className="skeleton h-4 w-full rounded-full" />
              <div className="skeleton mt-3 h-7 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
