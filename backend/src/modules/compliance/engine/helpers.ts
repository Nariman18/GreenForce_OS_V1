import type { ComputedCheck, CriterionStatus } from '@greenforce/shared';
import type { ApplicabilityResult, EditionDef } from './types.js';

/** Labels of the fields in `labels` that are undefined in `values`. */
export function missingFacts<T extends object>(
  values: T,
  labels: Partial<Record<keyof T, string>>,
): string[] {
  return (Object.keys(labels) as (keyof T)[])
    .filter((key) => values[key] === undefined)
    .map((key) => labels[key]!);
}

export const applies = (reason: string): ApplicabilityResult => ({ status: 'APPLIES', reason });
export const setAside = (reason: string): ApplicabilityResult => ({ status: 'SET_ASIDE', reason });
export const undecided = (missing: string[], reason?: string): ApplicabilityResult => ({
  status: 'UNDECIDED',
  reason: reason ?? `Needs: ${missing.join(', ')}.`,
  missing,
});

/** Maps a yes/no/unknown fact to a criterion status. */
export const criterion = (met: boolean | undefined): CriterionStatus => {
  if (met === undefined) return 'UNKNOWN';
  return met ? 'MET' : 'NOT_MET';
};

/** True when the edition in force started on or after `date`. */
export const editionFrom = (edition: EditionDef | null, date: string): boolean =>
  edition !== null && edition.effectiveFrom >= date;

const formatNumber = (value: number) =>
  Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Numeric limit check: measured value compared to a limit. Missing value → UNDECIDED. */
export function limitCheck(args: {
  label: string;
  measured: number | undefined;
  limit: number;
  unit: string;
  comparator: 'lte' | 'gte';
  missingHint: string;
}): ComputedCheck {
  const { label, measured, limit, unit, comparator } = args;
  if (measured === undefined) {
    return {
      status: 'UNDECIDED',
      label,
      measured: null,
      limit,
      unit,
      comparator,
      explanation: args.missingHint,
    };
  }
  const pass = comparator === 'lte' ? measured <= limit : measured >= limit;
  const symbol = comparator === 'lte' ? '≤' : '≥';
  return {
    status: pass ? 'PASS' : 'FAIL',
    label,
    measured,
    limit,
    unit,
    comparator,
    explanation: `${formatNumber(measured)} ${unit} ${pass ? 'meets' : 'does not meet'} the limit of ${symbol} ${formatNumber(limit)} ${unit}.`,
  };
}

/** Yes/no check (e.g. "no fossil boiler"). Undefined → UNDECIDED. */
export function booleanCheck(args: {
  label: string;
  value: boolean | undefined;
  passText: string;
  failText: string;
  missingHint: string;
}): ComputedCheck {
  const base = { label: args.label, measured: null, limit: null, unit: '', comparator: 'eq' as const };
  if (args.value === undefined) return { ...base, status: 'UNDECIDED', explanation: args.missingHint };
  return {
    ...base,
    status: args.value ? 'PASS' : 'FAIL',
    explanation: args.value ? args.passText : args.failText,
  };
}
