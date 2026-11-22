import { createHash } from 'node:crypto';
import type { Jurisdiction } from '@greenforce/shared';

// Crockford base32: no I, L, O or U, so IDs are easy to read aloud and type.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Deterministic GreenForce ID for a property: the same jurisdiction + parcel always yields the same ID,
 * e.g. GF-DK-7Q2M-K9XD.
 */
export function greenforceId(jurisdiction: Jurisdiction, parcelId: string): string {
  const digest = createHash('sha256').update(`${jurisdiction}:${parcelId.trim().toUpperCase()}`).digest();
  const chars = Array.from(digest.subarray(0, 8), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
  return `GF-${jurisdiction}-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}
