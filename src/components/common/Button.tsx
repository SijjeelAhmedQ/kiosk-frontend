import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-flame text-white hover:bg-flame-dark shadow-card',
  secondary: 'bg-paper text-charcoal border-2 border-mist hover:border-charcoal/30',
  ghost: 'bg-transparent text-charcoal hover:bg-mist/60',
  danger: 'bg-transparent text-flame border-2 border-flame/30 hover:bg-flame-soft',
};

const sizes: Record<Size, string> = {
  md: 'h-14 px-6 text-kiosk-sm rounded-2xl',
  lg: 'h-[68px] px-8 text-kiosk-base rounded-2xl',
  xl: 'h-20 px-10 text-kiosk-lg rounded-xl2',
};

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth,
  leftIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'press inline-flex items-center justify-center gap-3 font-display font-bold',
        'disabled:opacity-40 disabled:pointer-events-none select-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/40',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {leftIcon && <span className="text-[1.4em] leading-none">{leftIcon}</span>}
      {children}
    </button>
  );
}
