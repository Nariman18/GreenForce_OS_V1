type ClassValue = string | false | null | undefined;

/** Joins conditional class names, skipping falsy values. */
export const cn = (...values: ClassValue[]) => values.filter(Boolean).join(' ');
