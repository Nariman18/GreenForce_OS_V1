import { cn } from '@/lib/cn';

/** GreenForce mark: a shield formed by a leaf, drawn for this MVP. */
export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <path
          d="M16 2.5 27 7v8.6c0 6.7-4.6 11.8-11 13.9C9.6 27.4 5 22.3 5 15.6V7l11-4.5Z"
          className="fill-pine-700"
        />
        <path
          d="M10.5 19.5c0-5.4 4.4-9 11-9.5-.3 6.7-3.9 11-9.3 11h-1.7v-1.5Zm0 0 6.2-5.7"
          className="fill-pine-200 stroke-pine-50"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          GreenForce <span className="font-normal text-muted">OS</span>
        </span>
      )}
    </span>
  );
}
