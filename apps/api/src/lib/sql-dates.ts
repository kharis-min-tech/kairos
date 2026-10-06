/**
 * Dates that come back out of raw SQL fragments.
 *
 * Drizzle applies its column type mappers only to real column references. A
 * `sql` fragment — `MAX(...)`, `date_trunc(...)`, a correlated subquery —
 * bypasses them entirely and hands back whatever the driver produced, which
 * for postgres.js over Hyperdrive is very often a string rather than a Date.
 *
 * Annotating such a fragment `sql<Date>` therefore does not make it a Date; it
 * only makes TypeScript stop asking. The characteristic failure is
 * `.toISOString is not a function` at runtime, on a line that compiled
 * cleanly. This has bitten the codebase four separate times.
 *
 * Two rules:
 *
 *   1. Annotate the fragment honestly — `sql<Date | string | null>`, never
 *      `sql<Date>`. Better still, cast inside the SQL (`to_char(...)`) so the
 *      type is true by construction and nothing has to be normalised at all.
 *   2. Put the value through `toIsoOrNull` before it leaves the service. Every
 *      DTO in `@kairos/types` types these as `string`, because JSON has no
 *      date type and the wire value always was one.
 */
export function toIsoOrNull(value: Date | string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
