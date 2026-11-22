import { cn } from '@/lib/cn';

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 overflow-hidden rounded-full bg-stone-200', className)}
    >
      <div
        className="h-full rounded-full bg-pine-600 transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Circular readiness gauge (SVG), coloured by band. */
export function Ring({ value, size = 64, label }: { value: number; size?: number; label: string }) {
  const stroke = size >= 80 ? 8 : 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const colour = clamped >= 80 ? 'text-pine-600' : clamped >= 50 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${clamped}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-stone-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className={cn('stroke-current transition-[stroke-dashoffset] duration-700', colour)}
        />
      </svg>
      <span className={cn('absolute font-semibold tabular-nums', size >= 80 ? 'text-xl' : 'text-sm')}>
        {clamped}%
      </span>
    </div>
  );
}
