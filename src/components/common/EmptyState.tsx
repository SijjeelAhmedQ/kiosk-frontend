import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '🍽️', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="text-kiosk-3xl opacity-70">{icon}</div>
      <h3 className="font-display text-kiosk-xl text-charcoal">{title}</h3>
      {message && <p className="max-w-md text-kiosk-base text-ash">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
