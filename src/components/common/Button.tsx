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
  primary: 'bg-amber text-ink shadow-brand hover:bg-amber-hover hover:shadow-brand-lg',
  secondary: 'bg-mist text-charcoal hover:bg-mist/70',
  ghost: 'bg-transparent text-charcoal hover:bg-mist/70',
  danger: 'bg-flame-soft text-flame hover:bg-flame hover:text-white',
};

/** Pills at every size — the single strongest "this is a 2020s app" signal. */
const sizes: Record<Size, string> = {
  md: 'h-14 px-7 text-fk-sm rounded-full',
  lg: 'h-[68px] px-9 text-fk-base rounded-full',
  xl: 'h-[76px] px-10 text-fk-lg rounded-full',
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
        'press inline-flex select-none items-center justify-center gap-3 font-display font-bold tracking-tight',
        'disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/25',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {leftIcon && <span className="text-[1.35em] leading-none">{leftIcon}</span>}
      {children}
    </button>
  );
}
