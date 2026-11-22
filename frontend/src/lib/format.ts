import type { Jurisdiction } from '@greenforce/shared';

const LOCALE = 'en-GB';

export const formatDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatNumber = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined
    ? '—'
    : value.toLocaleString('en-US', { maximumFractionDigits: digits });

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** First 12 hex chars — enough to compare fingerprints at a glance. */
export const shortHash = (hash: string) => `${hash.slice(0, 12)}…`;

export const areaUnit = (_jurisdiction: Jurisdiction) => 'm²';

export const JURISDICTION_SHORT: Record<Jurisdiction, string> = { DK: 'DK', DE: 'DE' };
