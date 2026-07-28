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
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-cream">
      <div className="animate-ember-pulse text-kiosk-3xl">🔥</div>
      <p className="font-display text-kiosk-lg text-ash">{label}</p>
    </div>
  );
}
