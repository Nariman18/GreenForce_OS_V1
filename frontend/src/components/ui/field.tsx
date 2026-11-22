import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

const control =
  'block w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-500/20 disabled:bg-stone-50 aria-invalid:border-rose-400 aria-invalid:focus:ring-rose-500/20';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-10', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(control, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-20 py-2', className)} {...props} />;
}

/**
 * Accessible label + control + hint/error wrapper. The render prop receives the ids
 * so the control can reference its description and error.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
