import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'progress' | 'outline';

export const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-200',
  brand: 'bg-pine-50 text-pine-800 ring-pine-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-rose-50 text-rose-800 ring-rose-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  progress: 'bg-violet-50 text-violet-800 ring-violet-200',
  outline: 'bg-transparent text-muted ring-line',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
