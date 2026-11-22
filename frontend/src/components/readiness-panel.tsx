import type { Readiness } from '@greenforce/shared';
import { ProgressBar, Ring } from './ui/progress';

const PARTS = [
  { key: 'rulesDecided', label: 'Rules decided', hint: 'applicable rules resolved' },
  { key: 'proofIn', label: 'Proof in', hint: 'required evidence provided' },
  { key: 'checksPassing', label: 'Computed checks passing', hint: 'measurable checks that pass' },
] as const;

/** Readiness score with its three components (brief §8). */
export function ReadinessPanel({ readiness }: { readiness: Readiness }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <Ring value={readiness.overall} size={88} label="Compliance readiness" />
        <div className="sm:hidden">
          <p className="font-semibold">Readiness</p>
          <p className="text-sm text-muted">Average of three components</p>
        </div>
      </div>
      <dl className="grid flex-1 gap-3">
        {PARTS.map(({ key, label, hint }) => {
          const part = readiness[key];
          return (
            <div key={key}>
              <div className="mb-1 flex items-end justify-between gap-2 text-sm">
                <dt>
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </dt>
                <dd className="shrink-0 tabular-nums text-muted">
                  {part.done}/{part.total} · <span className="font-medium text-ink">{part.pct}%</span>
                </dd>
              </div>
              <ProgressBar value={part.pct} label={label} />
            </div>
          );
        })}
      </dl>
    </div>
  );
}
