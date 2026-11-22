import { EVIDENCE_UPLOAD } from '@greenforce/shared';

const startsWith = (data: Buffer, signature: number[]) =>
  signature.every((byte, index) => data[index] === byte);

/** Magic-byte signatures, so a renamed executable cannot pose as a PDF. */
const SIGNATURES: Record<string, (data: Buffer) => boolean> = {
  'application/pdf': (data) => startsWith(data, [0x25, 0x50, 0x44, 0x46]), // %PDF
  'image/png': (data) => startsWith(data, [0x89, 0x50, 0x4e, 0x47]),
  'image/jpeg': (data) => startsWith(data, [0xff, 0xd8, 0xff]),
  // Office Open XML documents are ZIP containers.
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (data) =>
    startsWith(data, [0x50, 0x4b, 0x03, 0x04]),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (data) =>
    startsWith(data, [0x50, 0x4b, 0x03, 0x04]),
  // CSV: must decode as text without NUL bytes.
  'text/csv': (data) => !data.subarray(0, 4096).includes(0),
};

export function isAllowedMimeType(mimeType: string): boolean {
  return (EVIDENCE_UPLOAD.allowedMimeTypes as readonly string[]).includes(mimeType);
}

export function contentMatchesType(mimeType: string, data: Buffer): boolean {
  return SIGNATURES[mimeType]?.(data) ?? false;
}
