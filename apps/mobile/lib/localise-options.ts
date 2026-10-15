/**
 * Swap the English label on a `{ value | key, label }` option for its
 * catalogue entry, keyed by the option's own value.
 *
 * Option lists are declared at module scope, where there is no `t` to call,
 * so the English stays in the constant and the translation happens at the
 * render site. The value is untouched: it is what the API stores and compares.
 *
 * An option with no catalogue entry keeps its English label rather than
 * rendering a key path, so a new option still reads before it is translated.
 *
 * Mirrors `apps/web/src/lib/localise-options.ts`.
 */
type Translate = (key: string, opts?: Record<string, unknown>) => string;

export function localiseOptions<T extends { label: string }>(
  t: Translate,
  prefix: string,
  options: readonly T[],
  valueOf: (o: T) => string | number = (o) => (o as { value?: string | number }).value ?? '',
): T[] {
  return options.map((o) => ({
    ...o,
    label: t(`${prefix}${valueOf(o)}`, { defaultValue: o.label }),
  }));
}

/** The same lookup for a record keyed by status, e.g. `{ applied: { label } }`. */
export function localiseMeta<T extends { label: string }>(
  t: Translate,
  prefix: string,
  meta: Record<string, T>,
  key: string,
): T {
  const entry = meta[key];
  if (!entry) return entry;
  return { ...entry, label: t(`${prefix}${key}`, { defaultValue: entry.label }) };
}
