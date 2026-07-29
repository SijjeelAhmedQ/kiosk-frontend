import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '🍽️', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-24 text-center animate-fade-in">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-mist">
        <span className="text-[3.25rem] leading-none opacity-80">{icon}</span>
      </div>
      <h3 className="font-display text-kiosk-xl font-extrabold text-ink">{title}</h3>
      {message && <p className="max-w-md text-kiosk-base leading-relaxed text-ash">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
