import { AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cn(
          'inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent',
          className,
        )}
      />
      {label ? <span className="text-sm text-muted">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-stone-200/70', className)} />;
}

/** Placeholder layout while a page's first query loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-24" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function EmptyState({
  icon: Icon = Info,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-pine-50 text-pine-700">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div role="alert" className="rounded-card border border-rose-200 bg-rose-50 p-5 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="font-medium">Could not load this data</p>
          <p className="mt-1 text-sm">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-sm font-medium underline underline-offset-2"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
};

export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-4 py-3 text-sm', ALERT_TONES[tone], className)}
    >
      {children}
    </div>
  );
}
