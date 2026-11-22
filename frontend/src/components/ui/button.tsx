import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './feedback';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-pine-700 text-white hover:bg-pine-800 shadow-sm disabled:bg-pine-700/50',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-stone-50 disabled:text-muted',
  ghost: 'text-muted hover:bg-stone-100 hover:text-ink disabled:text-stone-400',
  danger: 'bg-surface text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

const base =
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed whitespace-nowrap';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
