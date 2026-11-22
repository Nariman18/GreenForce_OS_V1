/** Today's date (UTC) as YYYY-MM-DD — used for EPD and supplier validity. */
export const todayIso = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

/** A PostgreSQL `date` column (read by Prisma as UTC midnight) as YYYY-MM-DD. */
export const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

/** YYYY-MM-DD → Date for writing a `date` column. */
export const toDateColumn = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
